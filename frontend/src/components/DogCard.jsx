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
  const hasBehaviorNotes = dog.behavior_notes && dog.behavior_notes.trim().length > 0;

  // Build info line: breed, weight, age
  const infoParts = [];
  if (dog.breed) infoParts.push(dog.breed);
  if (dog.weight) infoParts.push(`${dog.weight} kg`);

  return (
    <div
      className="card flex items-start justify-between gap-4 hover:border-blush-200 hover:bg-white hover:shadow-md transition-all cursor-pointer py-4"
      onClick={() => onOpen(dog)}
    >
      <div className="space-y-2 flex-1 min-w-0">
        {/* Name and basic info */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-xl font-light text-beige-800">{dog.name}</p>
          {infoParts.length > 0 && (
            <span className="text-sm text-beige-500">{infoParts.join(' · ')}</span>
          )}
        </div>
        
        {/* Owners */}
        {Array.isArray(dog.owners) && dog.owners.length > 0 ? (
          <p className="text-sm text-beige-600">
            {dog.owners.length === 1 ? 'Majiteľ: ' : 'Majitelia: '}
            {dog.owners.map(o => o.name).join(', ')}
          </p>
        ) : dog.owner_name ? (
          <p className="text-sm text-beige-600">Majiteľ: {dog.owner_name}</p>
        ) : (
          <p className="text-sm text-beige-400 italic">Bez majiteľa</p>
        )}
        
        {/* Tags row - health and character */}
        {(tags.length > 0 || characterTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <button
                key={`health-${tag}`}
                className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onTagClick === 'function') onTagClick(tag);
                }}
              >
                {tag}
              </button>
            ))}
            {characterTags.map((tag) => (
              <button
                key={`char-${tag}`}
                className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 transition-colors"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onCharacterTagClick === 'function') onCharacterTagClick(tag);
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Indicator if there are notes */}
        {hasBehaviorNotes && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              info
            </span>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 flex-shrink-0">
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

