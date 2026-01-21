import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

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
  const [customTags, setCustomTags] = useState([]);
  const [customCharacterTags, setCustomCharacterTags] = useState([]);
  const [customBreeds, setCustomBreeds] = useState([]);
  const [customCosmetics, setCustomCosmetics] = useState([]);
  const [customCommunicationMethods, setCustomCommunicationMethods] = useState([]);
  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editingCharacterTag, setEditingCharacterTag] = useState(null);
  const [editCharacterValue, setEditCharacterValue] = useState('');
  const [editingBreed, setEditingBreed] = useState(null);
  const [editBreedValue, setEditBreedValue] = useState('');
  const [editingCosmetic, setEditingCosmetic] = useState(null);
  const [editCosmeticValue, setEditCosmeticValue] = useState('');
  const [editingCommunicationMethod, setEditingCommunicationMethod] = useState(null);
  const [editCommunicationMethodValue, setEditCommunicationMethodValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCharacterTag, setNewCharacterTag] = useState('');
  const [newBreed, setNewBreed] = useState('');
  const [newCosmetic, setNewCosmetic] = useState('');
  const [newCommunicationMethod, setNewCommunicationMethod] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [cosmeticNotesModal, setCosmeticNotesModal] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Helper to show toast via parent
  const showToast = (message, type = 'success') => {
    if (onToast) {
      onToast(message, type);
    }
  };

  // Load config from database on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        setIsLoading(true);
        const config = await api.getConfig();
        setCustomTags(config.health_tags || []);
        setCustomCharacterTags(config.character_tags || []);
        setCustomBreeds(config.breeds || []);
        setCustomCosmetics(config.cosmetics || []);
        setCustomCommunicationMethods(config.communication_methods || []);
      } catch (error) {
        console.error('Failed to load config:', error);
        showToast('Chyba pri načítavaní konfigurácie', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // --- Tags handlers ---
  const handleAddTag = async () => {
    const val = newTag.trim();
    if (!val) return;
    if (customTags.includes(val)) {
      showToast('Tento tag už existuje.', 'error');
      return;
    }
    const updated = [...customTags, val];
    try {
      await api.setConfigKey('health_tags', updated);
      setCustomTags(updated);
      setNewTag('');
      window.dispatchEvent(new Event('tagsUpdated'));
      showToast('Zdravotný tag bol pridaný');
    } catch (error) {
      console.error('Error adding tag:', error);
      showToast('Chyba pri pridávaní tagu', 'error');
    }
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
          await api.setConfigKey('health_tags', updated);
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
      await api.setConfigKey('health_tags', updated);
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
  const handleAddBreed = async () => {
    const val = newBreed.trim();
    if (!val) return;
    if (customBreeds.includes(val)) {
      showToast('Toto plemeno už existuje.', 'error');
      return;
    }
    const updated = [...customBreeds, val];
    try {
      await api.setConfigKey('breeds', updated);
      setCustomBreeds(updated);
      setNewBreed('');
      window.dispatchEvent(new Event('breedsUpdated'));
      showToast('Plemeno bolo pridané');
    } catch (error) {
      console.error('Error adding breed:', error);
      showToast('Chyba pri pridávaní plemena', 'error');
    }
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
          await api.setConfigKey('breeds', updated);
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
      await api.setConfigKey('breeds', updated);
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
  const handleAddCharacterTag = async () => {
    const val = newCharacterTag.trim();
    if (!val) return;
    if (customCharacterTags.includes(val)) {
      showToast('Tento povahový tag už existuje.', 'error');
      return;
    }
    const updated = [...customCharacterTags, val];
    try {
      await api.setConfigKey('character_tags', updated);
      setCustomCharacterTags(updated);
      setNewCharacterTag('');
      window.dispatchEvent(new Event('characterTagsUpdated'));
      showToast('Povahový tag bol pridaný');
    } catch (error) {
      console.error('Error adding character tag:', error);
      showToast('Chyba pri pridávaní tagu', 'error');
    }
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
          await api.setConfigKey('character_tags', updated);
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
      await api.setConfigKey('character_tags', updated);
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

  // --- Communication Methods handlers ---
  const handleAddCommunicationMethod = async () => {
    const val = newCommunicationMethod.trim();
    if (!val) return;
    if (customCommunicationMethods.includes(val)) {
      showToast('Tento spôsob komunikácie už existuje.', 'error');
      return;
    }
    const updated = [...customCommunicationMethods, val];
    try {
      await api.setConfigKey('communication_methods', updated);
      setCustomCommunicationMethods(updated);
      setNewCommunicationMethod('');
      window.dispatchEvent(new Event('communicationMethodsUpdated'));
      showToast('Spôsob komunikácie bol pridaný');
    } catch (error) {
      console.error('Error adding communication method:', error);
      showToast('Chyba pri pridávaní spôsobu komunikácie', 'error');
    }
  };

  const handleDeleteCommunicationMethod = async (method) => {
    setConfirmDialog({
      message: `Naozaj chcete vymazať spôsob komunikácie "${method}"? Tento spôsob bude odstránený zo všetkých majiteľov, ktorí ho majú.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsUpdating(true);
        try {
          const allOwners = await api.owners('');
          const ownersToUpdate = allOwners.filter((owner) => {
            const methods = owner.communication_methods || [];
            return methods.some((m) => m.method === method);
          });

          for (const owner of ownersToUpdate) {
            const methods = owner.communication_methods || [];
            const updatedMethods = methods.filter((m) => m.method !== method);
            await api.updateOwner(owner.id, {
              name: owner.name,
              communication_methods: updatedMethods,
              important_info: owner.important_info,
            });
          }
          
          const updated = customCommunicationMethods.filter((m) => m !== method);
          await api.setConfigKey('communication_methods', updated);
          setCustomCommunicationMethods(updated);
          window.dispatchEvent(new Event('communicationMethodsUpdated'));
          if (onTagUpdate) onTagUpdate();
          showToast('Spôsob komunikácie bol vymazaný');
        } catch (error) {
          console.error('Error deleting communication method:', error);
          showToast('Chyba pri aktualizácii spôsobov komunikácie: ' + (error.message || 'Neznáma chyba'), 'error');
        } finally {
          setIsUpdating(false);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleStartEditCommunicationMethod = (method) => {
    setEditingCommunicationMethod(method);
    setEditCommunicationMethodValue(method);
  };

  const handleSaveEditCommunicationMethod = async () => {
    const val = editCommunicationMethodValue.trim();
    if (!val) return;
    if (val === editingCommunicationMethod) {
      setEditingCommunicationMethod(null);
      setEditCommunicationMethodValue('');
      return;
    }
    if (customCommunicationMethods.includes(val)) {
      showToast('Tento spôsob komunikácie už existuje.', 'error');
      return;
    }
    
    setIsUpdating(true);
    try {
      const allOwners = await api.owners('');
      const ownersToUpdate = allOwners.filter((owner) => {
        const methods = owner.communication_methods || [];
        return methods.some((m) => m.method === editingCommunicationMethod);
      });

      for (const owner of ownersToUpdate) {
        const methods = owner.communication_methods || [];
        const updatedMethods = methods.map((m) =>
          m.method === editingCommunicationMethod ? { ...m, method: val } : m
        );
        await api.updateOwner(owner.id, {
          name: owner.name,
          communication_methods: updatedMethods,
          important_info: owner.important_info,
        });
      }
      
      const updated = customCommunicationMethods.map((m) => (m === editingCommunicationMethod ? val : m));
      await api.setConfigKey('communication_methods', updated);
      setCustomCommunicationMethods(updated);
      setEditingCommunicationMethod(null);
      setEditCommunicationMethodValue('');
      window.dispatchEvent(new Event('communicationMethodsUpdated'));
      if (onTagUpdate) onTagUpdate();
      showToast('Spôsob komunikácie bol upravený');
    } catch (error) {
      console.error('Error updating communication methods:', error);
      showToast('Chyba pri aktualizácii spôsobov komunikácie: ' + (error.message || 'Neznáma chyba'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEditCommunicationMethod = () => {
    setEditingCommunicationMethod(null);
    setEditCommunicationMethodValue('');
  };

  // --- Cosmetics handlers ---
  const handleAddCosmetic = async () => {
    const val = newCosmetic.trim();
    if (!val) return;
    if (customCosmetics.includes(val)) {
      showToast('Táto kozmetika už existuje.', 'error');
      return;
    }
    const updated = [...customCosmetics, val];
    try {
      await api.setConfigKey('cosmetics', updated);
      setCustomCosmetics(updated);
      setNewCosmetic('');
      window.dispatchEvent(new Event('cosmeticsUpdated'));
      showToast('Kozmetický produkt bol pridaný');
    } catch (error) {
      console.error('Error adding cosmetic:', error);
      showToast('Chyba pri pridávaní kozmetiky', 'error');
    }
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
          await api.setConfigKey('cosmetics', updated);
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
      await api.setConfigKey('cosmetics', updated);
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

  const handleViewCosmeticNotes = async (cosmetic) => {
    setLoadingNotes(true);
    try {
      const allDogs = await api.dogs('');
      const notesData = [];
      
      for (const dog of allDogs) {
        const cosmetics = dog.cosmetics_used || [];
        const found = cosmetics.find((c) => c.product === cosmetic);
        if (found && found.notes && found.notes.trim()) {
          notesData.push({
            dogId: dog.id,
            dogName: dog.name,
            ownerName: dog.owner_name || 'Neznámy majiteľ',
            notes: found.notes,
          });
        }
      }
      
      setCosmeticNotesModal({
        cosmetic,
        notes: notesData,
      });
    } catch (error) {
      console.error('Error loading cosmetic notes:', error);
      showToast('Chyba pri načítavaní poznámok: ' + (error.message || 'Neznáma chyba'), 'error');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleCloseCosmeticNotesModal = () => {
    setCosmeticNotesModal(null);
  };

  if (isLoading) {
    return (
      <div className="card space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-light text-sand-800">Konfigurácia hodnôt</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-peach-500 border-t-transparent"></div>
          <span className="ml-3 text-sand-600">Načítavam konfiguráciu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-sand-800">Konfigurácia hodnôt</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sand-600 hover:text-sand-700 text-sm px-4 py-2 rounded-full hover:bg-sand-100 transition-colors"
            disabled={isUpdating}
          >
            Zavrieť
          </button>
        )}
      </div>

      {isUpdating && (
        <div className="bg-peach-50 border border-peach-200 rounded-2xl p-4 text-sm text-peach-700">
          Aktualizujem hodnoty vo všetkých psoch...
        </div>
      )}

      {/* Health Tags Section */}
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
            </svg>
            <label className="text-sm font-semibold text-sand-700">
              Zdravotné tagy
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customTags.length === 0 ? (
              <p className="text-sm text-sand-400">Zatiaľ žiadne tagy.</p>
            ) : (
              customTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-50 text-peach-700 text-sm font-medium border border-peach-200"
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
                        className="px-3 py-1 rounded-xl border border-peach-300 bg-white text-sm w-28 text-sand-800 focus:outline-none focus:border-peach-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditTag}
                        className="text-peach-600 hover:text-peach-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditTag}
                        className="text-sand-500 hover:text-sand-700 disabled:opacity-50 p-1 rounded-full hover:bg-sand-100 transition-colors"
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
                        className="text-peach-500 hover:text-peach-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag)}
                        className="text-peach-400 hover:text-peach-500 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
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
          <label className="text-sm font-medium text-sand-600">
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
              className="flex-1 rounded-2xl border border-sand-300 bg-white/80 px-4 py-3 text-sand-800 placeholder-sand-400 focus:bg-white focus:border-peach-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-6 rounded-2xl bg-peach-500 text-white text-sm font-medium hover:bg-peach-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
          </div>
        </div>
      </div>

      {/* Character Tags Section */}
      <div className="space-y-5 pt-6 border-t border-sand-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <label className="text-sm font-semibold text-sand-700">
              Povahové tagy
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customCharacterTags.length === 0 ? (
              <p className="text-sm text-sand-400">Zatiaľ žiadne povahové tagy.</p>
            ) : (
              customCharacterTags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-100 text-peach-800 text-sm font-medium border border-peach-200"
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
                        className="px-3 py-1 rounded-xl border border-peach-300 bg-white text-sm w-28 text-sand-800 focus:outline-none focus:border-peach-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditCharacterTag}
                        className="text-peach-600 hover:text-peach-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditCharacterTag}
                        className="text-sand-500 hover:text-sand-700 disabled:opacity-50 p-1 rounded-full hover:bg-sand-100 transition-colors"
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
                        className="text-peach-500 hover:text-peach-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCharacterTag(tag)}
                        className="text-peach-400 hover:text-peach-500 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
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
          <label className="text-sm font-medium text-sand-600">
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
              className="flex-1 rounded-2xl border border-sand-300 bg-white/80 px-4 py-3 text-sand-800 placeholder-sand-400 focus:bg-white focus:border-peach-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddCharacterTag}
              className="px-6 rounded-2xl bg-peach-500 text-white text-sm font-medium hover:bg-peach-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
          </div>
        </div>
      </div>

      {/* Communication Methods Section */}
      <div className="space-y-5 pt-6 border-t border-sand-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <label className="text-sm font-semibold text-sand-700">
              Spôsoby komunikácie
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customCommunicationMethods.length === 0 ? (
              <p className="text-sm text-sand-400">Zatiaľ žiadne spôsoby komunikácie.</p>
            ) : (
              customCommunicationMethods.map((method) => (
                <div
                  key={method}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sand-100 text-sand-700 text-sm font-medium border border-sand-300"
                >
                  {editingCommunicationMethod === method ? (
                    <>
                      <input
                        type="text"
                        value={editCommunicationMethodValue}
                        onChange={(e) => setEditCommunicationMethodValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditCommunicationMethod();
                          } else if (e.key === 'Escape') {
                            handleCancelEditCommunicationMethod();
                          }
                        }}
                        className="px-3 py-1 rounded-xl border border-sand-300 bg-white text-sm w-28 text-sand-800 focus:outline-none focus:border-peach-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditCommunicationMethod}
                        className="text-peach-600 hover:text-peach-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditCommunicationMethod}
                        className="text-sand-500 hover:text-sand-700 disabled:opacity-50 p-1 rounded-full hover:bg-sand-100 transition-colors"
                        title="Zrušiť"
                        disabled={isUpdating}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{method}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditCommunicationMethod(method)}
                        className="text-peach-500 hover:text-peach-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCommunicationMethod(method)}
                        className="text-peach-400 hover:text-peach-500 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
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
          <label className="text-sm font-medium text-sand-600">
            Pridať nový spôsob komunikácie
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCommunicationMethod}
              onChange={(e) => setNewCommunicationMethod(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCommunicationMethod();
                }
              }}
              placeholder="Názov (napr. WhatsApp, Instagram, Phone...)"
              className="flex-1 rounded-2xl border border-sand-300 bg-white/80 px-4 py-3 text-sand-800 placeholder-sand-400 focus:bg-white focus:border-peach-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddCommunicationMethod}
              className="px-6 rounded-2xl bg-peach-500 text-white text-sm font-medium hover:bg-peach-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
          </div>
        </div>
      </div>

      {/* Breeds Section */}
      <div className="space-y-5 pt-6 border-t border-sand-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <label className="text-sm font-semibold text-sand-700">
              Plemená
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customBreeds.length === 0 ? (
              <p className="text-sm text-sand-400">Zatiaľ žiadne plemená.</p>
            ) : (
              customBreeds.map((breed) => (
                <div
                  key={breed}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-50 text-peach-700 text-sm font-medium border border-peach-200"
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
                        className="px-3 py-1 rounded-xl border border-peach-300 bg-white text-sm w-36 text-sand-800 focus:outline-none focus:border-peach-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditBreed}
                        className="text-peach-600 hover:text-peach-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditBreed}
                        className="text-sand-500 hover:text-sand-700 disabled:opacity-50 p-1 rounded-full hover:bg-sand-100 transition-colors"
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
                        className="text-peach-500 hover:text-peach-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBreed(breed)}
                        className="text-peach-400 hover:text-peach-500 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
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
          <label className="text-sm font-medium text-sand-600">
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
              className="flex-1 rounded-2xl border border-sand-300 bg-white/80 px-4 py-3 text-sand-800 placeholder-sand-400 focus:bg-white focus:border-peach-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddBreed}
              className="px-6 rounded-2xl bg-peach-500 text-white text-sm font-medium hover:bg-peach-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              disabled={isUpdating}
            >
              Pridať
            </button>
          </div>
        </div>
      </div>

      {/* Cosmetics Section */}
      <div className="space-y-5 pt-6 border-t border-sand-200">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 1-10-10M12 22a10 10 0 0 0 10-10"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            <label className="text-sm font-semibold text-sand-700">
              Kozmetické produkty
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {customCosmetics.length === 0 ? (
              <p className="text-sm text-sand-400">Zatiaľ žiadne kozmetické produkty.</p>
            ) : (
              customCosmetics.map((cosmetic) => (
                <div
                  key={cosmetic}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-100 text-peach-800 text-sm font-medium border border-peach-200"
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
                        className="px-3 py-1 rounded-xl border border-peach-300 bg-white text-sm w-40 text-sand-800 focus:outline-none focus:border-peach-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditCosmetic}
                        className="text-peach-600 hover:text-peach-700 font-medium disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Uložiť"
                        disabled={isUpdating}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditCosmetic}
                        className="text-sand-500 hover:text-sand-700 disabled:opacity-50 p-1 rounded-full hover:bg-sand-100 transition-colors"
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
                        onClick={() => handleViewCosmeticNotes(cosmetic)}
                        className="text-peach-500 hover:text-peach-600 ml-1 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Zobraziť poznámky"
                        disabled={isUpdating || loadingNotes}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditCosmetic(cosmetic)}
                        className="text-peach-500 hover:text-peach-600 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
                        title="Upraviť"
                        disabled={isUpdating}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCosmetic(cosmetic)}
                        className="text-peach-400 hover:text-peach-500 disabled:opacity-50 p-1 rounded-full hover:bg-peach-100 transition-colors"
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
          <label className="text-sm font-medium text-sand-600">
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
              className="flex-1 rounded-2xl border border-sand-300 bg-white/80 px-4 py-3 text-sand-800 placeholder-sand-400 focus:bg-white focus:border-peach-400 transition-all"
            />
            <button
              type="button"
              onClick={handleAddCosmetic}
              className="px-6 rounded-2xl bg-peach-500 text-white text-sm font-medium hover:bg-peach-600 shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
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

      {/* Cosmetic Notes Modal */}
      {cosmeticNotesModal && (
        <div className="fixed inset-0 bg-sand-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-5 border-b border-sand-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-peach-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-peach-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-sand-800">Poznámky k produktu</h3>
                  <p className="text-sm text-peach-600 font-medium">{cosmeticNotesModal.cosmetic}</p>
                </div>
              </div>
              <button
                onClick={handleCloseCosmeticNotesModal}
                className="text-sand-400 hover:text-sand-600 p-2 rounded-full hover:bg-sand-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {cosmeticNotesModal.notes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <p className="text-sand-500 text-sm">Zatiaľ žiadne poznámky k tomuto produktu.</p>
                  <p className="text-sand-400 text-xs mt-1">Poznámky sa zobrazia keď pridáte komentár k produktu pri niektorom psovi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cosmeticNotesModal.notes.map((item, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-peach-50 to-sand-50 rounded-2xl p-4 border border-peach-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-peach-200 flex items-center justify-center text-peach-700 text-sm font-bold">
                          {item.dogName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-sand-800">{item.dogName}</p>
                          <p className="text-xs text-sand-500">{item.ownerName}</p>
                        </div>
                      </div>
                      <div 
                        className="text-sm text-sand-700 bg-white/70 rounded-xl p-3 border border-peach-100"
                        dangerouslySetInnerHTML={{ __html: item.notes }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-sand-100 bg-sand-50/50 rounded-b-3xl">
              <div className="flex items-center justify-between">
                <p className="text-xs text-sand-500">
                  {cosmeticNotesModal.notes.length} {cosmeticNotesModal.notes.length === 1 ? 'poznámka' : cosmeticNotesModal.notes.length >= 2 && cosmeticNotesModal.notes.length <= 4 ? 'poznámky' : 'poznámok'}
                </p>
                <button
                  onClick={handleCloseCosmeticNotesModal}
                  className="px-5 py-2 rounded-xl bg-peach-500 text-white text-sm font-medium hover:bg-peach-600 transition-colors"
                >
                  Zavrieť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for notes */}
      {loadingNotes && (
        <div className="fixed inset-0 bg-sand-900/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-peach-500 border-t-transparent"></div>
            <span className="text-sm text-sand-700">Načítavam poznámky...</span>
          </div>
        </div>
      )}
    </div>
  );
}
