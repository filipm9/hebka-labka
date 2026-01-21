import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const INITIAL_TAGS = ['Smrdí', 'Pĺzne', 'Kúše'];
const INITIAL_BREEDS = ['Zlatý retriever', 'Labrador', 'Nemecký ovčiak', 'Pudel', 'Bígl', 'Yorkshirský teriér'];

function getCustomTags() {
  const stored = localStorage.getItem('dog_groomer_custom_tags');
  if (stored) {
    return JSON.parse(stored);
  }
  saveCustomTags(INITIAL_TAGS);
  return INITIAL_TAGS;
}

function saveCustomTags(tags) {
  localStorage.setItem('dog_groomer_custom_tags', JSON.stringify(tags));
}

function getCustomBreeds() {
  const stored = localStorage.getItem('dog_groomer_custom_breeds');
  if (stored) {
    return JSON.parse(stored);
  }
  saveCustomBreeds(INITIAL_BREEDS);
  return INITIAL_BREEDS;
}

function saveCustomBreeds(breeds) {
  localStorage.setItem('dog_groomer_custom_breeds', JSON.stringify(breeds));
}

function toTags(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const str = String(value).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    return str
      .slice(1, -1)
      .split(',')
      .map((v) => v.trim().replace(/^"(.*)"$/, '$1'))
      .filter(Boolean);
  }
  return str
    .split(',')
    .map((v) => v.trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean);
}

