import { useState, useEffect, useRef } from 'react';

const INITIAL_TAGS = ['Smrdí', 'Pĺzne', 'Kúše'];
const INITIAL_CHARACTER_TAGS = ['Priateľský', 'Bojazlivý', 'Agresívny'];
const INITIAL_BREEDS = ['Zlatý retriever', 'Labrador', 'Nemecký ovčiak', 'Pudel', 'Bígl', 'Yorkshirský teriér'];

function getAvailableTags() {
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

function getAvailableCharacterTags() {
  const stored = localStorage.getItem('dog_groomer_character_tags');
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with default character tags if none exist
  saveCharacterTags(INITIAL_CHARACTER_TAGS);
  return INITIAL_CHARACTER_TAGS;
}

function saveCharacterTags(tags) {
  localStorage.setItem('dog_groomer_character_tags', JSON.stringify(tags));
}

function getAvailableBreeds() {
  const stored = localStorage.getItem('dog_groomer_custom_breeds');
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize with default breeds if no breeds exist
  localStorage.setItem('dog_groomer_custom_breeds', JSON.stringify(INITIAL_BREEDS));
  return INITIAL_BREEDS;
}


function toTags(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
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

export function DogForm({ owners, initial, onSubmit, onCancel, onOpenTagsAdmin }) {
  const [tagRefreshKey, setTagRefreshKey] = useState(0);
  const [breedRefreshKey, setBreedRefreshKey] = useState(0);
  const [characterTagRefreshKey, setCharacterTagRefreshKey] = useState(0);
  const availableTags = getAvailableTags();
  const availableBreeds = getAvailableBreeds();
  const availableCharacterTags = getAvailableCharacterTags();
  
  // Force re-render when tags are updated (tagRefreshKey changes)
  // This ensures availableTags is recalculated
  const [form, setForm] = useState({
    owner_id: '',
    name: '',
    breed: '',
    weight: '',
    age: '',
    grooming_tolerance: [],
    behavior_notes: '',
    health_notes: '',
    character_tags: [],
    character_notes: '',
  });
  const [newOwner, setNewOwner] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [isBreedDropdownOpen, setIsBreedDropdownOpen] = useState(false);
  const ownerDropdownRef = useRef(null);
  const breedDropdownRef = useRef(null);
  const notesRef = useRef(null);
  const healthNotesRef = useRef(null);
  const characterNotesRef = useRef(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setTagRefreshKey((k) => k + 1);
      setBreedRefreshKey((k) => k + 1);
      setCharacterTagRefreshKey((k) => k + 1);
    };
    const handleTagsUpdated = () => setTagRefreshKey((k) => k + 1);
    const handleBreedsUpdated = () => setBreedRefreshKey((k) => k + 1);
    const handleCharacterTagsUpdated = () => setCharacterTagRefreshKey((k) => k + 1);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tagsUpdated', handleTagsUpdated);
    window.addEventListener('breedsUpdated', handleBreedsUpdated);
    window.addEventListener('characterTagsUpdated', handleCharacterTagsUpdated);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tagsUpdated', handleTagsUpdated);
      window.removeEventListener('breedsUpdated', handleBreedsUpdated);
      window.removeEventListener('characterTagsUpdated', handleCharacterTagsUpdated);
    };
  }, []);

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
      setForm({
        owner_id: initial.owner_id || '',
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
      setForm((f) => ({ ...f, grooming_tolerance: [], health_notes: '', character_tags: [], character_notes: '' }));
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

  const handleOwnerSelect = (value) => {
    setForm((f) => ({ ...f, owner_id: value }));
    setIsOwnerDropdownOpen(false);
  };

  const getSelectedOwnerText = () => {
    if (!form.owner_id) return 'Vyberte majiteľa';
    if (form.owner_id === 'new') return '+ Nový majiteľ';
    const owner = owners.find((o) => o.id === Number(form.owner_id));
    return owner ? `${owner.name} (${owner.phone || 'bez telefónu'})` : 'Vyberte majiteľa';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const birthdate = ageToDate(form.age);
    const payload = {
      ...form,
      owner_id: form.owner_id === 'new' ? null : Number(form.owner_id),
      weight: form.weight ? Number(form.weight) : null,
      birthdate: birthdate || null,
      behavior_notes: notesRef.current?.innerHTML || '',
      health_notes: healthNotesRef.current?.innerHTML || '',
      character_notes: characterNotesRef.current?.innerHTML || '',
    };
    const ownerPayload = form.owner_id === 'new' ? newOwner : null;
    onSubmit({ dog: payload, newOwner: ownerPayload });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-beige-700">Majiteľ</label>
        <div className="grid grid-cols-1 gap-3">
          <div className="relative" ref={ownerDropdownRef}>
            <input
              type="hidden"
              name="owner_id"
              value={form.owner_id}
              required={form.owner_id !== 'new'}
            />
            <button
              type="button"
              onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
              className={`w-full rounded-2xl border px-4 py-3 pr-10 text-left text-beige-800 transition-all ${
                isOwnerDropdownOpen
                  ? 'bg-white border-blush-300 ring-2 ring-blush-200'
                  : 'border-beige-300 bg-white/80 hover:bg-white focus:bg-white focus:border-blush-300'
              } ${!form.owner_id ? 'text-beige-400' : ''}`}
            >
              {getSelectedOwnerText()}
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
                  <button
                    type="button"
                    onClick={() => handleOwnerSelect('')}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      !form.owner_id
                        ? 'bg-blush-50 text-blush-700'
                        : 'text-beige-700 hover:bg-blush-50 hover:text-blush-700'
                    }`}
                  >
                    Vyberte majiteľa
                  </button>
                  {owners.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleOwnerSelect(String(o.id))}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        form.owner_id === String(o.id)
                          ? 'bg-blush-50 text-blush-700'
                          : 'text-beige-700 hover:bg-blush-50 hover:text-blush-700'
                      }`}
                    >
                      {o.name} ({o.phone || 'bez telefónu'})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleOwnerSelect('new')}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      form.owner_id === 'new'
                        ? 'bg-blush-50 text-blush-700'
                        : 'text-blush-500 hover:bg-blush-50 hover:text-blush-700'
                    }`}
                  >
                    + Nový majiteľ
                  </button>
                </div>
              </div>
            )}
          </div>
          {form.owner_id === 'new' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-beige-50/50 rounded-2xl p-4">
              <input
                className="rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                placeholder="Meno majiteľa *"
                value={newOwner.name}
                onChange={(e) => setNewOwner((o) => ({ ...o, name: e.target.value }))}
                required
              />
              <input
                className="rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                placeholder="Telefón"
                value={newOwner.phone}
                onChange={(e) => setNewOwner((o) => ({ ...o, phone: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
                placeholder="Email"
                type="email"
                value={newOwner.email}
                onChange={(e) => setNewOwner((o) => ({ ...o, email: e.target.value }))}
              />
              <input
                className="rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all sm:col-span-2"
                placeholder="Adresa"
                value={newOwner.address}
                onChange={(e) => setNewOwner((o) => ({ ...o, address: e.target.value }))}
              />
            </div>
          )}
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
            <label className="text-sm font-medium text-beige-700">Plemeno</label>
            <div className="relative" ref={breedDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBreedDropdownOpen(!isBreedDropdownOpen)}
                className={`w-full rounded-2xl border px-4 py-3 pr-10 text-left text-beige-800 transition-all ${
                  isBreedDropdownOpen
                    ? 'bg-white border-blush-300 ring-2 ring-blush-200'
                    : 'border-beige-300 bg-white/80 hover:bg-white focus:bg-white focus:border-blush-300'
                } ${!form.breed ? 'text-beige-400' : ''}`}
              >
                {form.breed || 'Vyberte plemeno'}
              </button>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className={`w-5 h-5 text-beige-500 transition-transform ${isBreedDropdownOpen ? 'rotate-180' : ''}`}
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
                <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl border border-beige-300 shadow-lg overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, breed: '' }));
                        setIsBreedDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        !form.breed
                          ? 'bg-blush-50 text-blush-700'
                          : 'text-beige-700 hover:bg-blush-50 hover:text-blush-700'
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
                            ? 'bg-blush-50 text-blush-700'
                            : 'text-beige-700 hover:bg-blush-50 hover:text-blush-700'
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
          <label className="text-sm font-medium text-beige-700">Správanie (poznámky)</label>
          <div className="border border-beige-300 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-beige-50 to-sage-50 border-b border-beige-200">
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-beige-600 hover:text-beige-700 transition-colors"
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
                className="p-2 hover:bg-white rounded-xl text-beige-600 hover:text-beige-700 transition-colors"
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
              <div className="w-px h-5 bg-beige-300 mx-1" />
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-beige-600 hover:text-beige-700 transition-colors"
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
                className="p-2 hover:bg-white rounded-xl text-beige-600 hover:text-beige-700 transition-colors flex items-center justify-center"
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
              className="w-full px-4 py-3 min-h-[140px] bg-white focus:outline-none prose prose-sm max-w-none text-beige-700"
              onInput={handleNotesInput}
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
          <div className="w-full border-t-2 border-dashed border-emerald-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 py-1 text-sm font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
            </svg>
            Zdravie
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 rounded-3xl p-6 border border-emerald-100 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-emerald-700">Zdravotné tagy</label>
            {onOpenTagsAdmin && (
              <button
                type="button"
                onClick={onOpenTagsAdmin}
                className="text-emerald-500 hover:text-emerald-600 transition-colors px-3 py-1.5 rounded-full hover:bg-emerald-100 text-xs font-medium flex items-center gap-1.5"
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
                    ? 'bg-emerald-200 text-emerald-800 border-emerald-300 shadow-sm'
                    : 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100/80 bg-white/60'
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-emerald-500 hover:text-emerald-700 rounded-full hover:bg-emerald-200 p-0.5"
                    onClick={() => handleTagToggle(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            {availableTags.length === 0 && toTags(form.grooming_tolerance).length === 0 && (
              <p className="text-sm text-emerald-400 italic">Žiadne zdravotné tagy k dispozícii</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-emerald-700">Zdravotné poznámky</label>
          <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-emerald-600 hover:text-emerald-700 transition-colors"
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
                className="p-2 hover:bg-white rounded-xl text-emerald-600 hover:text-emerald-700 transition-colors"
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
              <div className="w-px h-5 bg-emerald-200 mx-1" />
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-emerald-600 hover:text-emerald-700 transition-colors"
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
              className="w-full px-4 py-3 min-h-[100px] bg-white focus:outline-none prose prose-sm max-w-none text-emerald-800"
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
          <div className="w-full border-t-2 border-dashed border-violet-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 py-1 text-sm font-semibold text-violet-600 uppercase tracking-wider flex items-center gap-2">
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

      <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/60 rounded-3xl p-6 border border-violet-100 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-violet-700">Povahové tagy</label>
            {onOpenTagsAdmin && (
              <button
                type="button"
                onClick={onOpenTagsAdmin}
                className="text-violet-500 hover:text-violet-600 transition-colors px-3 py-1.5 rounded-full hover:bg-violet-100 text-xs font-medium flex items-center gap-1.5"
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
                    ? 'bg-violet-200 text-violet-800 border-violet-300 shadow-sm'
                    : 'border-violet-200 text-violet-600 hover:border-violet-300 hover:bg-violet-100/80 bg-white/60'
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-violet-500 hover:text-violet-700 rounded-full hover:bg-violet-200 p-0.5"
                    onClick={() => handleCharacterTagToggle(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            {availableCharacterTags.length === 0 && toTags(form.character_tags).length === 0 && (
              <p className="text-sm text-violet-400 italic">Žiadne povahové tagy k dispozícii</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-violet-700">Povahové poznámky</label>
          <div className="border border-violet-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-violet-600 hover:text-violet-700 transition-colors"
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
                className="p-2 hover:bg-white rounded-xl text-violet-600 hover:text-violet-700 transition-colors"
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
              <div className="w-px h-5 bg-violet-200 mx-1" />
              <button
                type="button"
                className="p-2 hover:bg-white rounded-xl text-violet-600 hover:text-violet-700 transition-colors"
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
              className="w-full px-4 py-3 min-h-[100px] bg-white focus:outline-none prose prose-sm max-w-none text-violet-800"
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

