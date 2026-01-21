import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const INITIAL_TAGS = ['Smrdí', 'Pĺzne', 'Kúše'];
const INITIAL_CHARACTER_TAGS = ['Priateľský', 'Bojazlivý', 'Agresívny'];
const INITIAL_BREEDS = ['Zlatý retriever', 'Labrador', 'Nemecký ovčiak', 'Pudel', 'Bígl', 'Yorkshirský teriér'];
const INITIAL_COSMETICS = ['Šampón na citlivú pokožku', 'Kondicionér', 'Sprej na rozčesávanie', 'Parfum'];

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

function getCustomCharacterTags() {
  const stored = localStorage.getItem('dog_groomer_character_tags');
  if (stored) {
    return JSON.parse(stored);
  }
  saveCustomCharacterTags(INITIAL_CHARACTER_TAGS);
  return INITIAL_CHARACTER_TAGS;
}

function saveCustomCharacterTags(tags) {
  localStorage.setItem('dog_groomer_character_tags', JSON.stringify(tags));
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

function getCustomCosmetics() {
  const stored = localStorage.getItem('dog_groomer_custom_cosmetics');
  if (stored) {
    return JSON.parse(stored);
  }
  saveCustomCosmetics(INITIAL_COSMETICS);
  return INITIAL_COSMETICS;
}

function saveCustomCosmetics(cosmetics) {
  localStorage.setItem('dog_groomer_custom_cosmetics', JSON.stringify(cosmetics));
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

export function TagsAdmin({ onClose, onTagUpdate, onToast }) {
  const [customTags, setCustomTags] = useState(getCustomTags());
  const [customCharacterTags, setCustomCharacterTags] = useState(getCustomCharacterTags());
  const [customBreeds, setCustomBreeds] = useState(getCustomBreeds());
  const [customCosmetics, setCustomCosmetics] = useState(getCustomCosmetics());
  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingCharacterTag, setEditingCharacterTag] = useState(null);
  const [editCharacterValue, setEditCharacterValue] = useState('');
  const [editingBreed, setEditingBreed] = useState(null);
  const [editBreedValue, setEditBreedValue] = useState('');
  const [editingCosmetic, setEditingCosmetic] = useState(null);
  const [editCosmeticValue, setEditCosmeticValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCharacterTag, setNewCharacterTag] = useState('');
  const [newBreed, setNewBreed] = useState('');
  const [newCosmetic, setNewCosmetic] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Helper to show toast via parent
  const showToast = (message, type = 'success') => {
    if (onToast) {
      onToast(message, type);
    }
  };

  useEffect(() => {
    setCustomTags(getCustomTags());
    setCustomCharacterTags(getCustomCharacterTags());
    setCustomBreeds(getCustomBreeds());
    setCustomCosmetics(getCustomCosmetics());
  }, []);

  // --- Tags handlers ---
  const handleAddTag = () => {
    const val = newTag.trim();
    if (!val) return;
    if (customTags.includes(val)) {
      showToast('Tento tag už existuje.', 'error');
      return;
    }
    const updated = [...customTags, val];
    saveCustomTags(updated);
    setCustomTags(updated);
    setNewTag('');
    window.dispatchEvent(new Event('tagsUpdated'));
    showToast('Zdravotný tag bol pridaný');
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
              character_tags: toTags(dog.character_tags),
              character_notes: dog.character_notes,
            });
          }
          
          const updated = customTags.filter((t) => t !== tag);
          saveCustomTags(updated);
          setCustomTags(updated);
          window.dispatchEvent(new Event('tagsUpdated'));
          if (onTagUpdate) onTagUpdate();
          showToast('Zdravotný tag bol vymazaný');
        } catch (error) {
          console.error('Error deleting tag:', error);
          showToast('Chyba pri aktualizácii tagov: ' + (error.message || 'Neznáma chyba'), 'error');
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
      showToast('Tento tag už existuje.', 'error');
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
          character_tags: toTags(dog.character_tags),
          character_notes: dog.character_notes,
        });
      }
      
      const updated = customTags.map((t) => (t === editingTag ? val : t));
      saveCustomTags(updated);
      setCustomTags(updated);
      setEditingTag(null);
      setEditValue('');
      window.dispatchEvent(new Event('tagsUpdated'));
      if (onTagUpdate) onTagUpdate();
      showToast('Zdravotný tag bol upravený');
    } catch (error) {
      console.error('Error updating tags:', error);
      showToast('Chyba pri aktualizácii tagov: ' + (error.message || 'Neznáma chyba'), 'error');
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
      showToast('Toto plemeno už existuje.', 'error');
      return;
    }
    const updated = [...customBreeds, val];
    saveCustomBreeds(updated);
    setCustomBreeds(updated);
    setNewBreed('');
    window.dispatchEvent(new Event('breedsUpdated'));
    showToast('Plemeno bolo pridané');
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
              character_tags: toTags(dog.character_tags),
              character_notes: dog.character_notes,
            });
          }
          
          const updated = customBreeds.filter((b) => b !== breed);
          saveCustomBreeds(updated);
          setCustomBreeds(updated);
          window.dispatchEvent(new Event('breedsUpdated'));
          if (onTagUpdate) onTagUpdate();
          showToast('Plemeno bolo vymazané');
        } catch (error) {
          console.error('Error deleting breed:', error);
          showToast('Chyba pri aktualizácii plemien: ' + (error.message || 'Neznáma chyba'), 'error');
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
      showToast('Toto plemeno už existuje.', 'error');
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
          character_tags: toTags(dog.character_tags),
          character_notes: dog.character_notes,
        });
      }
      
      const updated = customBreeds.map((b) => (b === editingBreed ? val : b));
      saveCustomBreeds(updated);
      setCustomBreeds(updated);
      setEditingBreed(null);
      setEditBreedValue('');
      window.dispatchEvent(new Event('breedsUpdated'));
      if (onTagUpdate) onTagUpdate();
      showToast('Plemeno bolo upravené');
    } catch (error) {
      console.error('Error updating breed:', error);
      showToast('Chyba pri aktualizácii plemien: ' + (error.message || 'Neznáma chyba'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEditBreed = () => {
    setEditingBreed(null);
    setEditBreedValue('');
  };

  // --- Character Tags handlers ---
  const handleAddCharacterTag = () => {
    const val = newCharacterTag.trim();
    if (!val) return;
    if (customCharacterTags.includes(val)) {
      showToast('Tento povahový tag už existuje.', 'error');
      return;
    }
    const updated = [...customCharacterTags, val];
    saveCustomCharacterTags(updated);
    setCustomCharacterTags(updated);
    setNewCharacterTag('');
    window.dispatchEvent(new Event('characterTagsUpdated'));
    showToast('Povahový tag bol pridaný');
  };

  const handleDeleteCharacterTag = async (tag) => {
    setConfirmDialog({
      message: `Naozaj chcete vymazať povahový tag "${tag}"? Tento tag bude odstránený zo všetkých psov, ktoré ho majú.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsUpdating(true);
        try {
          const allDogs = await api.dogs('');
          const dogsToUpdate = allDogs.filter((dog) => {
            const tags = toTags(dog.character_tags);
            return tags.includes(tag);
          });

          for (const dog of dogsToUpdate) {
            const charTags = toTags(dog.character_tags);
            const updatedCharTags = charTags.filter((t) => t !== tag);
            await api.updateDog(dog.id, {
              owner_id: dog.owner_id,
              name: dog.name,
              breed: dog.breed,
              weight: dog.weight,
              birthdate: dog.birthdate,
              behavior_notes: dog.behavior_notes,
              grooming_tolerance: toTags(dog.grooming_tolerance),
              health_notes: dog.health_notes,
              character_tags: updatedCharTags,
              character_notes: dog.character_notes,
            });
          }
          
          const updated = customCharacterTags.filter((t) => t !== tag);
          saveCustomCharacterTags(updated);
          setCustomCharacterTags(updated);
          window.dispatchEvent(new Event('characterTagsUpdated'));
          if (onTagUpdate) onTagUpdate();
          showToast('Povahový tag bol vymazaný');
        } catch (error) {
          console.error('Error deleting character tag:', error);
          showToast('Chyba pri aktualizácii tagov: ' + (error.message || 'Neznáma chyba'), 'error');
        } finally {
          setIsUpdating(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleStartEditCharacterTag = (tag) => {
    setEditingCharacterTag(tag);
    setEditCharacterValue(tag);
  };

  const handleSaveEditCharacterTag = async () => {
    const val = editCharacterValue.trim();
    if (!val) return;
    if (val === editingCharacterTag) {
      setEditingCharacterTag(null);
      setEditCharacterValue('');
      return;
    }
    if (customCharacterTags.includes(val)) {
      showToast('Tento povahový tag už existuje.', 'error');
      return;
    }
    
    setIsUpdating(true);
    try {
      const allDogs = await api.dogs('');
      const dogsToUpdate = allDogs.filter((dog) => {
        const tags = toTags(dog.character_tags);
        return tags.includes(editingCharacterTag);
      });

      for (const dog of dogsToUpdate) {
        const charTags = toTags(dog.character_tags);
        const updatedCharTags = charTags.map((t) => (t === editingCharacterTag ? val : t));
        await api.updateDog(dog.id, {
          owner_id: dog.owner_id,
          name: dog.name,
          breed: dog.breed,
          weight: dog.weight,
          birthdate: dog.birthdate,
          behavior_notes: dog.behavior_notes,
          grooming_tolerance: toTags(dog.grooming_tolerance),
          health_notes: dog.health_notes,
          character_tags: updatedCharTags,
          character_notes: dog.character_notes,
        });
      }
      
      const updated = customCharacterTags.map((t) => (t === editingCharacterTag ? val : t));
      saveCustomCharacterTags(updated);
      setCustomCharacterTags(updated);
      setEditingCharacterTag(null);
      setEditCharacterValue('');
      window.dispatchEvent(new Event('characterTagsUpdated'));
      if (onTagUpdate) onTagUpdate();
      showToast('Povahový tag bol upravený');
    } catch (error) {
      console.error('Error updating character tags:', error);
      showToast('Chyba pri aktualizácii tagov: ' + (error.message || 'Neznáma chyba'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEditCharacterTag = () => {
    setEditingCharacterTag(null);
    setEditCharacterValue('');
  };

  // --- Cosmetics handlers ---
  const handleAddCosmetic = () => {
    const val = newCosmetic.trim();
    if (!val) return;
    if (customCosmetics.includes(val)) {
      showToast('Táto kozmetika už existuje.', 'error');
      return;
    }
    const updated = [...customCosmetics, val];
    saveCustomCosmetics(updated);
    setCustomCosmetics(updated);
    setNewCosmetic('');
    window.dispatchEvent(new Event('cosmeticsUpdated'));
    showToast('Kozmetický produkt bol pridaný');
  };

  const handleDeleteCosmetic = async (cosmetic) => {
    setConfirmDialog({
      message: `Naozaj chcete vymazať kozmetiku "${cosmetic}"? Táto kozmetika bude odstránená zo všetkých psov.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsUpdating(true);
        try {
          const allDogs = await api.dogs('');
          const dogsToUpdate = allDogs.filter((dog) => {
            const cosmetics = dog.cosmetics_used || [];
            return cosmetics.some((c) => c.product === cosmetic);
          });

          for (const dog of dogsToUpdate) {
            const cosmetics = dog.cosmetics_used || [];
            const updatedCosmetics = cosmetics.filter((c) => c.product !== cosmetic);
            await api.updateDog(dog.id, {
              owner_id: dog.owner_id,
              name: dog.name,
              breed: dog.breed,
              weight: dog.weight,
              birthdate: dog.birthdate,
              behavior_notes: dog.behavior_notes,
              grooming_tolerance: toTags(dog.grooming_tolerance),
              health_notes: dog.health_notes,
              character_tags: toTags(dog.character_tags),
              character_notes: dog.character_notes,
              cosmetics_used: updatedCosmetics,
            });
          }
          
          const updated = customCosmetics.filter((c) => c !== cosmetic);
          saveCustomCosmetics(updated);
          setCustomCosmetics(updated);
          window.dispatchEvent(new Event('cosmeticsUpdated'));
          if (onTagUpdate) onTagUpdate();
          showToast('Kozmetický produkt bol vymazaný');
        } catch (error) {
          console.error('Error deleting cosmetic:', error);
          showToast('Chyba pri aktualizácii kozmetiky: ' + (error.message || 'Neznáma chyba'), 'error');
        } finally {
          setIsUpdating(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleStartEditCosmetic = (cosmetic) => {
    setEditingCosmetic(cosmetic);
    setEditCosmeticValue(cosmetic);
  };

  const handleSaveEditCosmetic = async () => {
    const val = editCosmeticValue.trim();
    if (!val) return;
    if (val === editingCosmetic) {
      setEditingCosmetic(null);
      setEditCosmeticValue('');
      return;
    }
    if (customCosmetics.includes(val)) {
      showToast('Táto kozmetika už existuje.', 'error');
      return;
    }
    
    setIsUpdating(true);
    try {
      const allDogs = await api.dogs('');
      const dogsToUpdate = allDogs.filter((dog) => {
        const cosmetics = dog.cosmetics_used || [];
        return cosmetics.some((c) => c.product === editingCosmetic);
      });

      for (const dog of dogsToUpdate) {
        const cosmetics = dog.cosmetics_used || [];
        const updatedCosmetics = cosmetics.map((c) => 
          c.product === editingCosmetic ? { ...c, product: val } : c
        );
        await api.updateDog(dog.id, {
          owner_id: dog.owner_id,
          name: dog.name,
          breed: dog.breed,
          weight: dog.weight,
          birthdate: dog.birthdate,
          behavior_notes: dog.behavior_notes,
          grooming_tolerance: toTags(dog.grooming_tolerance),
          health_notes: dog.health_notes,
          character_tags: toTags(dog.character_tags),
          character_notes: dog.character_notes,
          cosmetics_used: updatedCosmetics,
        });
      }
      
      const updated = customCosmetics.map((c) => (c === editingCosmetic ? val : c));
      saveCustomCosmetics(updated);
      setCustomCosmetics(updated);
      setEditingCosmetic(null);
      setEditCosmeticValue('');
      window.dispatchEvent(new Event('cosmeticsUpdated'));
      if (onTagUpdate) onTagUpdate();
      showToast('Kozmetický produkt bol upravený');
    } catch (error) {
      console.error('Error updating cosmetic:', error);
      showToast('Chyba pri aktualizácii kozmetiky: ' + (error.message || 'Neznáma chyba'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEditCosmetic = () => {
    setEditingCosmetic(null);
    setEditCosmeticValue('');
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

      {/* Character Tags Section */}
      <div className="space-y-5 pt-6 border-t border-beige-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <label className="text-sm font-medium text-violet-700">
              Povahové tagy
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customCharacterTags.length === 0 ? (
              <p className="text-sm text-beige-400">Zatiaľ žiadne povahové tagy.</p>
            ) : (
              customCharacterTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium border border-violet-200"
                >
                  {editingCharacterTag === tag ? (
                    <>
                      <input
                        type="text"
                        value={editCharacterValue}
                        onChange={(e) => setEditCharacterValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditCharacterTag();
                          } else if (e.key === 'Escape') {
                            handleCancelEditCharacterTag();
                          }
                        }}
                        className="px-3 py-1 rounded-xl border border-violet-300 bg-white text-sm w-28 text-beige-800 focus:outline-none focus:border-violet-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditCharacterTag}
                        className="text-violet-600 hover:text-violet-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-violet-50 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditCharacterTag}
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
                        onClick={() => handleStartEditCharacterTag(tag)}
                        className="text-blush-500 hover:text-blush-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-blush-50 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCharacterTag(tag)}
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
          <label className="text-sm font-medium text-violet-700">
            Pridať nový povahový tag
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCharacterTag}
              onChange={(e) => setNewCharacterTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCharacterTag();
                }
              }}
              placeholder="Názov tagu (napr. Hravý, Kľudný...)"
              className="flex-1 rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 text-beige-800 placeholder-violet-300 focus:bg-white focus:border-violet-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddCharacterTag}
              className="px-6 rounded-2xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
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
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <label className="text-sm font-medium text-amber-700">
              Plemená
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customBreeds.length === 0 ? (
              <p className="text-sm text-beige-400">Zatiaľ žiadne plemená.</p>
            ) : (
              customBreeds.map((breed) => (
                <div
                  key={breed}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium border border-amber-200"
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
                        className="px-3 py-1 rounded-xl border border-amber-300 bg-white text-sm w-36 text-beige-800 focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditBreed}
                        className="text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-amber-50 transition-colors"
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
                        className="text-amber-500 hover:text-amber-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-amber-50 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBreed(breed)}
                        className="text-amber-400 hover:text-amber-500 disabled:opacity-50 p-1 rounded-full hover:bg-amber-50 transition-colors"
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
          <label className="text-sm font-medium text-amber-700">
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
              className="flex-1 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-beige-800 placeholder-amber-300 focus:bg-white focus:border-amber-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddBreed}
              className="px-6 rounded-2xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
          </div>
        </div>
      </div>

      {/* Cosmetics Section */}
      <div className="space-y-5 pt-6 border-t border-beige-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 1-10-10M12 22a10 10 0 0 0 10-10"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            <label className="text-sm font-medium text-rose-700">
              Kozmetické produkty
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customCosmetics.length === 0 ? (
              <p className="text-sm text-beige-400">Zatiaľ žiadne kozmetické produkty.</p>
            ) : (
              customCosmetics.map((cosmetic) => (
                <div
                  key={cosmetic}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-100 text-rose-700 text-sm font-medium border border-rose-200"
                >
                  {editingCosmetic === cosmetic ? (
                    <>
                      <input
                        type="text"
                        value={editCosmeticValue}
                        onChange={(e) => setEditCosmeticValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditCosmetic();
                          } else if (e.key === 'Escape') {
                            handleCancelEditCosmetic();
                          }
                        }}
                        className="px-3 py-1 rounded-xl border border-rose-300 bg-white text-sm w-40 text-beige-800 focus:outline-none focus:border-rose-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditCosmetic}
                        className="text-rose-600 hover:text-rose-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-rose-50 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditCosmetic}
                        className="text-beige-500 hover:text-beige-700 disabled:opacity-50 p-1 rounded-full hover:bg-beige-50 transition-colors"
                        title="Zrušiť"
                        disabled={isUpdating}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{cosmetic}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditCosmetic(cosmetic)}
                        className="text-blush-500 hover:text-blush-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-blush-50 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCosmetic(cosmetic)}
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
          <label className="text-sm font-medium text-rose-700">
            Pridať nový kozmetický produkt
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCosmetic}
              onChange={(e) => setNewCosmetic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCosmetic();
                }
              }}
              placeholder="Názov produktu (napr. Šampón, Kondicionér...)"
              className="flex-1 rounded-2xl border border-rose-200 bg-white/80 px-4 py-3 text-beige-800 placeholder-rose-300 focus:bg-white focus:border-rose-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddCosmetic}
              className="px-6 rounded-2xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
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
