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

const INITIAL_TAGS = ['Smrdí', 'Pĺzne', 'Kúše'];
const INITIAL_CHARACTER_TAGS = ['Priateľský', 'Bojazlivý', 'Agresívny'];

function getAvailableTags() {
  const stored = localStorage.getItem('dog_groomer_custom_tags');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : INITIAL_TAGS;
    } catch {
      return INITIAL_TAGS;
    }
  }
  localStorage.setItem('dog_groomer_custom_tags', JSON.stringify(INITIAL_TAGS));
  return INITIAL_TAGS;
}

function getAvailableCharacterTags() {
  const stored = localStorage.getItem('dog_groomer_character_tags');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : INITIAL_CHARACTER_TAGS;
    } catch {
      return INITIAL_CHARACTER_TAGS;
    }
  }
  localStorage.setItem('dog_groomer_character_tags', JSON.stringify(INITIAL_CHARACTER_TAGS));
  return INITIAL_CHARACTER_TAGS;
}

function toTags(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  // Handle PostgreSQL array format: {tag1,tag2} or comma-separated string
  const str = String(value).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    return str
      .slice(1, -1)
      .split(',')
      .map((v) => v.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'))
      .filter(Boolean);
  }
  return str
    .split(',')
    .map((v) => v.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'))
    .filter(Boolean);
}

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
  const [tagsRefreshKey, setTagsRefreshKey] = useState(0);
  const [characterTagsRefreshKey, setCharacterTagsRefreshKey] = useState(0);
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

  const availableTags = useMemo(() => getAvailableTags(), [tagsRefreshKey]);
  const availableCharacterTags = useMemo(() => getAvailableCharacterTags(), [characterTagsRefreshKey]);

  // Refresh available tags list when TagsAdmin updates localStorage
  // (and keep existing selected filters if still present)
  useEffect(() => {
    const handleTagsUpdated = () => setTagsRefreshKey((k) => k + 1);
    const handleCharacterTagsUpdated = () => setCharacterTagsRefreshKey((k) => k + 1);
    const handleStorageChange = () => {
      setTagsRefreshKey((k) => k + 1);
      setCharacterTagsRefreshKey((k) => k + 1);
    };
    window.addEventListener('tagsUpdated', handleTagsUpdated);
    window.addEventListener('characterTagsUpdated', handleCharacterTagsUpdated);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
      window.removeEventListener('characterTagsUpdated', handleCharacterTagsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const queryClient = useQueryClient();

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
    queryKey: ['owners', ownerSearch],
    queryFn: () => api.owners(ownerSearch),
    enabled: isAuthed && !meQuery.isLoading,
  });

  const createOwner = useMutation({
    mutationFn: api.createOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
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
      let ownerId = dog.owner_id;
      if (!ownerId && newOwner) {
        const created = await createOwner.mutateAsync(newOwner);
        ownerId = created.id;
      }
      return api.createDog({ ...dog, owner_id: ownerId });
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
              <div className="card py-4 border-l-4 border-l-emerald-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
                    </svg>
                    <p className="text-sm font-medium text-emerald-700">Filtrovať podľa zdravotných tagov</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors disabled:opacity-60"
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
                            ? 'bg-emerald-200 text-emerald-700 border-emerald-300 shadow-sm'
                            : 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {availableTags.length === 0 && (
                    <p className="text-sm text-emerald-400/80">Zatiaľ žiadne zdravotné tagy.</p>
                  )}
                </div>
              </div>
              <div className="card py-4 border-l-4 border-l-violet-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                    <p className="text-sm font-medium text-violet-700">Filtrovať podľa povahových tagov</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-full hover:bg-violet-50 transition-colors disabled:opacity-60"
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
                            ? 'bg-violet-200 text-violet-700 border-violet-300 shadow-sm'
                            : 'border-violet-200 text-violet-600 hover:border-violet-300 hover:bg-violet-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {availableCharacterTags.length === 0 && (
                    <p className="text-sm text-violet-400/80">Zatiaľ žiadne povahové tagy.</p>
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
                    <p className="text-sm text-beige-600">
                      Majiteľ:{' '}
                      <span className="font-medium text-beige-700">{selectedDog.owner_name}</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-beige-700">
                    {selectedDog.breed && (
                      <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-2xl px-4 py-3 border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wider">Plemeno</span>
                        </div>
                        <p className="text-amber-800 font-medium">{selectedDog.breed}</p>
                      </div>
                    )}
                    {(selectedDog.weight || selectedDog.grooming_time_minutes) && (
                      <div className="bg-sage-50/50 rounded-2xl px-4 py-2 space-y-1">
                        {selectedDog.weight && (
                          <p><span className="text-beige-500">Hmotnosť:</span> {selectedDog.weight} kg</p>
                        )}
                        {selectedDog.grooming_time_minutes && (
                          <p><span className="text-beige-500">Čas úpravy:</span> {selectedDog.grooming_time_minutes} min</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Zdravie Section */}
                  {(toTags(selectedDog.grooming_tolerance).length > 0 || selectedDog.health_notes) && (
                    <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 rounded-2xl p-4 border border-emerald-100 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600">
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
                              className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedDog.health_notes && (
                        <div className="prose prose-sm max-w-none text-emerald-800 bg-white/60 rounded-xl p-3">
                          <div dangerouslySetInnerHTML={{ __html: selectedDog.health_notes }} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Povaha Section */}
                  {(toTags(selectedDog.character_tags).length > 0 || selectedDog.character_notes) && (
                    <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/60 rounded-2xl p-4 border border-violet-100 space-y-4">
                      <div className="flex items-center gap-2 text-violet-600">
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
                              className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedDog.character_notes && (
                        <div className="prose prose-sm max-w-none text-violet-800 bg-white/60 rounded-xl p-3">
                          <div dangerouslySetInnerHTML={{ __html: selectedDog.character_notes }} />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Kozmetika Section */}
                  {(selectedDog.cosmetics_used && selectedDog.cosmetics_used.length > 0) && (
                    <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/60 rounded-2xl p-4 border border-rose-100 space-y-4">
                      <div className="flex items-center gap-2 text-rose-600">
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
                            className="bg-white/60 rounded-xl p-3 border border-rose-100"
                          >
                            <span className="text-sm font-medium text-rose-700">{cosmetic.product}</span>
                            {cosmetic.notes && (
                              <p className="text-sm text-rose-600 mt-1">{cosmetic.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDog.behavior_notes && (
                    <div className="bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60 rounded-2xl p-4 border-2 border-amber-200 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-amber-700">
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
                      <div className="prose prose-sm max-w-none text-amber-900 bg-white/70 rounded-xl p-3 border border-amber-100">
                        <div dangerouslySetInnerHTML={{ __html: selectedDog.behavior_notes }} />
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
          <input
            className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            placeholder="Hľadať majiteľov (meno)"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
          />
          {!editingOwner && (
            <OwnerForm 
              onSubmit={(body) => createOwner.mutate(body)}
              onOpenTagsAdmin={() => setTab('tags')}
            />
          )}
          {editingOwner && (
            <OwnerForm
              initial={editingOwner}
              onSubmit={(body) =>
                updateOwner.mutate({ id: editingOwner.id, body })
              }
              onCancel={() => setEditingOwner(null)}
              onOpenTagsAdmin={() => setTab('tags')}
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
                            className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"
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
                  <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/60 rounded-2xl p-4 border border-blue-100 space-y-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Spôsoby komunikácie
                    </p>
                    <div className="space-y-3">
                      {selectedOwner.communication_methods.map((method, idx) => (
                        <div key={idx} className="bg-white/60 rounded-xl p-3 border border-blue-100">
                          <span className="text-sm font-medium text-blue-700">{method.method}</span>
                          {method.details && (
                            <div 
                              className="prose prose-sm max-w-none text-blue-800 mt-2"
                              dangerouslySetInnerHTML={{ __html: method.details }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedOwner.important_info && (
                  <div className="bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60 rounded-2xl p-4 border-2 border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-amber-700">
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
                    <div className="prose prose-sm max-w-none text-amber-900 bg-white/70 rounded-xl p-3 border border-amber-100">
                      <div dangerouslySetInnerHTML={{ __html: selectedOwner.important_info }} />
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
                    ?.filter((dog) => dog.owner_id === selectedOwner.id)
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
                    dogsQuery.data.filter((dog) => dog.owner_id === selectedOwner.id).length ===
                      0) && (
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
              ? 'bg-blush-500 text-white' 
              : 'bg-emerald-500 text-white'
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

