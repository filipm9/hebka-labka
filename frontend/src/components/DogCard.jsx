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

export function DogCard({ dog, onEdit, onDelete, onOpen, onTagClick, onCharacterTagClick }) {
  const tags = toTags(dog.grooming_tolerance);
  const characterTags = toTags(dog.character_tags);
  const hasHealthInfo = tags.length > 0 || dog.health_notes;
  const hasCharacterInfo = characterTags.length > 0 || dog.character_notes;

  return (
    <div
      className="card flex items-center justify-between gap-4 hover:border-blush-200 hover:bg-white hover:shadow-md transition-all cursor-pointer py-4"
      onClick={() => onOpen(dog)}
    >
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xl font-light text-beige-800">{dog.name}</p>
          {hasHealthInfo && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100" title="Zdravotné informácie">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19.5 12.572l-7.5 7.428-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.566z"/>
              </svg>
            </span>
          )}
          {hasCharacterInfo && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100" title="Informácie o povahe">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </span>
          )}
        </div>
        <p className="text-sm text-beige-600">Majiteľ: {dog.owner_name}</p>
        {(tags.length > 0 || characterTags.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.slice(0, 2).map((tag) => (
              <button
                key={`health-${tag}`}
                className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onTagClick === 'function') onTagClick(tag);
                }}
              >
                {tag}
              </button>
            ))}
            {tags.length > 2 && (
              <span className="text-xs text-emerald-400 px-1">+{tags.length - 2}</span>
            )}
            {characterTags.slice(0, 2).map((tag) => (
              <button
                key={`char-${tag}`}
                className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 transition-colors"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onCharacterTagClick === 'function') onCharacterTagClick(tag);
                }}
              >
                {tag}
              </button>
            ))}
            {characterTags.length > 2 && (
              <span className="text-xs text-violet-400 px-1">+{characterTags.length - 2}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          className="text-xs text-blush-500 hover:text-blush-600 font-medium px-3 py-1.5 rounded-full hover:bg-blush-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(dog);
          }}
        >
          Upraviť
        </button>
        <button
          className="text-xs text-blush-400 hover:text-blush-500 font-medium px-3 py-1.5 rounded-full hover:bg-blush-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(dog);
          }}
        >
          Vymazať
        </button>
      </div>
    </div>
  );
}

