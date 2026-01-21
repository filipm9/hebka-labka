import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api/client.js';
import { LoginForm } from './components/LoginForm.jsx';
import { DogCard } from './components/DogCard.jsx';
import { DogForm } from './components/DogForm.jsx';
import { OwnerForm } from './components/OwnerForm.jsx';
import { TagsAdmin } from './components/TagsAdmin.jsx';
import { UsersAdmin } from './components/UsersAdmin.jsx';
import { ConfirmDialog } from './components/ConfirmDialog.jsx';
import { toTags, sanitizeHtml } from './utils/helpers.js';

function useAuth() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
  });

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  return { meQuery, login, logout };
}

export default function App() {
  const { meQuery, login, logout } = useAuth();
  const isAuthed = meQuery.data && !meQuery.error;
  const [tab, setTab] = useState('dogs');
  const [dogSearch, setDogSearch] = useState('');
  const [dogTagFilter, setDogTagFilter] = useState([]);
  const [dogCharacterTagFilter, setDogCharacterTagFilter] = useState([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [editingDog, setEditingDog] = useState(null);
  const [selectedDog, setSelectedDog] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [editingOwner, setEditingOwner] = useState(null);
  const [showTagsAdmin, setShowTagsAdmin] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showAdvancedOwnerSearch, setShowAdvancedOwnerSearch] = useState(false);
  const [ownerBreedFilter, setOwnerBreedFilter] = useState('');
  const [ownerContactTagFilter, setOwnerContactTagFilter] = useState([]);
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' }

  // Helper to show toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch config from database
  const configQuery = useQuery({
    queryKey: ['config'],
    queryFn: api.getConfig,
    enabled: isAuthed && !meQuery.isLoading,
  });

  const availableTags = configQuery.data?.health_tags || [];
  const availableCharacterTags = configQuery.data?.character_tags || [];
  const availableBreeds = configQuery.data?.breeds || [];
  const availableCommunicationMethods = configQuery.data?.communication_methods || [];

  const queryClient = useQueryClient();

  // Refresh config when TagsAdmin updates it
  useEffect(() => {
    const handleConfigUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    };
    window.addEventListener('tagsUpdated', handleConfigUpdated);
    window.addEventListener('characterTagsUpdated', handleConfigUpdated);
    window.addEventListener('breedsUpdated', handleConfigUpdated);
    window.addEventListener('communicationMethodsUpdated', handleConfigUpdated);
    window.addEventListener('cosmeticsUpdated', handleConfigUpdated);
    return () => {
      window.removeEventListener('tagsUpdated', handleConfigUpdated);
      window.removeEventListener('characterTagsUpdated', handleConfigUpdated);
      window.removeEventListener('breedsUpdated', handleConfigUpdated);
      window.removeEventListener('communicationMethodsUpdated', handleConfigUpdated);
      window.removeEventListener('cosmeticsUpdated', handleConfigUpdated);
    };
  }, [queryClient]);

  // Ensure queries fetch when authentication completes
  useEffect(() => {
    if (isAuthed && !meQuery.isLoading) {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
    }
  }, [isAuthed, meQuery.isLoading, queryClient]);

  const dogsQuery = useQuery({
    queryKey: ['dogs', dogSearch, dogTagFilter, dogCharacterTagFilter],
    queryFn: () => api.dogs({ search: dogSearch, tags: dogTagFilter, characterTags: dogCharacterTagFilter }),
    enabled: isAuthed && !meQuery.isLoading,
  });

  const ownersQuery = useQuery({
    queryKey: ['owners', ownerSearch, ownerBreedFilter, ownerContactTagFilter],
    queryFn: () => api.owners({ search: ownerSearch, breed: ownerBreedFilter, contactTags: ownerContactTagFilter }),
    enabled: isAuthed && !meQuery.isLoading,
  });

  // Keep selectedDog in sync with latest query data
  useEffect(() => {
    if (selectedDog && dogsQuery.data) {
      const freshDog = dogsQuery.data.find(d => d.id === selectedDog.id);
      if (freshDog && JSON.stringify(freshDog) !== JSON.stringify(selectedDog)) {
        setSelectedDog(freshDog);
      }
    }
  }, [dogsQuery.data, selectedDog]);

  // Keep selectedOwner in sync with latest query data
  useEffect(() => {
    if (selectedOwner && ownersQuery.data) {
      const freshOwner = ownersQuery.data.find(o => o.id === selectedOwner.id);
      if (freshOwner && JSON.stringify(freshOwner) !== JSON.stringify(selectedOwner)) {
        setSelectedOwner(freshOwner);
      }
    }
  }, [ownersQuery.data, selectedOwner]);

  // Keep editingDog in sync with latest query data
  useEffect(() => {
    if (editingDog?.id && dogsQuery.data) {
      const freshDog = dogsQuery.data.find(d => d.id === editingDog.id);
      if (freshDog && JSON.stringify(freshDog) !== JSON.stringify(editingDog)) {
        setEditingDog(freshDog);
      }
    }
  }, [dogsQuery.data, editingDog]);

  // Keep editingOwner in sync with latest query data
  useEffect(() => {
    if (editingOwner?.id && ownersQuery.data) {
      const freshOwner = ownersQuery.data.find(o => o.id === editingOwner.id);
      if (freshOwner && JSON.stringify(freshOwner) !== JSON.stringify(editingOwner)) {
        setEditingOwner(freshOwner);
      }
    }
  }, [ownersQuery.data, editingOwner]);

  const createOwner = useMutation({
    mutationFn: api.createOwner,
    onSuccess: (createdOwner) => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      // Keep editing the newly created owner (now with ID for updates)
      setEditingOwner(createdOwner);
      showToast('Majiteľ bol úspešne pridaný');
    },
    onError: (error) => {
      showToast(error.message || 'Chyba pri vytváraní majiteľa', 'error');
    },
  });

  const updateOwner = useMutation({
    mutationFn: ({ id, body }) => api.updateOwner(id, body),
    onSuccess: (updatedOwner) => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      // Keep editing, just show toast
      setEditingOwner(updatedOwner);
      showToast('Zmeny boli uložené');
    },
    onError: (error) => {
      showToast(error.message || 'Chyba pri aktualizácii majiteľa', 'error');
    },
  });

  const deleteOwner = useMutation({
    mutationFn: api.deleteOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      showToast('Majiteľ bol vymazaný');
    },
    onError: (error) => {
      showToast(error.message || 'Chyba pri mazaní majiteľa', 'error');
    },
  });

  const createDog = useMutation({
    mutationFn: async ({ dog, newOwner }) => {
      let ownerIds = dog.owner_ids || [];
      // If a new owner name is provided, create the owner first and add to list
      if (newOwner && newOwner.name) {
        const created = await createOwner.mutateAsync(newOwner);
        ownerIds = [...ownerIds, created.id];
      }
      return api.createDog({ ...dog, owner_ids: ownerIds });
    },
    onSuccess: (createdDog) => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      // Keep editing the newly created dog (now with ID for updates)
      setEditingDog(createdDog);
      showToast('Pes bol úspešne uložený');
    },
    onError: (error) => {
      showToast(error.message || 'Chyba pri vytváraní psa', 'error');
    },
  });

  const updateDog = useMutation({
    mutationFn: ({ id, body }) => api.updateDog(id, body),
    onSuccess: (updatedDog) => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      // Keep editing, just show toast
      setEditingDog(updatedDog);
      showToast('Zmeny boli uložené');
    },
    onError: (error) => {
      showToast(error.message || 'Chyba pri aktualizácii psa', 'error');
    },
  });

  const deleteDog = useMutation({
    mutationFn: api.deleteDog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      showToast('Pes bol vymazaný');
    },
    onError: (error) => {
      showToast(error.message || 'Chyba pri mazaní psa', 'error');
    },
  });

  const changePassword = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setChangePasswordError(null);
      showToast('Heslo bolo úspešne zmenené');
    },
    onError: (error) => {
      setChangePasswordError(error.message);
      showToast(error.message || 'Chyba pri zmene hesla', 'error');
    },
  });

  const owners = useMemo(() => ownersQuery.data || [], [ownersQuery.data]);

  if (!isAuthed) {
    return (
      <LoginForm
        onSubmit={(body) => login.mutate(body)}
        loading={login.isPending}
        error={login.error?.message}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pb-32 space-y-6">
      <header className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.3em] uppercase text-blush-400 font-medium">
            Hebká labka
          </p>
          <h1 className="text-3xl font-light text-beige-800">Správa psíkov a klientov</h1>
        </div>
        {/* Secondary Navigation - Tagy, Admins, and User Actions */}
        <div className="flex gap-2 items-center">
          <button
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === 'tags'
                ? 'bg-blush-100 text-blush-600 shadow-sm'
                : 'text-beige-500 hover:text-blush-500 hover:bg-blush-50/50'
            }`}
            onClick={() => setTab('tags')}
          >
            Konfigurácia hodnôt
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === 'admins'
                ? 'bg-blush-100 text-blush-600 shadow-sm'
                : 'text-beige-500 hover:text-blush-500 hover:bg-blush-50/50'
            }`}
            onClick={() => setTab('admins')}
          >
            Admins
          </button>
          <div className="w-px h-6 bg-beige-300 mx-1"></div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="text-xs text-beige-500 hover:text-blush-500 px-4 py-2 rounded-xl hover:bg-blush-50/50 transition-colors font-medium"
          >
            Zmeniť heslo
          </button>
          <button
            onClick={() => logout.mutate()}
            className="text-xs text-beige-500 hover:text-blush-500 px-4 py-2 rounded-xl hover:bg-blush-50/50 transition-colors font-medium"
          >
            Odhlásiť
          </button>
        </div>
      </header>

      {/* Primary Navigation - Psy and Majitelia */}
      <div className="flex gap-3 bg-white/60 backdrop-blur-sm rounded-3xl p-2 shadow-sm border border-beige-200/50">
        <button
          className={`flex-1 py-4 rounded-2xl text-base font-semibold transition-all ${
            tab === 'dogs'
              ? 'bg-blush-200 text-blush-700 shadow-sm'
              : 'text-beige-600 hover:text-blush-500 hover:bg-blush-50/50'
          }`}
          onClick={() => setTab('dogs')}
        >
          Psy
        </button>
        <button
          className={`flex-1 py-4 rounded-2xl text-base font-semibold transition-all ${
            tab === 'owners'
              ? 'bg-blush-200 text-blush-700 shadow-sm'
              : 'text-beige-600 hover:text-blush-500 hover:bg-blush-50/50'
          }`}
          onClick={() => setTab('owners')}
        >
          Majitelia
        </button>
      </div>

      {tab === 'dogs' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
              placeholder="Hľadať psa, majiteľa alebo tag"
              value={dogSearch}
              onChange={(e) => setDogSearch(e.target.value)}
            />
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-4 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                showAdvancedSearch || dogTagFilter.length > 0 || dogCharacterTagFilter.length > 0
                  ? 'bg-beige-200 text-beige-700 border border-beige-300'
                  : 'bg-white/80 text-beige-600 border border-beige-300 hover:bg-beige-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <span className="hidden sm:inline">Filtre</span>
              {(dogTagFilter.length > 0 || dogCharacterTagFilter.length > 0) && (
                <span className="bg-blush-400 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem]">
                  {dogTagFilter.length + dogCharacterTagFilter.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setEditingDog({})}
              className="bg-blush-400 text-white px-6 py-3 rounded-2xl font-medium hover:bg-blush-500 shadow-sm hover:shadow-md transition-all"
            >
              Pridať psa
            </button>
          </div>
          {showAdvancedSearch && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="card py-4 border-l-4 border-l-peach-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
                    </svg>
                    <p className="text-sm font-medium text-sand-700">Filtrovať podľa zdravotných tagov</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-peach-600 hover:text-peach-700 px-3 py-1.5 rounded-full hover:bg-peach-50 transition-colors disabled:opacity-60"
                    onClick={() => setDogTagFilter([])}
                    disabled={dogTagFilter.length === 0}
                  >
                    Vymazať filter
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const selected = dogTagFilter.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setDogTagFilter((current) =>
                            current.includes(tag)
                              ? current.filter((t) => t !== tag)
                              : [...current, tag],
                          );
                        }}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          selected
                            ? 'bg-peach-200 text-peach-700 border-peach-300 shadow-sm'
                            : 'border-peach-200 text-peach-600 hover:border-peach-300 hover:bg-peach-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {availableTags.length === 0 && (
                    <p className="text-sm text-sand-400">Zatiaľ žiadne zdravotné tagy.</p>
                  )}
                </div>
              </div>
              <div className="card py-4 border-l-4 border-l-peach-400">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                    <p className="text-sm font-medium text-sand-700">Filtrovať podľa povahových tagov</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-peach-600 hover:text-peach-700 px-3 py-1.5 rounded-full hover:bg-peach-50 transition-colors disabled:opacity-60"
                    onClick={() => setDogCharacterTagFilter([])}
                    disabled={dogCharacterTagFilter.length === 0}
                  >
                    Vymazať filter
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableCharacterTags.map((tag) => {
                    const selected = dogCharacterTagFilter.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setDogCharacterTagFilter((current) =>
                            current.includes(tag)
                              ? current.filter((t) => t !== tag)
                              : [...current, tag],
                          );
                        }}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          selected
                            ? 'bg-peach-300 text-peach-800 border-peach-400 shadow-sm'
                            : 'border-peach-200 text-peach-600 hover:border-peach-300 hover:bg-peach-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {availableCharacterTags.length === 0 && (
                    <p className="text-sm text-sand-400">Zatiaľ žiadne povahové tagy.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {editingDog && (
            <DogForm
              owners={owners}
              initial={editingDog}
              onSubmit={({ dog, newOwner }) =>
                editingDog.id
                  ? updateDog.mutate({ id: editingDog.id, body: dog })
                  : createDog.mutate({ dog, newOwner })
              }
              onCancel={() => setEditingDog(null)}
              onOpenTagsAdmin={() => setTab('tags')}
              availableTags={availableTags}
              availableCharacterTags={availableCharacterTags}
              availableBreeds={availableBreeds}
              availableCosmetics={configQuery.data?.cosmetics || []}
            />
          )}
          {dogsQuery.isLoading && (
            <p className="text-beige-500 text-center py-8">Načítavam psy…</p>
          )}
          {dogsQuery.data?.length === 0 && (
            <p className="text-beige-500 text-sm text-center py-8">
              Zatiaľ žiadne psy. Pridajte prvého.
            </p>
          )}
          <div className="space-y-3">
            {dogsQuery.data?.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onEdit={(d) => setEditingDog(d)}
                onDelete={(dog) => {
                  setConfirmDialog({
                    message: `Naozaj chcete vymazať psa "${dog.name}"?`,
                    onConfirm: () => {
                      deleteDog.mutate(dog.id);
                      setConfirmDialog(null);
                    },
                    onCancel: () => setConfirmDialog(null),
                  });
                }}
                onOpen={(d) => setSelectedDog(d)}
                onTagClick={(tag) => {
                  if (!dogTagFilter.includes(tag)) {
                    setDogTagFilter((current) => [...current, tag]);
                  }
                }}
                onCharacterTagClick={(tag) => {
                  if (!dogCharacterTagFilter.includes(tag)) {
                    setDogCharacterTagFilter((current) => [...current, tag]);
                  }
                }}
              />
            ))}
          </div>
          {selectedDog && (
            <div
              className="fixed inset-0 z-20 flex items-center justify-center bg-beige-900/30 backdrop-blur-sm px-4 py-8"
              onClick={() => setSelectedDog(null)}
            >
              <div className="card max-w-2xl w-full relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
                    <h3 className="text-3xl font-light text-beige-800">{selectedDog.name}</h3>
                    {Array.isArray(selectedDog.owners) && selectedDog.owners.length > 0 ? (
                      <p className="text-sm text-beige-600">
                        {selectedDog.owners.length === 1 ? 'Majiteľ: ' : 'Majitelia: '}
                        <span className="font-medium text-beige-700">
                          {selectedDog.owners.map(o => o.name).join(', ')}
                        </span>
                      </p>
                    ) : selectedDog.owner_name ? (
                      <p className="text-sm text-beige-600">
                        Majiteľ:{' '}
                        <span className="font-medium text-beige-700">{selectedDog.owner_name}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-beige-400 italic">Bez majiteľa</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-sand-700">
                    {selectedDog.breed && (
                      <div className="bg-gradient-to-br from-peach-50 to-sand-50 rounded-2xl px-4 py-3 border border-peach-100">
                        <div className="flex items-center gap-2 text-peach-600 mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wider">Plemeno</span>
                        </div>
                        <p className="text-peach-800 font-medium">{selectedDog.breed}</p>
                      </div>
                    )}
                    {(selectedDog.weight || selectedDog.grooming_time_minutes) && (
                      <div className="bg-sand-50 rounded-2xl px-4 py-2 space-y-1">
                        {selectedDog.weight && (
                          <p><span className="text-sand-500">Hmotnosť:</span> {selectedDog.weight} kg</p>
                        )}
                        {selectedDog.grooming_time_minutes && (
                          <p><span className="text-sand-500">Čas úpravy:</span> {selectedDog.grooming_time_minutes} min</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Zdravie Section */}
                  {(toTags(selectedDog.grooming_tolerance).length > 0 || selectedDog.health_notes) && (
                    <div className="bg-gradient-to-br from-peach-50 to-sand-50 rounded-2xl p-4 border border-peach-100 space-y-4">
                      <div className="flex items-center gap-2 text-peach-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wider">
                          Zdravie
                        </p>
                      </div>
                      {toTags(selectedDog.grooming_tolerance).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {toTags(selectedDog.grooming_tolerance).map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1.5 rounded-full bg-peach-100 text-peach-700 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedDog.health_notes && (
                        <div className="prose prose-sm max-w-none text-sand-800 bg-white/60 rounded-xl p-3">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedDog.health_notes) }} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Povaha Section */}
                  {(toTags(selectedDog.character_tags).length > 0 || selectedDog.character_notes) && (
                    <div className="bg-gradient-to-br from-peach-100/60 to-sand-50 rounded-2xl p-4 border border-peach-200 space-y-4">
                      <div className="flex items-center gap-2 text-peach-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                          <line x1="9" y1="9" x2="9.01" y2="9"/>
                          <line x1="15" y1="9" x2="15.01" y2="9"/>
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wider">
                          Povaha
                        </p>
                      </div>
                      {toTags(selectedDog.character_tags).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {toTags(selectedDog.character_tags).map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1.5 rounded-full bg-peach-200 text-peach-800 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedDog.character_notes && (
                        <div className="prose prose-sm max-w-none text-sand-800 bg-white/60 rounded-xl p-3">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedDog.character_notes) }} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Kozmetika Section */}
                  {(selectedDog.cosmetics_used && selectedDog.cosmetics_used.length > 0) && (
                    <div className="bg-gradient-to-br from-sand-100/80 to-sand-50 rounded-2xl p-4 border border-sand-200 space-y-4">
                      <div className="flex items-center gap-2 text-peach-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 1-10-10M12 22a10 10 0 0 0 10-10"/>
                          <circle cx="12" cy="12" r="2"/>
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wider">
                          Kozmetika
                        </p>
                      </div>
                      <div className="space-y-2">
                        {selectedDog.cosmetics_used.map((cosmetic, index) => (
                          <div
                            key={index}
                            className="bg-white/60 rounded-xl p-3 border border-sand-200"
                          >
                            <span className="text-sm font-medium text-peach-700">{cosmetic.product}</span>
                            {cosmetic.notes && (
                              <p className="text-sm text-sand-600 mt-1">{cosmetic.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDog.behavior_notes && (
                    <div className="bg-gradient-to-br from-peach-100 via-peach-50 to-sand-50 rounded-2xl p-4 border-2 border-peach-300 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-peach-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <p className="text-xs font-bold uppercase tracking-wider">
                          Dôležité info
                        </p>
                      </div>
                      <div className="prose prose-sm max-w-none text-sand-900 bg-white/70 rounded-xl p-3 border border-peach-200">
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedDog.behavior_notes) }} />
                      </div>
                    </div>
                  )}
                  <div className="pt-4 flex justify-end gap-3 border-t border-beige-200">
                    <button
                      className="text-sm text-beige-600 hover:text-beige-700 px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
                      onClick={() => setSelectedDog(null)}
                    >
                      Zavrieť
                    </button>
                    <button
                      className="text-sm font-medium text-white bg-blush-400 rounded-full px-5 py-2 hover:bg-blush-500 shadow-sm transition-all"
                      onClick={() => {
                        setEditingDog(selectedDog);
                        setSelectedDog(null);
                      }}
                    >
                      Upraviť
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'owners' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
              placeholder="Hľadať majiteľov (meno)"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
            />
            <button
              onClick={() => setShowAdvancedOwnerSearch(!showAdvancedOwnerSearch)}
              className={`px-4 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                showAdvancedOwnerSearch || ownerBreedFilter || ownerContactTagFilter.length > 0
                  ? 'bg-beige-200 text-beige-700 border border-beige-300'
                  : 'bg-white/80 text-beige-600 border border-beige-300 hover:bg-beige-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${showAdvancedOwnerSearch ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <span className="hidden sm:inline">Filtre</span>
              {(ownerBreedFilter || ownerContactTagFilter.length > 0) && (
                <span className="bg-blush-400 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem]">
                  {(ownerBreedFilter ? 1 : 0) + ownerContactTagFilter.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setEditingOwner({})}
              className="bg-blush-400 text-white px-6 py-3 rounded-2xl font-medium hover:bg-blush-500 shadow-sm hover:shadow-md transition-all"
            >
              Pridať majiteľa
            </button>
          </div>
          {showAdvancedOwnerSearch && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="card py-4 border-l-4 border-l-peach-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                    <p className="text-sm font-medium text-sand-700">Filtrovať podľa plemena psa</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-peach-600 hover:text-peach-700 px-3 py-1.5 rounded-full hover:bg-peach-50 transition-colors disabled:opacity-60"
                    onClick={() => setOwnerBreedFilter('')}
                    disabled={!ownerBreedFilter}
                  >
                    Vymazať filter
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableBreeds.map((breed) => {
                    const selected = ownerBreedFilter === breed;
                    return (
                      <button
                        key={breed}
                        type="button"
                        onClick={() => {
                          setOwnerBreedFilter((current) =>
                            current === breed ? '' : breed,
                          );
                        }}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          selected
                            ? 'bg-peach-200 text-peach-700 border-peach-300 shadow-sm'
                            : 'border-peach-200 text-peach-600 hover:border-peach-300 hover:bg-peach-50'
                        }`}
                      >
                        {breed}
                      </button>
                    );
                  })}
                  {availableBreeds.length === 0 && (
                    <p className="text-sm text-sand-400">Zatiaľ žiadne plemená.</p>
                  )}
                </div>
              </div>
              <div className="card py-4 border-l-4 border-l-sand-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <p className="text-sm font-medium text-sand-700">Filtrovať podľa spôsobu komunikácie</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-peach-600 hover:text-peach-700 px-3 py-1.5 rounded-full hover:bg-peach-50 transition-colors disabled:opacity-60"
                    onClick={() => setOwnerContactTagFilter([])}
                    disabled={ownerContactTagFilter.length === 0}
                  >
                    Vymazať filter
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableCommunicationMethods.map((method) => {
                    const selected = ownerContactTagFilter.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setOwnerContactTagFilter((current) =>
                            current.includes(method)
                              ? current.filter((t) => t !== method)
                              : [...current, method],
                          );
                        }}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                          selected
                            ? 'bg-sand-200 text-sand-700 border-sand-300 shadow-sm'
                            : 'border-sand-200 text-sand-600 hover:border-sand-300 hover:bg-sand-100'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                  {availableCommunicationMethods.length === 0 && (
                    <p className="text-sm text-sand-400">Zatiaľ žiadne spôsoby komunikácie.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {editingOwner && (
            <OwnerForm
              initial={editingOwner}
              onSubmit={(body) =>
                editingOwner.id
                  ? updateOwner.mutate({ id: editingOwner.id, body })
                  : createOwner.mutate(body)
              }
              onCancel={() => setEditingOwner(null)}
              onOpenTagsAdmin={() => setTab('tags')}
              allDogs={dogsQuery.data || []}
              onAssociateDog={async (dogId, ownerId) => {
                await api.addDogToOwner(ownerId, dogId);
                queryClient.invalidateQueries({ queryKey: ['dogs'] });
                queryClient.invalidateQueries({ queryKey: ['owners'] });
              }}
              onRemoveDogFromOwner={async (dogId, ownerId) => {
                await api.removeDogFromOwner(ownerId, dogId);
                queryClient.invalidateQueries({ queryKey: ['dogs'] });
                queryClient.invalidateQueries({ queryKey: ['owners'] });
              }}
              availableCommunicationMethods={availableCommunicationMethods}
            />
          )}
          <div className="space-y-3">
            {ownersQuery.data?.map((owner) => (
              <div
                key={owner.id}
                className="card cursor-pointer hover:border-blush-200 hover:bg-white transition-all"
                onClick={() => setSelectedOwner(owner)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xl font-light text-beige-800">{owner.name}</p>
                    {owner.communication_methods && owner.communication_methods.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {owner.communication_methods.map((method, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-sand-100 text-sand-700 text-xs font-medium border border-sand-200"
                          >
                            {method.method}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-beige-400 mt-3">
                      Psy: {owner.dog_count || 0}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-sm text-blush-500 hover:text-blush-600 px-3 py-1.5 rounded-full hover:bg-blush-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOwner(owner);
                      }}
                    >
                      Upraviť
                    </button>
                    <button
                      className="text-sm text-blush-400 hover:text-blush-500 px-3 py-1.5 rounded-full hover:bg-blush-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({
                          message: `Naozaj chcete vymazať majiteľa "${owner.name}" a všetky jeho psy?`,
                          onConfirm: () => {
                            deleteOwner.mutate(owner.id);
                            setConfirmDialog(null);
                          },
                          onCancel: () => setConfirmDialog(null),
                        });
                      }}
                    >
                      Vymazať
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tags' && (
        <div className="space-y-4">
          <TagsAdmin
            onClose={() => setTab('dogs')}
            onTagUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['dogs'] });
            }}
            onToast={showToast}
          />
        </div>
      )}

      {tab === 'admins' && (
        <div className="space-y-4">
          <UsersAdmin
            onClose={() => setTab('dogs')}
            currentUserId={meQuery.data?.id}
          />
        </div>
      )}

      {selectedOwner && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-beige-900/30 backdrop-blur-sm px-4 py-8"
          onClick={() => setSelectedOwner(null)}
        >
          <div className="card max-w-xl w-full relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-light text-beige-800">{selectedOwner.name}</h3>
                {selectedOwner.communication_methods && selectedOwner.communication_methods.length > 0 && (
                  <div className="bg-gradient-to-br from-sand-100/80 to-sand-50 rounded-2xl p-4 border border-sand-200 space-y-3">
                    <p className="text-xs font-semibold text-peach-600 uppercase tracking-wider flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Spôsoby komunikácie
                    </p>
                    <div className="space-y-3">
                      {selectedOwner.communication_methods.map((method, idx) => (
                        <div key={idx} className="bg-white/60 rounded-xl p-3 border border-sand-200">
                          <span className="text-sm font-medium text-sand-700">{method.method}</span>
                          {method.details && (
                            <div 
                              className="prose prose-sm max-w-none text-sand-800 mt-2"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(method.details) }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedOwner.important_info && (
                  <div className="bg-gradient-to-br from-peach-100 via-peach-50 to-sand-50 rounded-2xl p-4 border-2 border-peach-300 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-peach-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Dôležité info
                      </p>
                    </div>
                    <div className="prose prose-sm max-w-none text-sand-900 bg-white/70 rounded-xl p-3 border border-peach-200">
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedOwner.important_info) }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3 border-t border-beige-200 pt-4">
                <p className="text-xs font-medium text-beige-500 uppercase tracking-wider">
                  Psy
                </p>
                <div className="space-y-2">
                  {dogsQuery.data
                    ?.filter((dog) => 
                      Array.isArray(dog.owners) 
                        ? dog.owners.some(o => o.id === selectedOwner.id)
                        : dog.owner_id === selectedOwner.id
                    )
                    .map((dog) => (
                      <button
                        key={dog.id}
                        className="w-full text-left text-sm text-blush-600 hover:text-blush-700 hover:bg-blush-50 rounded-2xl px-4 py-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTab('dogs');
                          setSelectedOwner(null);
                          // Small delay to ensure modal closes before opening new one
                          setTimeout(() => {
                            setSelectedDog(dog);
                          }, 100);
                        }}
                      >
                        {dog.name}
                      </button>
                    ))}
                  {(!dogsQuery.data ||
                    dogsQuery.data.filter((dog) => 
                      Array.isArray(dog.owners) 
                        ? dog.owners.some(o => o.id === selectedOwner.id)
                        : dog.owner_id === selectedOwner.id
                    ).length === 0) && (
                    <p className="text-sm text-beige-400 text-center py-4">Žiadne psy priradené.</p>
                  )}
                </div>
              </div>
              <div className="pt-2 flex justify-end border-t border-beige-200">
                <button
                  className="text-sm text-beige-600 hover:text-beige-700 px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
                  onClick={() => setSelectedOwner(null)}
                >
                  Zavrieť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {showChangePassword && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-beige-900/30 backdrop-blur-sm px-4 py-8"
          onClick={() => {
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setChangePasswordError(null);
          }}
        >
          <div
            className="card max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-light text-beige-800">Zmeniť heslo</h3>
                <p className="text-sm text-beige-600">
                  Zmena hesla pre účet: {meQuery.data?.email}
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-beige-700">Aktuálne heslo</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Aktuálne heslo"
                    className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowChangePassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setChangePasswordError(null);
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-beige-700">Nové heslo</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nové heslo"
                    className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentPassword && newPassword) {
                        changePassword.mutate({ currentPassword, newPassword });
                      } else if (e.key === 'Escape') {
                        setShowChangePassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setChangePasswordError(null);
                      }
                    }}
                  />
                </div>
                {changePasswordError && (
                  <p className="text-sm text-blush-500 bg-blush-50 rounded-2xl px-4 py-2">
                    {changePasswordError}
                  </p>
                )}
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-beige-200">
                <button
                  className="text-sm text-beige-600 hover:text-beige-700 px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setChangePasswordError(null);
                  }}
                >
                  Zrušiť
                </button>
                <button
                  className="text-sm font-medium text-white bg-blush-400 rounded-full px-5 py-2 hover:bg-blush-500 shadow-sm transition-all disabled:opacity-60"
                  onClick={() => {
                    if (currentPassword && newPassword) {
                      changePassword.mutate({ currentPassword, newPassword });
                    }
                  }}
                  disabled={changePassword.isPending || !currentPassword || !newPassword}
                >
                  {changePassword.isPending ? 'Ukladám...' : 'Uložiť'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 ${
            toast.type === 'error' 
              ? 'bg-peach-600 text-white' 
              : 'bg-peach-500 text-white'
          }`}>
            {toast.type === 'error' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