export function TagsAdmin({ onClose, onTagUpdate }) {
  const [customTags, setCustomTags] = useState(getCustomTags());
  const [customBreeds, setCustomBreeds] = useState(getCustomBreeds());
  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingBreed, setEditingBreed] = useState(null);
  const [editBreedValue, setEditBreedValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newBreed, setNewBreed] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    setCustomTags(getCustomTags());
    setCustomBreeds(getCustomBreeds());
  }, []);

  // --- Tags handlers ---
  const handleAddTag = () => {
    const val = newTag.trim();
    if (!val) return;
    if (customTags.includes(val)) {
      setAlertMessage('Tento tag už existuje.');
      return;
    }
    const updated = [...customTags, val];
    saveCustomTags(updated);
    setCustomTags(updated);
    setNewTag('');
    window.dispatchEvent(new Event('tagsUpdated'));
  };

  const handleDeleteTag = async (tag) => {
    setConfirmDialog({
      message: `Naozaj chcete vymazať tag "${tag}"? Tento tag bude odstránený zo všetkých psov, ktoré ho majú.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsUpdating(true);
        try {
          const allDogs = await api.dogs('');
          const dogsToUpdate = allDogs.filter((dog) => {
            const tags = toTags(dog.grooming_tolerance);
            return tags.includes(tag);
          });

          // Update dogs one by one with better error handling
          for (const dog of dogsToUpdate) {
            const tags = toTags(dog.grooming_tolerance);
            const updatedTags = tags.filter((t) => t !== tag);
            await api.updateDog(dog.id, {
              owner_id: dog.owner_id,
              name: dog.name,
              breed: dog.breed,
              weight: dog.weight,
              birthdate: dog.birthdate,
              behavior_notes: dog.behavior_notes,
              grooming_tolerance: updatedTags,
              health_notes: dog.health_notes,
            });
          }
          
          const updated = customTags.filter((t) => t !== tag);
          saveCustomTags(updated);
          setCustomTags(updated);
          window.dispatchEvent(new Event('tagsUpdated'));
          if (onTagUpdate) onTagUpdate();
        } catch (error) {
          console.error('Error deleting tag:', error);
          setAlertMessage('Chyba pri aktualizácii tagov: ' + (error.message || 'Neznáma chyba'));
        } finally {
          setIsUpdating(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleStartEditTag = (tag) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const handleSaveEditTag = async () => {
    const val = editValue.trim();
    if (!val) return;
    if (val === editingTag) {
      setEditingTag(null);
      setEditValue('');
      return;
    }
    if (customTags.includes(val)) {
      setAlertMessage('Tento tag už existuje.');
      return;
    }
    
    setIsUpdating(true);
    try {
      const allDogs = await api.dogs('');
      const dogsToUpdate = allDogs.filter((dog) => {
        const tags = toTags(dog.grooming_tolerance);
        return tags.includes(editingTag);
      });

      // Update dogs one by one with better error handling
      for (const dog of dogsToUpdate) {
        const tags = toTags(dog.grooming_tolerance);
        const updatedTags = tags.map((t) => (t === editingTag ? val : t));
        await api.updateDog(dog.id, {
          owner_id: dog.owner_id,
          name: dog.name,
          breed: dog.breed,
          weight: dog.weight,
          birthdate: dog.birthdate,
          behavior_notes: dog.behavior_notes,
          grooming_tolerance: updatedTags,
          health_notes: dog.health_notes,
        });
      }
      
      const updated = customTags.map((t) => (t === editingTag ? val : t));
      saveCustomTags(updated);
      setCustomTags(updated);
      setEditingTag(null);
      setEditValue('');
      window.dispatchEvent(new Event('tagsUpdated'));
      if (onTagUpdate) onTagUpdate();
    } catch (error) {
      console.error('Error updating tags:', error);
      setAlertMessage('Chyba pri aktualizácii tagov: ' + (error.message || 'Neznáma chyba'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEditTag = () => {
    setEditingTag(null);
    setEditValue('');
  };

  // --- Breeds handlers ---
  const handleAddBreed = () => {
    const val = newBreed.trim();
    if (!val) return;
    if (customBreeds.includes(val)) {
      setAlertMessage('Toto plemeno už existuje.');
      return;
    }
    const updated = [...customBreeds, val];
    saveCustomBreeds(updated);
    setCustomBreeds(updated);
    setNewBreed('');
    window.dispatchEvent(new Event('breedsUpdated'));
  };

  const handleDeleteBreed = async (breed) => {
    setConfirmDialog({
      message: `Naozaj chcete vymazať plemeno "${breed}"? Psom s týmto plemenom sa plemeno vymaže.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsUpdating(true);
        try {
          const allDogs = await api.dogs('');
          const dogsToUpdate = allDogs.filter((dog) => dog.breed === breed);

          for (const dog of dogsToUpdate) {
            await api.updateDog(dog.id, {
              owner_id: dog.owner_id,
              name: dog.name,
              breed: null,
              weight: dog.weight,
              birthdate: dog.birthdate,
              behavior_notes: dog.behavior_notes,
              grooming_tolerance: toTags(dog.grooming_tolerance),
              health_notes: dog.health_notes,
            });
          }
          
          const updated = customBreeds.filter((b) => b !== breed);
          saveCustomBreeds(updated);
          setCustomBreeds(updated);
          window.dispatchEvent(new Event('breedsUpdated'));
          if (onTagUpdate) onTagUpdate();
        } catch (error) {
          console.error('Error deleting breed:', error);
          setAlertMessage('Chyba pri aktualizácii plemien: ' + (error.message || 'Neznáma chyba'));
        } finally {
          setIsUpdating(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleStartEditBreed = (breed) => {
    setEditingBreed(breed);
    setEditBreedValue(breed);
  };

  const handleSaveEditBreed = async () => {
    const val = editBreedValue.trim();
    if (!val) return;
    if (val === editingBreed) {
      setEditingBreed(null);
      setEditBreedValue('');
      return;
    }
    if (customBreeds.includes(val)) {
      setAlertMessage('Toto plemeno už existuje.');
      return;
    }
    
    setIsUpdating(true);
    try {
      const allDogs = await api.dogs('');
      const dogsToUpdate = allDogs.filter((dog) => dog.breed === editingBreed);

      for (const dog of dogsToUpdate) {
        await api.updateDog(dog.id, {
          owner_id: dog.owner_id,
          name: dog.name,
          breed: val,
          weight: dog.weight,
          birthdate: dog.birthdate,
          behavior_notes: dog.behavior_notes,
          grooming_tolerance: toTags(dog.grooming_tolerance),
          health_notes: dog.health_notes,
        });
      }
      
      const updated = customBreeds.map((b) => (b === editingBreed ? val : b));
      saveCustomBreeds(updated);
      setCustomBreeds(updated);
      setEditingBreed(null);
      setEditBreedValue('');
      window.dispatchEvent(new Event('breedsUpdated'));
      if (onTagUpdate) onTagUpdate();
    } catch (error) {
      console.error('Error updating breed:', error);
      setAlertMessage('Chyba pri aktualizácii plemien: ' + (error.message || 'Neznáma chyba'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEditBreed = () => {
    setEditingBreed(null);
    setEditBreedValue('');
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-beige-800">Konfigurácia hodnôt</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-beige-600 hover:text-beige-700 text-sm px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
            disabled={isUpdating}
          >
            Zavrieť
          </button>
        )}
      </div>

      {isUpdating && (
        <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 text-sm text-sage-700">
          Aktualizujem hodnoty vo všetkých psoch...
        </div>
      )}

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

      {/* Health Tags Section */}
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
            </svg>
            <label className="text-sm font-medium text-emerald-700">
              Zdravotné tagy
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customTags.length === 0 ? (
              <p className="text-sm text-beige-400">Zatiaľ žiadne tagy.</p>
            ) : (
              customTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium border border-emerald-200"
                >
                  {editingTag === tag ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditTag();
                          } else if (e.key === 'Escape') {
                            handleCancelEditTag();
                          }
                        }}
                        className="px-3 py-1 rounded-xl border border-emerald-300 bg-white text-sm w-28 text-beige-800 focus:outline-none focus:border-emerald-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditTag}
                        className="text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-emerald-50 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditTag}
                        className="text-beige-500 hover:text-beige-700 disabled:opacity-50 p-1 rounded-full hover:bg-beige-50 transition-colors"
                        title="Zrušiť"
                        disabled={isUpdating}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditTag(tag)}
                        className="text-blush-500 hover:text-blush-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-blush-50 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag)}
                        className="text-blush-400 hover:text-blush-500 disabled:opacity-50 p-1 rounded-full hover:bg-blush-50 transition-colors"
                        title="Vymazať"
                        disabled={isUpdating}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-emerald-700">
            Pridať nový zdravotný tag
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Názov tagu (napr. Alergia, Lieky...)"
              className="flex-1 rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-beige-800 placeholder-emerald-300 focus:bg-white focus:border-emerald-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-6 rounded-2xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
          </div>
        </div>
      </div>

      {/* Breeds Section */}
      <div className="space-y-5 pt-6 border-t border-beige-200">
        <div className="space-y-3">
          <label className="text-sm font-medium text-beige-700">
            Plemená
          </label>
          <div className="flex flex-wrap gap-2">
            {customBreeds.length === 0 ? (
              <p className="text-sm text-beige-400">Zatiaľ žiadne plemená.</p>
            ) : (
              customBreeds.map((breed) => (
                <div
                  key={breed}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blush-50 text-blush-700 text-sm font-medium border border-blush-200"
                >
                  {editingBreed === breed ? (
                    <>
                      <input
                        type="text"
                        value={editBreedValue}
                        onChange={(e) => setEditBreedValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditBreed();
                          } else if (e.key === 'Escape') {
                            handleCancelEditBreed();
                          }
                        }}
                        className="px-3 py-1 rounded-xl border border-blush-300 bg-white text-sm w-36 text-beige-800 focus:outline-none focus:border-blush-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditBreed}
                        className="text-blush-600 hover:text-blush-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-blush-100 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditBreed}
                        className="text-beige-500 hover:text-beige-700 disabled:opacity-50 p-1 rounded-full hover:bg-beige-50 transition-colors"
                        title="Zrušiť"
                        disabled={isUpdating}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{breed}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditBreed(breed)}
                        className="text-blush-500 hover:text-blush-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-blush-100 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBreed(breed)}
                        className="text-blush-400 hover:text-blush-500 disabled:opacity-50 p-1 rounded-full hover:bg-blush-100 transition-colors"
                        title="Vymazať"
                        disabled={isUpdating}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-beige-700">
            Pridať nové plemeno
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newBreed}
              onChange={(e) => setNewBreed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBreed();
                }
              }}
              placeholder="Názov plemena"
              className="flex-1 rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            />
            <button
              type="button"
              onClick={handleAddBreed}
              className="px-6 rounded-2xl bg-blush-400 text-white text-sm font-medium hover:bg-blush-500 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
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
