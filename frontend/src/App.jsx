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
  const [tagsRefreshKey, setTagsRefreshKey] = useState(0);
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

  const availableTags = useMemo(() => getAvailableTags(), [tagsRefreshKey]);

  // Refresh available tags list when TagsAdmin updates localStorage
  // (and keep existing selected filters if still present)
  useEffect(() => {
    const handleTagsUpdated = () => setTagsRefreshKey((k) => k + 1);
    window.addEventListener('tagsUpdated', handleTagsUpdated);
    window.addEventListener('storage', handleTagsUpdated);
    return () => {
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
      window.removeEventListener('storage', handleTagsUpdated);
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
    queryKey: ['dogs', dogSearch, dogTagFilter],
    queryFn: () => api.dogs({ search: dogSearch, tags: dogTagFilter }),
    enabled: isAuthed && !meQuery.isLoading,
  });

  const ownersQuery = useQuery({
    queryKey: ['owners', ownerSearch],
    queryFn: () => api.owners(ownerSearch),
    enabled: isAuthed && !meQuery.isLoading,
  });

  const createOwner = useMutation({
    mutationFn: api.createOwner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owners'] }),
  });

  const updateOwner = useMutation({
    mutationFn: ({ id, body }) => api.updateOwner(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      setEditingOwner(null);
    },
  });

  const deleteOwner = useMutation({
    mutationFn: api.deleteOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      setEditingDog(null);
    },
  });

  const updateDog = useMutation({
    mutationFn: ({ id, body }) => api.updateDog(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      setEditingDog(null);
    },
  });

  const deleteDog = useMutation({
    mutationFn: api.deleteDog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dogs'] }),
  });

  const changePassword = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => {
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setChangePasswordError(null);
    },
    onError: (error) => {
      setChangePasswordError(error.message);
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
            Tagy
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
              onClick={() => setEditingDog({})}
              className="bg-blush-400 text-white px-6 py-3 rounded-2xl font-medium hover:bg-blush-500 shadow-sm hover:shadow-md transition-all"
            >
              Pridať psa
            </button>
          </div>
          <div className="card py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-beige-700">Filtrovať podľa tagov</p>
              <button
                type="button"
                className="text-xs text-beige-600 hover:text-beige-700 px-3 py-1.5 rounded-full hover:bg-beige-50 transition-colors disabled:opacity-60"
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
                        ? 'bg-sage-200 text-sage-700 border-sage-300 shadow-sm'
                        : 'border-beige-300 text-beige-600 hover:border-blush-300 hover:bg-blush-50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              {availableTags.length === 0 && (
                <p className="text-sm text-beige-400">Zatiaľ žiadne tagy.</p>
              )}
            </div>
          </div>
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
                      <p className="bg-sage-50/50 rounded-2xl px-4 py-2">
                        <span className="text-beige-500">Plemeno:</span> {selectedDog.breed}
                      </p>
                    )}
                    {selectedDog.weight && (
                      <p className="bg-sage-50/50 rounded-2xl px-4 py-2">
                        <span className="text-beige-500">Hmotnosť:</span> {selectedDog.weight} kg
                      </p>
                    )}
                  </div>
                  {toTags(selectedDog.grooming_tolerance).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-beige-500 uppercase tracking-wider">
                        Vlastné tagy
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {toTags(selectedDog.grooming_tolerance).map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDog.behavior_notes && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-beige-500 uppercase tracking-wider">
                        Správanie
                      </p>
                      <div className="prose prose-sm max-w-none text-beige-700 bg-beige-50/50 rounded-2xl p-4">
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
            placeholder="Hľadať majiteľov (meno alebo telefón)"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
          />
          {!editingOwner && (
            <OwnerForm onSubmit={(body) => createOwner.mutate(body)} />
          )}
          {editingOwner && (
            <OwnerForm
              initial={editingOwner}
              onSubmit={(body) =>
                updateOwner.mutate({ id: editingOwner.id, body })
              }
              onCancel={() => setEditingOwner(null)}
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
                    <p className="text-sm text-beige-600">{owner.phone || 'Bez telefónu'}</p>
                    {owner.email && <p className="text-sm text-beige-600">{owner.email}</p>}
                    {owner.address && <p className="text-sm text-beige-600">{owner.address}</p>}
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
                {selectedOwner.phone && (
                  <p className="text-sm text-beige-600 bg-sage-50/50 rounded-2xl px-4 py-2">
                    <span className="text-beige-500">Telefón:</span> {selectedOwner.phone}
                  </p>
                )}
                {selectedOwner.email && (
                  <p className="text-sm text-beige-600 bg-sage-50/50 rounded-2xl px-4 py-2">
                    <span className="text-beige-500">Email:</span> {selectedOwner.email}
                  </p>
                )}
                {selectedOwner.address && (
                  <p className="text-sm text-beige-600 bg-sage-50/50 rounded-2xl px-4 py-2">
                    <span className="text-beige-500">Adresa:</span> {selectedOwner.address}
                  </p>
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
    </div>
  );
}

