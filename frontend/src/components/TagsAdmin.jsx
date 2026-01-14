import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const INITIAL_TAGS = ['Smrdí', 'Pĺzne', 'Kúše'];

function getCustomTags() {
  const stored = localStorage.getItem('dog_groomer_custom_tags');
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with default tags if no tags exist
  saveCustomTags(INITIAL_TAGS);
  return INITIAL_TAGS;
}

function saveCustomTags(tags) {
  localStorage.setItem('dog_groomer_custom_tags', JSON.stringify(tags));
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
  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    setCustomTags(getCustomTags());
  }, []);

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
          // Fetch all dogs
          const allDogs = await api.dogs('');
          
          // Update all dogs that have this tag
          const updatePromises = allDogs
            .filter((dog) => {
              const tags = toTags(dog.grooming_tolerance);
              return tags.includes(tag);
            })
            .map(async (dog) => {
              const tags = toTags(dog.grooming_tolerance);
              const updatedTags = tags.filter((t) => t !== tag);
              return api.updateDog(dog.id, {
                ...dog,
                grooming_tolerance: updatedTags,
              });
            });

          await Promise.all(updatePromises);
          
          const updated = customTags.filter((t) => t !== tag);
          saveCustomTags(updated);
          setCustomTags(updated);
          window.dispatchEvent(new Event('tagsUpdated'));
          if (onTagUpdate) onTagUpdate();
        } catch (error) {
          setAlertMessage('Chyba pri aktualizácii tagov: ' + error.message);
        } finally {
          setIsUpdating(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleStartEdit = (tag) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const handleSaveEdit = async () => {
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
      // Fetch all dogs
      const allDogs = await api.dogs('');
      
      // Update all dogs that have the old tag
      const updatePromises = allDogs
        .filter((dog) => {
          const tags = toTags(dog.grooming_tolerance);
          return tags.includes(editingTag);
        })
        .map(async (dog) => {
          const tags = toTags(dog.grooming_tolerance);
          const updatedTags = tags.map((t) => (t === editingTag ? val : t));
          return api.updateDog(dog.id, {
            ...dog,
            grooming_tolerance: updatedTags,
          });
        });

      await Promise.all(updatePromises);
      
      const updated = customTags.map((t) => (t === editingTag ? val : t));
      saveCustomTags(updated);
      setCustomTags(updated);
      setEditingTag(null);
      setEditValue('');
      window.dispatchEvent(new Event('tagsUpdated'));
      if (onTagUpdate) onTagUpdate();
    } catch (error) {
      setAlertMessage('Chyba pri aktualizácii tagov: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
  };

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-beige-800">Správa tagov</h2>
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
          Aktualizujem tagy vo všetkých psoch...
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

      <div className="space-y-5">
        <div className="space-y-3">
          <label className="text-sm font-medium text-beige-700">
            Tagy
          </label>
          <div className="flex flex-wrap gap-2">
            {customTags.length === 0 ? (
              <p className="text-sm text-beige-400">Zatiaľ žiadne tagy.</p>
            ) : (
              customTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sage-100 text-sage-700 text-sm font-medium border border-sage-200"
                >
                  {editingTag === tag ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="px-3 py-1 rounded-xl border border-sage-300 bg-white text-sm w-28 text-beige-800 focus:outline-none focus:border-blush-300"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="text-sage-600 hover:text-sage-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-sage-50 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
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
                        onClick={() => handleStartEdit(tag)}
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

        <div className="space-y-3 pt-4 border-t border-beige-200">
          <label className="text-sm font-medium text-beige-700">
            Pridať nový tag
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
              placeholder="Názov tagu"
              className="flex-1 rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            />
            <button
              type="button"
              onClick={handleAddTag}
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
