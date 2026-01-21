import { useState, useEffect, useRef } from 'react';

const INITIAL_COMMUNICATION_METHODS = ['WhatsApp', 'Instagram', 'Phone'];

function getAvailableCommunicationMethods() {
  const stored = localStorage.getItem('dog_groomer_communication_methods');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : INITIAL_COMMUNICATION_METHODS;
    } catch {
      return INITIAL_COMMUNICATION_METHODS;
    }
  }
  localStorage.setItem('dog_groomer_communication_methods', JSON.stringify(INITIAL_COMMUNICATION_METHODS));
  return INITIAL_COMMUNICATION_METHODS;
}

export function OwnerForm({ initial, onSubmit, onCancel, onOpenTagsAdmin, allDogs = [], onAssociateDog, onRemoveDogFromOwner }) {
  const [communicationMethodsRefreshKey, setCommunicationMethodsRefreshKey] = useState(0);
  const availableCommunicationMethods = getAvailableCommunicationMethods();
  const [form, setForm] = useState({
    name: '',
    communication_methods: [],
    important_info: '',
  });
  const [showDogPicker, setShowDogPicker] = useState(false);
  const [dogSearchQuery, setDogSearchQuery] = useState('');
  const importantInfoRef = useRef(null);
  const communicationDetailsRefs = useRef({});
  
  const getCommunicationDetailsRef = (method) => {
    if (!communicationDetailsRefs.current[method]) {
      communicationDetailsRefs.current[method] = { current: null };
    }
    return communicationDetailsRefs.current[method];
  };

  useEffect(() => {
    const handleCommunicationMethodsUpdated = () => setCommunicationMethodsRefreshKey((k) => k + 1);
    const handleStorageChange = () => {
      setCommunicationMethodsRefreshKey((k) => k + 1);
    };
    window.addEventListener('communicationMethodsUpdated', handleCommunicationMethodsUpdated);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('communicationMethodsUpdated', handleCommunicationMethodsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (initial) {
      const methods = Array.isArray(initial.communication_methods) 
        ? initial.communication_methods 
        : [];
      setForm({
        name: initial.name || '',
        communication_methods: methods,
        important_info: initial.important_info || '',
      });
      setTimeout(() => {
        if (importantInfoRef.current && initial.important_info) {
          importantInfoRef.current.innerHTML = initial.important_info;
        }
        methods.forEach((method) => {
          const ref = getCommunicationDetailsRef(method.method);
          if (ref.current && method.details) {
            ref.current.innerHTML = method.details;
          }
        });
      }, 0);
    } else {
      setForm({ name: '', communication_methods: [], important_info: '' });
      setTimeout(() => {
        if (importantInfoRef.current) importantInfoRef.current.innerHTML = '';
        Object.values(communicationDetailsRefs.current).forEach((ref) => {
          if (ref) ref.innerHTML = '';
        });
      }, 0);
    }
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCommunicationMethodToggle = (method) => {
    setForm((f) => {
      const current = f.communication_methods || [];
      const exists = current.find((m) => m.method === method);
      if (exists) {
        return {
          ...f,
          communication_methods: current.filter((m) => m.method !== method),
        };
      }
      return {
        ...f,
        communication_methods: [...current, { method, details: '' }],
      };
    });
  };

  const handleCommunicationMethodDetailsInput = (method) => {
    const ref = communicationDetailsRefs.current[method];
    if (!ref) return;
    const html = ref.innerHTML;
    setForm((f) => {
      const current = f.communication_methods || [];
      return {
        ...f,
        communication_methods: current.map((m) =>
          m.method === method ? { ...m, details: html } : m
        ),
      };
    });
  };

  const handleImportantInfoInput = () => {
    const html = importantInfoRef.current ? importantInfoRef.current.innerHTML : '';
    setForm((f) => ({ ...f, important_info: html }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      important_info: importantInfoRef.current?.innerHTML || '',
      communication_methods: (form.communication_methods || []).map((m) => {
        const ref = getCommunicationDetailsRef(m.method);
        return {
          method: m.method,
          details: ref.current?.innerHTML || '',
        };
      }),
    };
    onSubmit(payload);
    if (!initial) {
      setForm({ name: '', communication_methods: [], important_info: '' });
      setTimeout(() => {
        if (importantInfoRef.current) importantInfoRef.current.innerHTML = '';
        Object.values(communicationDetailsRefs.current).forEach((ref) => {
          if (ref) ref.innerHTML = '';
        });
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-beige-700">Meno majiteľa</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
        />
      </div>

      {/* Communication Methods Section */}
      <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/60 rounded-3xl p-6 border border-blue-100 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-blue-700">Spôsoby komunikácie</label>
            {onOpenTagsAdmin && (
              <button
                type="button"
                onClick={onOpenTagsAdmin}
                className="text-blue-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-full hover:bg-blue-100 text-xs font-medium flex items-center gap-1.5"
                title="Spravovať spôsoby komunikácie"
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
            {availableCommunicationMethods.map((method) => {
              const isSelected = (form.communication_methods || []).some((m) => m.method === method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleCommunicationMethodToggle(method)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-200 text-blue-800 border-blue-300 shadow-sm'
                      : 'border-blue-200 text-blue-600 hover:border-blue-300 hover:bg-blue-100/80 bg-white/60'
                  }`}
                >
                  {method}
                </button>
              );
            })}
            {(form.communication_methods || [])
              .filter((m) => !availableCommunicationMethods.includes(m.method))
              .map((method) => (
                <span
                  key={method.method}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium"
                >
                  {method.method}
                  <button
                    type="button"
                    className="text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-200 p-0.5"
                    onClick={() => handleCommunicationMethodToggle(method.method)}
                  >
                    ×
                  </button>
                </span>
              ))}
            {availableCommunicationMethods.length === 0 && (form.communication_methods || []).length === 0 && (
              <p className="text-sm text-blue-400 italic">Žiadne spôsoby komunikácie k dispozícii</p>
            )}
          </div>
        </div>

        {/* Details for each selected communication method */}
        {(form.communication_methods || []).length > 0 && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-blue-700">Detaily komunikácie</label>
            {(form.communication_methods || []).map((method) => {
              const methodRef = getCommunicationDetailsRef(method.method);
              return (
                <div key={method.method} className="bg-white/60 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-700">{method.method}</span>
                  </div>
                  <div className="border border-blue-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                      <button
                        type="button"
                        className="p-2 hover:bg-white rounded-xl text-blue-600 hover:text-blue-700 transition-colors"
                        title="Tučné"
                        onClick={(e) => {
                          e.preventDefault();
                          if (methodRef.current) {
                            methodRef.current.focus();
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
                        className="p-2 hover:bg-white rounded-xl text-blue-600 hover:text-blue-700 transition-colors"
                        title="Kurzíva"
                        onClick={(e) => {
                          e.preventDefault();
                          if (methodRef.current) {
                            methodRef.current.focus();
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
                      <div className="w-px h-5 bg-blue-200 mx-1" />
                      <button
                        type="button"
                        className="p-2 hover:bg-white rounded-xl text-blue-600 hover:text-blue-700 transition-colors"
                        title="Zoznam s odrážkami"
                        onClick={(e) => {
                          e.preventDefault();
                          if (methodRef.current) {
                            methodRef.current.focus();
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
                      ref={(el) => {
                        methodRef.current = el;
                      }}
                      contentEditable
                      suppressContentEditableWarning
                      className="w-full px-4 py-3 min-h-[80px] bg-white focus:outline-none prose prose-sm max-w-none text-blue-800"
                      onInput={() => handleCommunicationMethodDetailsInput(method.method)}
                      placeholder={`Detaily pre ${method.method} (napr. telefónne číslo, Instagram meno...)`}
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Important Info Section */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t-2 border-dashed border-amber-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 py-1 text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
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

      <div className="bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/60 rounded-3xl p-5 border-2 border-amber-200 shadow-sm">
        <div className="border-2 border-amber-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="flex items-center gap-1 px-3 py-2.5 bg-gradient-to-r from-amber-100 to-yellow-50 border-b border-amber-200">
            <button
              type="button"
              className="p-2 hover:bg-white rounded-xl text-amber-600 hover:text-amber-700 transition-colors"
              title="Tučné"
              onClick={(e) => {
                e.preventDefault();
                if (importantInfoRef.current) {
                  importantInfoRef.current.focus();
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
              className="p-2 hover:bg-white rounded-xl text-amber-600 hover:text-amber-700 transition-colors"
              title="Kurzíva"
              onClick={(e) => {
                e.preventDefault();
                if (importantInfoRef.current) {
                  importantInfoRef.current.focus();
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
            <div className="w-px h-5 bg-amber-300 mx-1" />
            <button
              type="button"
              className="p-2 hover:bg-white rounded-xl text-amber-600 hover:text-amber-700 transition-colors"
              title="Zoznam s odrážkami"
              onClick={(e) => {
                e.preventDefault();
                if (importantInfoRef.current) {
                  importantInfoRef.current.focus();
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 7h10M10 12h10M10 17h10"
                />
              </svg>
            </button>
          </div>
          <div
            ref={importantInfoRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full px-4 py-3 min-h-[160px] bg-white focus:outline-none prose prose-sm max-w-none text-amber-900"
            onInput={handleImportantInfoInput}
            placeholder="Sem napíš všetko dôležité..."
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          />
        </div>
      </div>

      {/* Associated Dogs Section - only show when editing an existing owner */}
      {initial?.id && onAssociateDog && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-dashed border-blush-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 py-1 text-sm font-bold text-blush-700 uppercase tracking-wider flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/>
                  <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/>
                  <path d="M8 14v.5"/>
                  <path d="M16 14v.5"/>
                  <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
                  <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"/>
                </svg>
                Priradené psy
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blush-50/80 to-rose-50/60 rounded-3xl p-5 border border-blush-200 space-y-4">
            {/* Current dogs for this owner - now using M:M relationship */}
            {(() => {
              const ownerDogs = allDogs.filter(d => 
                Array.isArray(d.owners) 
                  ? d.owners.some(o => o.id === initial.id)
                  : d.owner_id === initial.id
              );
              return ownerDogs.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-blush-600 uppercase tracking-wider">Aktuálne psy tohto majiteľa</p>
                  <div className="flex flex-wrap gap-2">
                    {ownerDogs.map(dog => (
                      <span
                        key={dog.id}
                        className="px-4 py-2 rounded-full bg-blush-100 text-blush-700 text-sm font-medium flex items-center gap-2"
                      >
                        {dog.name}
                        {dog.breed && <span className="text-blush-500 text-xs">({dog.breed})</span>}
                        {onRemoveDogFromOwner && (
                          <button
                            type="button"
                            onClick={() => onRemoveDogFromOwner(dog.id, initial.id)}
                            className="ml-1 text-blush-400 hover:text-blush-600 hover:bg-blush-200 rounded-full p-0.5 transition-colors"
                            title="Odstrániť psa od majiteľa"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-blush-400 italic">Tento majiteľ nemá priradené žiadne psy.</p>
              );
            })()}

            {/* Add existing dog button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDogPicker(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-blush-300 text-blush-600 hover:border-blush-400 hover:bg-blush-50/50 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Pridať existujúceho psa
              </button>
            </div>

            {/* Dog picker modal */}
            {showDogPicker && (
              <div className="fixed inset-0 z-30 flex items-center justify-center bg-beige-900/30 backdrop-blur-sm px-4 py-8" onClick={() => { setShowDogPicker(false); setDogSearchQuery(''); }}>
                <div className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-5 border-b border-beige-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-beige-800">Vybrať psa</h3>
                      <button
                        type="button"
                        onClick={() => { setShowDogPicker(false); setDogSearchQuery(''); }}
                        className="text-beige-400 hover:text-beige-600 p-1 rounded-full hover:bg-beige-100 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={dogSearchQuery}
                      onChange={(e) => setDogSearchQuery(e.target.value)}
                      placeholder="Hľadať psa..."
                      className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-2.5 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="p-3 max-h-[50vh] overflow-y-auto">
                    {(() => {
                      // Filter dogs that are NOT already associated with this owner
                      const availableDogs = allDogs.filter(d => {
                        if (Array.isArray(d.owners)) {
                          return !d.owners.some(o => o.id === initial.id);
                        }
                        return d.owner_id !== initial.id;
                      });
                      const filteredDogs = availableDogs.filter(d => {
                        if (dogSearchQuery === '') return true;
                        const query = dogSearchQuery.toLowerCase();
                        if (d.name.toLowerCase().includes(query)) return true;
                        if (d.breed && d.breed.toLowerCase().includes(query)) return true;
                        // Check owner names for M:M
                        if (Array.isArray(d.owners)) {
                          return d.owners.some(o => o.name.toLowerCase().includes(query));
                        }
                        return false;
                      });
                      
                      // Sort to show dogs without any owner first
                      const sortedDogs = [...filteredDogs].sort((a, b) => {
                        const aHasOwners = Array.isArray(a.owners) ? a.owners.length > 0 : !!a.owner_id;
                        const bHasOwners = Array.isArray(b.owners) ? b.owners.length > 0 : !!b.owner_id;
                        if (!aHasOwners && bHasOwners) return -1;
                        if (aHasOwners && !bHasOwners) return 1;
                        return 0;
                      });
                      
                      if (sortedDogs.length === 0) {
                        return (
                          <p className="text-sm text-beige-400 text-center py-8">
                            {availableDogs.length === 0 
                              ? 'Žiadni ďalší psi nie sú k dispozícii.' 
                              : 'Žiadne výsledky pre hľadaný výraz.'}
                          </p>
                        );
                      }
                      
                      return (
                        <div className="space-y-1">
                          {sortedDogs.map(dog => {
                            const ownerNames = Array.isArray(dog.owners) && dog.owners.length > 0
                              ? dog.owners.map(o => o.name).join(', ')
                              : null;
                            const hasOwners = Array.isArray(dog.owners) ? dog.owners.length > 0 : !!dog.owner_id;
                            
                            return (
                              <button
                                key={dog.id}
                                type="button"
                                onClick={() => {
                                  onAssociateDog(dog.id, initial.id);
                                  setShowDogPicker(false);
                                  setDogSearchQuery('');
                                }}
                                className="w-full text-left px-4 py-3 rounded-2xl hover:bg-blush-50 transition-colors group"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-beige-800 group-hover:text-blush-600 transition-colors">{dog.name}</p>
                                    <p className="text-xs text-beige-500">
                                      {dog.breed && <span>{dog.breed}</span>}
                                      {dog.breed && (ownerNames || !hasOwners) && <span> · </span>}
                                      {ownerNames ? (
                                        <span>Majitelia: {ownerNames}</span>
                                      ) : !hasOwners && (
                                        <span className="text-amber-500 italic">Bez majiteľa</span>
                                      )}
                                    </p>
                                  </div>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-beige-300 group-hover:text-blush-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"/>
                                  </svg>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-blush-400 text-white font-medium rounded-2xl py-3 hover:bg-blush-500 shadow-sm hover:shadow-md transition-all"
        >
          {initial ? 'Uložiť zmeny' : 'Pridať majiteľa'}
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
