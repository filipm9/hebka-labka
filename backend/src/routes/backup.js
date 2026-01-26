import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../auth.js';

export const backupRouter = express.Router();

backupRouter.use(authRequired);

/**
 * Get primary key columns for a table
 */
async function getPrimaryKeyColumns(tableName) {
  const { rows } = await query(
    `SELECT a.attname as column_name
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    [tableName]
  );
  return rows.map((r) => r.column_name);
}

/**
 * Generate SQL INSERT statements for a table
 */
async function generateTableInserts(tableName, columns, columnTypes) {
  // Get primary key columns for ordering
  const pkColumns = await getPrimaryKeyColumns(tableName);
  const orderBy = pkColumns.length > 0 ? pkColumns.join(', ') : columns[0];
  
  const { rows } = await query(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`);
  if (rows.length === 0) return '';

  const inserts = rows.map((row) => {
    const values = columns.map((col) => {
      const val = row[col];
      const colType = columnTypes[col] || '';
      
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (val instanceof Date) return `'${val.toISOString()}'`;
      
      // Use column type from schema to determine format
      if (colType === 'jsonb' || colType === 'json') {
        // JSONB/JSON column - always use JSON.stringify
        return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
      }
      
      if (Array.isArray(val)) {
        // PostgreSQL array (text[], int[], etc.) - types start with underscore like '_text'
        if (val.length === 0) {
          return `'{}'`; // Empty PostgreSQL array
        }
        const arrayContent = val.map((v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',');
        return `'{${arrayContent}}'`;
      }
      
      if (typeof val === 'object') {
        // Object that's not an array - likely JSONB
        return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
      }
      
      // String - escape single quotes
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  });

  return inserts.join('\n');
}

/**
 * Get table columns with their data types
 */
async function getTableColumns(tableName) {
  const { rows } = await query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = $1 AND table_schema = 'public'
     ORDER BY ordinal_position`,
    [tableName]
  );
  return rows.map((r) => r.column_name);
}

/**
 * Get column types for a table (to distinguish between text[] and jsonb)
 */
async function getColumnTypes(tableName) {
  const { rows } = await query(
    `SELECT column_name, data_type, udt_name 
     FROM information_schema.columns 
     WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName]
  );
  const types = {};
  for (const row of rows) {
    // udt_name gives us more specific types like 'jsonb', '_text' (text array), etc.
    types[row.column_name] = row.udt_name;
  }
  return types;
}

/**
 * Generate a complete SQL backup (readable format)
 * GET /backup/sql
 */
backupRouter.get('/sql', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const tables = ['users', 'owners', 'dogs', 'dog_owners', 'app_config'];

    let sql = `-- Database Backup: doggroomer
-- Generated: ${new Date().toISOString()}
-- This file contains INSERT statements for all data
-- To restore: run this SQL after creating the schema

`;

    // Add table truncation (optional, commented out)
    sql += '-- Uncomment the following lines to clear existing data before restore:\n';
    for (const table of [...tables].reverse()) {
      sql += `-- TRUNCATE TABLE ${table} CASCADE;\n`;
    }
    sql += '\n';

    // Disable foreign key checks temporarily
    sql += '-- Disable triggers for clean insert\n';
    sql += 'SET session_replication_role = replica;\n\n';

    // Generate inserts for each table
    for (const table of tables) {
      const columns = await getTableColumns(table);
      const columnTypes = await getColumnTypes(table);
      if (columns.length === 0) continue;

      sql += `-- Table: ${table}\n`;
      sql += `-- Columns: ${columns.join(', ')}\n`;

      const inserts = await generateTableInserts(table, columns, columnTypes);
      if (inserts) {
        sql += inserts + '\n';
      } else {
        sql += `-- (no data)\n`;
      }
      sql += '\n';
    }

    // Reset sequences (only for tables with serial/identity columns)
    sql += '-- Reset sequences to max id values\n';
    for (const table of tables) {
      const columns = await getTableColumns(table);
      if (!columns.includes('id')) continue; // Skip tables without id column
      sql += `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true);\n`;
    }
    sql += '\n';

    // Re-enable foreign key checks
    sql += '-- Re-enable triggers\n';
    sql += 'SET session_replication_role = DEFAULT;\n';

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${timestamp}.sql"`);
    res.send(sql);
  } catch (error) {
    console.error('SQL backup error:', error);
    res.status(500).json({ error: 'Failed to generate SQL backup' });
  }
});

/**
 * Generate a JSON backup (for easier parsing/import)
 * GET /backup/json
 */
backupRouter.get('/json', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const tables = ['users', 'owners', 'dogs', 'dog_owners', 'app_config'];

    const backup = {
      metadata: {
        database: 'doggroomer',
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
      tables: {},
    };

    for (const table of tables) {
      // Get primary key columns for ordering
      const pkColumns = await getPrimaryKeyColumns(table);
      const columns = await getTableColumns(table);
      const orderBy = pkColumns.length > 0 ? pkColumns.join(', ') : columns[0];
      
      const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      // For users table, exclude password_hash for security
      if (table === 'users') {
        backup.tables[table] = rows.map(({ password_hash, ...rest }) => rest);
      } else {
        backup.tables[table] = rows;
      }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${timestamp}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('JSON backup error:', error);
    res.status(500).json({ error: 'Failed to generate JSON backup' });
  }
});

/**
 * Get database stats
 * GET /backup/status
 */
backupRouter.get('/status', async (req, res) => {
  const tables = ['users', 'owners', 'dogs', 'dog_owners', 'app_config'];
  const stats = {};

  for (const table of tables) {
    try {
      const { rows } = await query(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = parseInt(rows[0].count, 10);
    } catch {
      stats[table] = 0;
    }
  }

  res.json({
    stats,
    availableFormats: ['sql', 'json'],
  });
});
