import { useState, useEffect, useRef } from 'react';
import { toTags } from '../utils/helpers.js';

function toAgeYears(dateStr) {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  const now = new Date();
  const diff = now - birth;
  const years = diff / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.round(years));
}

function ageToDate(age) {
  if (!age && age !== 0) return '';
  const years = Number(age);
  if (Number.isNaN(years)) return '';
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function DogForm({ 
  owners, 
  initial, 
  onSubmit, 
  onCancel, 
  onOpenTagsAdmin,
  availableTags = [],
  availableCharacterTags = [],
  availableBreeds = [],
  availableCosmetics = [],
}) {
  const [form, setForm] = useState({
    owner_ids: [],
    name: '',
    breed: '',
    weight: '',
    age: '',
    grooming_tolerance: [],
    behavior_notes: '',
    health_notes: '',
    character_tags: [],
    character_notes: '',
    cosmetics_used: [],
    grooming_time_minutes: '',
  });
  const [newOwner, setNewOwner] = useState({
    name: '',
  });
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [isBreedDropdownOpen, setIsBreedDropdownOpen] = useState(false);
  const ownerDropdownRef = useRef(null);
  const breedDropdownRef = useRef(null);
  const notesRef = useRef(null);
  const healthNotesRef = useRef(null);
  const characterNotesRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target)) {
        setIsOwnerDropdownOpen(false);
      }
      if (breedDropdownRef.current && !breedDropdownRef.current.contains(event.target)) {
        setIsBreedDropdownOpen(false);
      }
    };
    if (isOwnerDropdownOpen || isBreedDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOwnerDropdownOpen, isBreedDropdownOpen]);

  useEffect(() => {
    if (initial) {
      // Handle both old format (owner_id) and new format (owners array)
      let ownerIds = [];
      if (Array.isArray(initial.owners)) {
        ownerIds = initial.owners.map(o => o.id);
      } else if (initial.owner_id) {
        ownerIds = [initial.owner_id];
      }
      
      setForm({
        owner_ids: ownerIds,
        name: initial.name || '',
        breed: initial.breed || '',
        weight: initial.weight || '',
        age: toAgeYears(initial.birthdate),
        grooming_tolerance: toTags(initial.grooming_tolerance).length
          ? toTags(initial.grooming_tolerance)
          : [],
        behavior_notes: initial.behavior_notes || '',
        health_notes: initial.health_notes || '',
        character_tags: toTags(initial.character_tags).length
          ? toTags(initial.character_tags)
          : [],
        character_notes: initial.character_notes || '',
        cosmetics_used: Array.isArray(initial.cosmetics_used) ? initial.cosmetics_used : [],
        grooming_time_minutes: initial.grooming_time_minutes || '',
      });
      setTimeout(() => {
        if (notesRef.current && initial.behavior_notes) {
          notesRef.current.innerHTML = initial.behavior_notes;
        }
        if (healthNotesRef.current && initial.health_notes) {
          healthNotesRef.current.innerHTML = initial.health_notes;
        }
        if (characterNotesRef.current && initial.character_notes) {
          characterNotesRef.current.innerHTML = initial.character_notes;
        }
      }, 0);
    } else {
      setForm((f) => ({ ...f, owner_ids: [], grooming_tolerance: [], health_notes: '', character_tags: [], character_notes: '', cosmetics_used: [] }));
      setTimeout(() => {
        if (notesRef.current) notesRef.current.innerHTML = '';
        if (healthNotesRef.current) healthNotesRef.current.innerHTML = '';
        if (characterNotesRef.current) characterNotesRef.current.innerHTML = '';
      }, 0);
    }
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleOwnerToggle = (ownerId) => {
    setForm((f) => {
      const current = f.owner_ids || [];
      if (current.includes(ownerId)) {
        return { ...f, owner_ids: current.filter(id => id !== ownerId) };
      }
      return { ...f, owner_ids: [...current, ownerId] };
    });
  };

  const getSelectedOwnersText = () => {
    if (!form.owner_ids || form.owner_ids.length === 0) return 'Vyberte majiteľov';
    const selectedOwners = owners.filter(o => form.owner_ids.includes(o.id));
    if (selectedOwners.length === 0) return 'Vyberte majiteľov';
    if (selectedOwners.length === 1) return selectedOwners[0].name;
    return `${selectedOwners.length} majitelia`;
  };

  const handleTagToggle = (tag) => {
    setForm((f) => {
      const current = toTags(f.grooming_tolerance);
      const exists = current.includes(tag);
      return {
        ...f,
        grooming_tolerance: exists
          ? current.filter((t) => t !== tag)
          : [...current, tag],
      };
    });
  };


  const handleNotesInput = () => {
    const html = notesRef.current ? notesRef.current.innerHTML : '';
    setForm((f) => ({ ...f, behavior_notes: html }));
  };

  const handleHealthNotesInput = () => {
    const html = healthNotesRef.current ? healthNotesRef.current.innerHTML : '';
    setForm((f) => ({ ...f, health_notes: html }));
  };

  const handleCharacterTagToggle = (tag) => {
    setForm((f) => {
      const current = toTags(f.character_tags);
      const exists = current.includes(tag);
      return {
        ...f,
        character_tags: exists
          ? current.filter((t) => t !== tag)
          : [...current, tag],
      };
    });
  };

  const handleCharacterNotesInput = () => {
    const html = characterNotesRef.current ? characterNotesRef.current.innerHTML : '';
    setForm((f) => ({ ...f, character_notes: html }));
  };

  const handleCosmeticToggle = (product) => {
    setForm((f) => {
      const current = f.cosmetics_used || [];
      const exists = current.find((c) => c.product === product);
      if (exists) {
        return {
          ...f,
          cosmetics_used: current.filter((c) => c.product !== product),
        };
      }
      return {
        ...f,
        cosmetics_used: [...current, { product, notes: '' }],
      };
    });
  };

  const handleCosmeticNotesChange = (product, notes) => {
    setForm((f) => {
      const current = f.cosmetics_used || [];
      return {
        ...f,
        cosmetics_used: current.map((c) =>
          c.product === product ? { ...c, notes } : c
        ),
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const birthdate = ageToDate(form.age);
    const payload = {
      ...form,
      owner_ids: form.owner_ids || [],
      weight: form.weight ? Number(form.weight) : null,
      birthdate: birthdate || null,
      behavior_notes: notesRef.current?.innerHTML || '',
      health_notes: healthNotesRef.current?.innerHTML || '',
      character_notes: characterNotesRef.current?.innerHTML || '',
      cosmetics_used: form.cosmetics_used || [],
      grooming_time_minutes: form.grooming_time_minutes ? Number(form.grooming_time_minutes) : null,
    };
    const ownerPayload = newOwner.name ? newOwner : null;
    onSubmit({ dog: payload, newOwner: ownerPayload });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      {/* Duplicate buttons at top for better UX */}
      <div className="flex gap-3 pb-4 border-b border-beige-200">
        <button
          type="submit"
          className="flex-1 bg-blush-400 text-white font-medium rounded-2xl py-3 hover:bg-blush-500 shadow-sm hover:shadow-md transition-all"
        >
          Uložiť psa
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-beige-600 hover:text-beige-700 px-6 py-3 rounded-2xl hover:bg-beige-50 transition-colors"
          >
            Zrušiť
          </button>
        )}
      </div>
      <div className="space-y-3">
        <label className="text-sm font-medium text-beige-700">Majitelia</label>
        <div className="grid grid-cols-1 gap-3">
          <div className="relative" ref={ownerDropdownRef}>
            <button
              type="button"
              onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
              className={`w-full rounded-2xl border px-4 py-3 pr-10 text-left text-beige-800 transition-all ${
                isOwnerDropdownOpen
                  ? 'bg-white border-blush-300 ring-2 ring-blush-200'
                  : 'border-beige-300 bg-white/80 hover:bg-white focus:bg-white focus:border-blush-300'
              } ${!form.owner_ids || form.owner_ids.length === 0 ? 'text-beige-400' : ''}`}
            >
              {getSelectedOwnersText()}
            </button>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className={`w-5 h-5 text-beige-500 transition-transform ${isOwnerDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            {isOwnerDropdownOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-beige-300 shadow-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <p className="px-4 py-2 text-xs text-beige-500 bg-beige-50 border-b border-beige-200">
                    Vyberte jedného alebo viacerých majiteľov
                  </p>
                  {owners.map((o) => {
                    const isSelected = (form.owner_ids || []).includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleOwnerToggle(o.id)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-blush-50 text-blush-700'
                            : 'text-beige-700 hover:bg-blush-50 hover:text-blush-700'
                        }`}
                      >
                        <span>{o.name}</span>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blush-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Show selected owners as chips */}
          {form.owner_ids && form.owner_ids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.owner_ids.map((ownerId) => {
                const owner = owners.find(o => o.id === ownerId);
                if (!owner) return null;
                return (
                  <span
                    key={ownerId}
                    className="px-3 py-1.5 rounded-full bg-blush-100 text-blush-700 text-sm font-medium flex items-center gap-1.5"
                  >
                    {owner.name}
                    <button
                      type="button"
                      onClick={() => handleOwnerToggle(ownerId)}
                      className="text-blush-400 hover:text-blush-600 rounded-full hover:bg-blush-200 p-0.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Add new owner section */}
          <div className="border-t border-beige-200 pt-3 mt-1">
            <p className="text-xs text-beige-500 mb-2">Alebo pridajte nového majiteľa:</p>
            <input
              className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
              placeholder="Meno nového majiteľa"
              value={newOwner.name}
              onChange={(e) => setNewOwner((o) => ({ ...o, name: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-beige-700">Meno psa</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-beige-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-peach-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Plemeno
            </label>
            <div className="relative" ref={breedDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBreedDropdownOpen(!isBreedDropdownOpen)}
                className={`w-full rounded-2xl border px-4 py-3 pr-10 text-left text-beige-800 transition-all ${
                  isBreedDropdownOpen
                    ? 'bg-white border-peach-300 ring-2 ring-peach-200'
                    : 'border-peach-200 bg-white/80 hover:bg-white focus:bg-white focus:border-peach-300'
                } ${!form.breed ? 'text-beige-400' : ''}`}
              >
                {form.breed || 'Vyberte plemeno'}
              </button>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className={`w-5 h-5 text-peach-500 transition-transform ${isBreedDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              {isBreedDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-peach-200 shadow-lg overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, breed: '' }));
                        setIsBreedDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        !form.breed
                          ? 'bg-peach-50 text-peach-700'
                          : 'text-beige-700 hover:bg-peach-50 hover:text-peach-700'
                      }`}
                    >
                      Bez plemena
                    </button>
                    {availableBreeds.map((breed) => (
                      <button
                        key={breed}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, breed }));
                          setIsBreedDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                          form.breed === breed
                            ? 'bg-peach-50 text-peach-700'
                            : 'text-beige-700 hover:bg-peach-50 hover:text-peach-700'
                        }`}
                      >
                        {breed}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-beige-700">Hmotnosť (kg)</label>
            <input
              name="weight"
              inputMode="decimal"
              value={form.weight}
              onChange={handleChange}
              className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-beige-700">Vek (roky)</label>
            <input
              name="age"
              inputMode="numeric"
              value={form.age}
              onChange={handleChange}
              className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-beige-700">Priemerný čas strávený na psovi (min)</label>
            <input
              name="grooming_time_minutes"
              type="number"
              inputMode="numeric"
              min="0"
              value={form.grooming_time_minutes}
              onChange={handleChange}
              className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
              placeholder="napr. 45"
            />
          </div>
        </div>
        {/* Dôležité info Section */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t-2 border-dashed border-peach-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 py-1 text-sm font-bold text-peach-700 uppercase tracking-wider flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Dôležité info
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-peach-100 via-peach-50 to-sand-50 rounded-3xl p-5 border-2 border-peach-200 shadow-sm">
          <div className="border-2 border-peach-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-peach-100 to-sand-50 border-b border-peach-200">
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-peach-700 transition-colors"
                title="Tučné"
                onClick={(e) => {
                  e.preventDefault();
                  if (notesRef.current) {
                    notesRef.current.focus();
                    document.execCommand('bold', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-peach-700 transition-colors"
                title="Kurzíva"
                onClick={(e) => {
                  e.preventDefault();
                  if (notesRef.current) {
                    notesRef.current.focus();
                    document.execCommand('italic', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 4h4M6 20h8M8 4v16M14 4v16"
                  />
                </svg>
              </button>
              <div className="w-px h-5 bg-peach-300 mx-1" />
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-peach-700 transition-colors"
                title="Zoznam s odrážkami"
                onClick={(e) => {
                  e.preventDefault();
                  if (notesRef.current) {
                    notesRef.current.focus();
                    const selection = window.getSelection();
                    let range;
                    if (selection.rangeCount === 0) {
                      range = document.createRange();
                      const textNode = document.createTextNode('\u2022 ');
                      range.insertNode(textNode);
                      range.setStartAfter(textNode);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    } else {
                      range = selection.getRangeAt(0);
                      const text = range.toString() || '\u2022 ';
                      const lines = text.split('\n').filter((l) => l.trim());
                      if (lines.length === 0) {
                        const textNode = document.createTextNode('\u2022 ');
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.collapse(true);
                      } else {
                        const list = document.createElement('ul');
                        list.style.marginLeft = '20px';
                        list.style.paddingLeft = '20px';
                        lines.forEach((line) => {
                          const li = document.createElement('li');
                          li.textContent = line.trim();
                          list.appendChild(li);
                        });
                        range.deleteContents();
                        range.insertNode(list);
                        const newRange = document.createRange();
                        newRange.setStartAfter(list.lastChild);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                      }
                    }
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <circle cx="6" cy="7" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="17" r="1.5" fill="currentColor" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 7h10M10 12h10M10 17h10"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-peach-700 transition-colors flex items-center justify-center"
                title="Číslovaný zoznam"
                onClick={(e) => {
                  e.preventDefault();
                  if (notesRef.current) {
                    notesRef.current.focus();
                    const selection = window.getSelection();
                    let range;
                    if (selection.rangeCount === 0) {
                      range = document.createRange();
                      const textNode = document.createTextNode('1. ');
                      range.insertNode(textNode);
                      range.setStartAfter(textNode);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    } else {
                      range = selection.getRangeAt(0);
                      const text = range.toString() || '1. ';
                      const lines = text.split('\n').filter((l) => l.trim());
                      if (lines.length === 0) {
                        const textNode = document.createTextNode('1. ');
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.collapse(true);
                      } else {
                        const list = document.createElement('ol');
                        list.style.marginLeft = '20px';
                        list.style.paddingLeft = '20px';
                        lines.forEach((line) => {
                          const li = document.createElement('li');
                          li.textContent = line.trim();
                          list.appendChild(li);
                        });
                        range.deleteContents();
                        range.insertNode(list);
                        const newRange = document.createRange();
                        newRange.setStartAfter(list.lastChild);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                      }
                    }
                  }
                }}
              >
                <div className="flex flex-col items-start leading-none text-[10px] font-bold font-mono">
                  <span>1.</span>
                  <span>2.</span>
                  <span>3.</span>
                </div>
              </button>
            </div>
            <div
              ref={notesRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full px-4 py-3 min-h-[160px] bg-white focus:outline-none prose prose-sm max-w-none text-sand-900"
              onInput={handleNotesInput}
              placeholder="Sem napíš všetko dôležité..."
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            />
          </div>
        </div>
      </div>

      {/* Zdravie Section - Visually Separated */}
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-dashed border-peach-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 py-1 text-sm font-semibold text-peach-600 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
            </svg>
            Zdravie
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-peach-50 to-sand-50 rounded-3xl p-6 border border-peach-100 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-sand-700">Zdravotné tagy</label>
            {onOpenTagsAdmin && (
              <button
                type="button"
                onClick={onOpenTagsAdmin}
                className="text-peach-500 hover:text-peach-600 transition-colors px-3 py-1.5 rounded-full hover:bg-peach-100 text-xs font-medium flex items-center gap-1.5"
                title="Spravovať tagy"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Spravovať
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  toTags(form.grooming_tolerance).includes(tag)
                    ? 'bg-peach-200 text-sand-800 border-peach-300 shadow-sm'
                    : 'border-peach-200 text-peach-600 hover:border-peach-300 hover:bg-peach-100/80 bg-white/60'
                }`}
              >
                {tag}
              </button>
            ))}
            {toTags(form.grooming_tolerance)
              .filter((t) => !availableTags.includes(t))
              .map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-100 text-sand-700 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-peach-500 hover:text-sand-700 rounded-full hover:bg-peach-200 p-0.5"
                    onClick={() => handleTagToggle(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            {availableTags.length === 0 && toTags(form.grooming_tolerance).length === 0 && (
              <p className="text-sm text-sand-400 italic">Žiadne zdravotné tagy k dispozícii</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-sand-700">Zdravotné poznámky</label>
          <div className="border border-peach-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-peach-50 to-sand-50 border-b border-peach-100">
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-sand-700 transition-colors"
                title="Tučné"
                onClick={(e) => {
                  e.preventDefault();
                  if (healthNotesRef.current) {
                    healthNotesRef.current.focus();
                    document.execCommand('bold', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
              </button>
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-sand-700 transition-colors"
                title="Kurzíva"
                onClick={(e) => {
                  e.preventDefault();
                  if (healthNotesRef.current) {
                    healthNotesRef.current.focus();
                    document.execCommand('italic', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4M6 20h8M8 4v16M14 4v16" />
                </svg>
              </button>
              <div className="w-px h-5 bg-peach-200 mx-1" />
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-sand-700 transition-colors"
                title="Zoznam s odrážkami"
                onClick={(e) => {
                  e.preventDefault();
                  if (healthNotesRef.current) {
                    healthNotesRef.current.focus();
                    document.execCommand('insertUnorderedList', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <circle cx="6" cy="7" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="17" r="1.5" fill="currentColor" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 7h10M10 12h10M10 17h10" />
                </svg>
              </button>
            </div>
            <div
              ref={healthNotesRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full px-4 py-3 min-h-[100px] bg-white focus:outline-none prose prose-sm max-w-none text-sand-800"
              onInput={handleHealthNotesInput}
              placeholder="Alergie, lieky, zdravotné problémy..."
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            />
          </div>
        </div>
      </div>

      {/* Povaha Section - Visually Separated */}
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-dashed border-peach-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 py-1 text-sm font-semibold text-peach-600 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            Povaha
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-peach-100/60 to-sand-50 rounded-3xl p-6 border border-peach-100 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-sand-700">Povahové tagy</label>
            {onOpenTagsAdmin && (
              <button
                type="button"
                onClick={onOpenTagsAdmin}
                className="text-peach-500 hover:text-peach-600 transition-colors px-3 py-1.5 rounded-full hover:bg-peach-100 text-xs font-medium flex items-center gap-1.5"
                title="Spravovať tagy"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Spravovať
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCharacterTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleCharacterTagToggle(tag)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  toTags(form.character_tags).includes(tag)
                    ? 'bg-peach-200 text-sand-800 border-peach-300 shadow-sm'
                    : 'border-peach-200 text-peach-600 hover:border-peach-300 hover:bg-peach-100/80 bg-white/60'
                }`}
              >
                {tag}
              </button>
            ))}
            {toTags(form.character_tags)
              .filter((t) => !availableCharacterTags.includes(t))
              .map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-100 text-sand-700 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-peach-500 hover:text-sand-700 rounded-full hover:bg-peach-200 p-0.5"
                    onClick={() => handleCharacterTagToggle(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            {availableCharacterTags.length === 0 && toTags(form.character_tags).length === 0 && (
              <p className="text-sm text-sand-400 italic">Žiadne povahové tagy k dispozícii</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-sand-700">Povahové poznámky</label>
          <div className="border border-peach-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-peach-50 to-sand-50 border-b border-peach-100">
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-sand-700 transition-colors"
                title="Tučné"
                onClick={(e) => {
                  e.preventDefault();
                  if (characterNotesRef.current) {
                    characterNotesRef.current.focus();
                    document.execCommand('bold', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
              </button>
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-sand-700 transition-colors"
                title="Kurzíva"
                onClick={(e) => {
                  e.preventDefault();
                  if (characterNotesRef.current) {
                    characterNotesRef.current.focus();
                    document.execCommand('italic', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4M6 20h8M8 4v16M14 4v16" />
                </svg>
              </button>
              <div className="w-px h-5 bg-peach-200 mx-1" />
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-peach-600 hover:text-sand-700 transition-colors"
                title="Zoznam s odrážkami"
                onClick={(e) => {
                  e.preventDefault();
                  if (characterNotesRef.current) {
                    characterNotesRef.current.focus();
                    document.execCommand('insertUnorderedList', false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <circle cx="6" cy="7" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="6" cy="17" r="1.5" fill="currentColor" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 7h10M10 12h10M10 17h10" />
                </svg>
              </button>
            </div>
            <div
              ref={characterNotesRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full px-4 py-3 min-h-[100px] bg-white focus:outline-none prose prose-sm max-w-none text-sand-800"
              onInput={handleCharacterNotesInput}
              placeholder="Správanie, temperament, zvláštnosti..."
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
              }}
            />
          </div>
        </div>
      </div>

      {/* Kozmetika Section - Visually Separated */}
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-dashed border-sand-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 py-1 text-sm font-semibold text-peach-600 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 10 10M12 2a10 10 0 0 0-10 10M12 22a10 10 0 0 1-10-10M12 22a10 10 0 0 0 10-10"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            Kozmetika
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-sand-100/80 to-sand-50 rounded-3xl p-6 border border-sand-200 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-peach-700">Použité kozmetické produkty</label>
            {onOpenTagsAdmin && (
              <button
                type="button"
                onClick={onOpenTagsAdmin}
                className="text-peach-500 hover:text-peach-600 transition-colors px-3 py-1.5 rounded-full hover:bg-peach-100 text-xs font-medium flex items-center gap-1.5"
                title="Spravovať produkty"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Spravovať
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCosmetics.map((product) => {
              const isSelected = (form.cosmetics_used || []).some((c) => c.product === product);
              return (
                <button
                  key={product}
                  type="button"
                  onClick={() => handleCosmeticToggle(product)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-peach-200 text-sand-800 border-peach-300 shadow-sm'
                      : 'border-sand-300 text-peach-600 hover:border-peach-300 hover:bg-peach-100/80 bg-white/60'
                  }`}
                >
                  {product}
                </button>
              );
            })}
            {(form.cosmetics_used || [])
              .filter((c) => !availableCosmetics.includes(c.product))
              .map((cosmetic) => (
                <span
                  key={cosmetic.product}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-peach-100 text-peach-700 text-sm font-medium"
                >
                  {cosmetic.product}
                  <button
                    type="button"
                    className="text-peach-500 hover:text-peach-700 rounded-full hover:bg-peach-200 p-0.5"
                    onClick={() => handleCosmeticToggle(cosmetic.product)}
                  >
                    ×
                  </button>
                </span>
              ))}
            {availableCosmetics.length === 0 && (form.cosmetics_used || []).length === 0 && (
              <p className="text-sm text-sand-400 italic">Žiadne kozmetické produkty k dispozícii</p>
            )}
          </div>
        </div>

        {/* Notes for each selected cosmetic */}
        {(form.cosmetics_used || []).length > 0 && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-peach-700">Poznámky k použitiu</label>
            {(form.cosmetics_used || []).map((cosmetic) => (
              <div key={cosmetic.product} className="bg-white/60 rounded-2xl p-4 border border-sand-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-peach-700">{cosmetic.product}</span>
                </div>
                <input
                  type="text"
                  value={cosmetic.notes || ''}
                  onChange={(e) => handleCosmeticNotesChange(cosmetic.product, e.target.value)}
                  placeholder="Ako bol produkt použitý, riedenie, množstvo..."
                  className="w-full rounded-xl border border-sand-300 bg-white px-4 py-2.5 text-sm text-sand-800 placeholder-sand-400 focus:bg-white focus:border-peach-400 focus:outline-none transition-all"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-blush-400 text-white font-medium rounded-2xl py-3 hover:bg-blush-500 shadow-sm hover:shadow-md transition-all"
        >
          Uložiť psa
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-beige-600 hover:text-beige-700 px-6 py-3 rounded-2xl hover:bg-beige-50 transition-colors"
          >
            Zrušiť
          </button>
        )}
      </div>
    </form>
  );
}

