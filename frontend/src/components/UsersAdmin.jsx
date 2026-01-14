import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

export function UsersAdmin({ onClose, currentUserId }) {
  const queryClient = useQueryClient();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: api.users,
  });

  const createUser = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUserEmail('');
      setNewUserPassword('');
      setAlertMessage('Používateľ bol úspešne vytvorený.');
    },
    onError: (error) => {
      setAlertMessage('Chyba pri vytváraní používateľa: ' + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setAlertMessage('Používateľ bol úspešne vymazaný.');
    },
    onError: (error) => {
      setAlertMessage('Chyba pri vymazávaní používateľa: ' + error.message);
    },
  });

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      setAlertMessage('Email a heslo sú povinné.');
      return;
    }
    createUser.mutate({ email: newUserEmail, password: newUserPassword });
  };

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      message: `Naozaj chcete vymazať používateľa "${user.email}"?`,
      onConfirm: () => {
        deleteUser.mutate(user.id);
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-beige-800">Správa používateľov</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-beige-600 hover:text-beige-700 text-sm px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
          >
            Zavrieť
          </button>
        )}
      </div>

      {alertMessage && (
        <div className="bg-blush-50 border border-blush-200 rounded-2xl p-4 text-sm text-blush-700 flex items-center justify-between">
          <span>{alertMessage}</span>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-blush-500 hover:text-blush-700 ml-4 p-1 rounded-full hover:bg-blush-100 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-4 pt-4 border-t border-beige-200">
          <h3 className="text-lg font-medium text-beige-800">Vytvoriť nového používateľa</h3>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-beige-700">Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-beige-700">Heslo</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Heslo"
                className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="w-full bg-blush-400 text-white font-medium rounded-2xl py-3 hover:bg-blush-500 shadow-sm hover:shadow-md disabled:opacity-60 transition-all"
            >
              {createUser.isPending ? 'Vytváram...' : 'Vytvoriť používateľa'}
            </button>
          </form>
        </div>

        <div className="space-y-4 pt-4 border-t border-beige-200">
          <h3 className="text-lg font-medium text-beige-800">Existujúci používatelia</h3>
          {usersQuery.isLoading && (
            <p className="text-beige-500 text-center py-8">Načítavam používateľov…</p>
          )}
          {usersQuery.data?.length === 0 && (
            <p className="text-beige-500 text-sm text-center py-8">
              Zatiaľ žiadni používatelia.
            </p>
          )}
          <div className="space-y-3">
            {usersQuery.data?.map((user) => (
              <div
                key={user.id}
                className="bg-beige-50/50 rounded-2xl p-4 border border-beige-200"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5 flex-1">
                    <p className="text-lg font-medium text-beige-800">{user.email}</p>
                    <p className="text-xs text-beige-500">
                      Vytvorený: {formatDate(user.created_at)}
                    </p>
                    {user.id === currentUserId && (
                      <p className="text-xs text-blush-500 font-medium">(Aktuálny používateľ)</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-sm text-blush-400 hover:text-blush-500 px-3 py-2 rounded-full hover:bg-blush-50 transition-colors"
                      >
                        Vymazať
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
