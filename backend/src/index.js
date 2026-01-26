import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { migrateCheck, runMigrations } from './db.js';
import { authRouter } from './routes/auth.js';
import { ownersRouter } from './routes/owners.js';
import { dogsRouter } from './routes/dogs.js';
import { usersRouter } from './routes/users.js';
import { configRouter } from './routes/config.js';
import { backupRouter } from './routes/backup.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 200,
  }),
);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/owners', ownersRouter);
app.use('/dogs', dogsRouter);
app.use('/users', usersRouter);
app.use('/config', configRouter);
app.use('/backup', backupRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

async function start() {
  await migrateCheck();
  await runMigrations();
  console.log('Database migrations complete');
  app.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

