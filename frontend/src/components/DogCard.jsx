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

export function DogCard({ dog, onEdit, onDelete, onOpen, onTagClick }) {
  const tags = toTags(dog.grooming_tolerance);

  return (
    <div
      className="card flex items-center justify-between gap-4 hover:border-blush-200 hover:bg-white hover:shadow-md transition-all cursor-pointer py-4"
      onClick={() => onOpen(dog)}
    >
      <div className="space-y-2 flex-1">
        <p className="text-xl font-light text-beige-800">{dog.name}</p>
        <p className="text-sm text-beige-600">Majiteľ: {dog.owner_name}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                className="px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-medium"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onTagClick === 'function') onTagClick(tag);
                }}
              >
                {tag}
              </button>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-beige-400 px-2">+{tags.length - 3}</span>
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

