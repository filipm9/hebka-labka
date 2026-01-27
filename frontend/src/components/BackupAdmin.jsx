import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

export function BackupAdmin({ onClose, onToast }) {
  const [downloading, setDownloading] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['backup-status'],
    queryFn: api.backupStatus,
  });

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      let result;
      switch (format) {
        case 'sql':
          result = await api.downloadBackupSql();
          break;
        case 'json':
          result = await api.downloadBackupJson();
          break;
        default:
          throw new Error('Unknown format');
      }
      onToast?.(`Stiahnuté: ${result.filename} (${formatFileSize(result.size)})`);
    } catch (error) {
      onToast?.(error.message || 'Chyba pri sťahovaní zálohy', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const result = await api.sendBackupEmail();
      onToast?.(`Záloha odoslaná na ${result.email}`);
    } catch (error) {
      onToast?.(error.message || 'Chyba pri odosielaní zálohy', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const stats = statusQuery.data?.stats || {};
  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-beige-800">Záloha databázy</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-beige-600 hover:text-beige-700 text-sm px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
          >
            Zavrieť
          </button>
        )}
      </div>

      {/* Database Stats */}
      <div className="bg-gradient-to-br from-sand-50 to-beige-50 rounded-2xl p-5 border border-sand-200">
        <div className="flex items-center gap-2 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-peach-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <h3 className="text-sm font-semibold text-sand-700 uppercase tracking-wider">
            Stav databázy
          </h3>
        </div>

        {statusQuery.isLoading ? (
          <p className="text-beige-500 text-sm">Načítavam...</p>
        ) : statusQuery.error ? (
          <p className="text-blush-500 text-sm">Chyba pri načítaní stavu</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/60 rounded-xl p-3 border border-sand-100">
              <p className="text-2xl font-light text-peach-600">{stats.dogs || 0}</p>
              <p className="text-xs text-sand-500">Psy</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-sand-100">
              <p className="text-2xl font-light text-peach-600">{stats.owners || 0}</p>
              <p className="text-xs text-sand-500">Majitelia</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-sand-100">
              <p className="text-2xl font-light text-peach-600">{stats.users || 0}</p>
              <p className="text-xs text-sand-500">Používatelia</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-sand-100">
              <p className="text-2xl font-light text-peach-600">{stats.dog_owners || 0}</p>
              <p className="text-xs text-sand-500">Prepojenia</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-sand-100">
              <p className="text-2xl font-light text-peach-600">{stats.app_config || 0}</p>
              <p className="text-xs text-sand-500">Konfigurácie</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 border border-sand-100">
              <p className="text-2xl font-light text-peach-600">{totalRecords}</p>
              <p className="text-xs text-sand-500">Celkom záznamov</p>
            </div>
          </div>
        )}
      </div>

      {/* Download Options */}
      <div className="space-y-4 pt-4 border-t border-beige-200">
        <h3 className="text-lg font-medium text-beige-800">Stiahnuť zálohu</h3>
        <p className="text-sm text-beige-600">
          Vyberte formát zálohy. SQL je vhodný pre obnovu databázy, JSON pre programové spracovanie.
        </p>

        <div className="grid gap-3">
          {/* SQL Backup */}
          <button
            onClick={() => handleDownload('sql')}
            disabled={downloading !== null}
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-beige-200 hover:border-blush-300 hover:bg-blush-50/30 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blush-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blush-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-beige-800">
                {downloading === 'sql' ? 'Sťahujem...' : 'SQL záloha'}
              </p>
              <p className="text-sm text-beige-500">
                Čitateľný SQL súbor s INSERT príkazmi. Ideálne pre manuálnu kontrolu a úpravy.
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="px-3 py-1 rounded-full bg-blush-100 text-blush-600 text-xs font-medium">
                .sql
              </span>
            </div>
          </button>

          {/* JSON Backup */}
          <button
            onClick={() => handleDownload('json')}
            disabled={downloading !== null}
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-beige-200 hover:border-peach-300 hover:bg-peach-50/30 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-peach-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-peach-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-beige-800">
                {downloading === 'json' ? 'Sťahujem...' : 'JSON záloha'}
              </p>
              <p className="text-sm text-beige-500">
                Štruktúrovaný JSON súbor. Ideálne pre programové spracovanie a migrácie.
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="px-3 py-1 rounded-full bg-peach-100 text-peach-600 text-xs font-medium">
                .json
              </span>
            </div>
          </button>

        </div>
      </div>

      {/* Send via Email */}
      <div className="space-y-4 pt-4 border-t border-beige-200">
        <h3 className="text-lg font-medium text-beige-800">Odoslať emailom</h3>
        <p className="text-sm text-beige-600">
          Odošle zálohu (SQL + JSON) na email filip.muller22@gmail.com
        </p>

        <button
          onClick={handleSendEmail}
          disabled={sendingEmail}
          className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-beige-200 hover:border-sand-400 hover:bg-sand-50/30 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed w-full"
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-sand-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium text-beige-800">
              {sendingEmail ? 'Odosielam...' : 'Odoslať zálohu na email'}
            </p>
            <p className="text-sm text-beige-500">
              Pošle SQL aj JSON zálohu ako prílohy emailu.
            </p>
          </div>
          {sendingEmail && (
            <div className="flex-shrink-0">
              <svg className="animate-spin h-5 w-5 text-sand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className="bg-blush-50/50 rounded-2xl p-4 border border-blush-100">
        <div className="flex gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blush-400 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div className="text-sm text-blush-700 space-y-1">
            <p className="font-medium">Odporúčanie pre zálohovanie</p>
            <p className="text-blush-600">
              Pre obnovu databázy používajte SQL formát. JSON je vhodný ak potrebujete dáta
              spracovať programovo alebo importovať do iného systému.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
