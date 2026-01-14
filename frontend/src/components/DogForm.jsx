import { useState, useEffect, useRef } from 'react';

const INITIAL_TAGS = ['Smrdí', 'Pĺzne', 'Kúše'];

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
  const availableTags = getAvailableTags();
  
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
  });
  const [newOwner, setNewOwner] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const ownerDropdownRef = useRef(null);
  const notesRef = useRef(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setTagRefreshKey((k) => k + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tagsUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tagsUpdated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target)) {
        setIsOwnerDropdownOpen(false);
      }
    };
    if (isOwnerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOwnerDropdownOpen]);

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
      });
      setTimeout(() => {
        if (notesRef.current && initial.behavior_notes) {
          notesRef.current.innerHTML = initial.behavior_notes;
        }
      }, 0);
    } else {
      setForm((f) => ({ ...f, grooming_tolerance: [] }));
      setTimeout(() => {
        if (notesRef.current) notesRef.current.innerHTML = '';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const birthdate = ageToDate(form.age);
    const payload = {
      ...form,
      owner_id: form.owner_id === 'new' ? null : Number(form.owner_id),
      weight: form.weight ? Number(form.weight) : null,
      birthdate: birthdate || null,
      behavior_notes: notesRef.current?.innerHTML || '',
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
            <input
              name="breed"
              value={form.breed}
              onChange={handleChange}
              className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            />
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-beige-700">Vlastné tagy</label>
              {onOpenTagsAdmin && (
                <button
                  type="button"
                  onClick={onOpenTagsAdmin}
                  className="text-beige-500 hover:text-blush-500 transition-colors p-1 rounded-full hover:bg-blush-50"
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
                      ? 'bg-sage-200 text-sage-700 border-sage-300 shadow-sm'
                      : 'border-beige-300 text-beige-600 hover:border-blush-300 hover:bg-blush-50'
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-beige-100 text-beige-700 text-sm font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      className="text-beige-500 hover:text-beige-700 rounded-full hover:bg-beige-200 p-0.5"
                      onClick={() => handleTagToggle(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>
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

