export function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-beige-900/30 backdrop-blur-sm px-4 py-8"
      onClick={onCancel}
    >
      <div
        className="card max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          <p className="text-beige-700 text-base leading-relaxed">{message}</p>
          <div className="pt-4 flex justify-end gap-3 border-t border-beige-200">
            <button
              className="text-sm text-beige-600 hover:text-beige-700 px-4 py-2 rounded-full hover:bg-beige-50 transition-colors"
              onClick={onCancel}
            >
              Zrušiť
            </button>
            <button
              className="text-sm font-medium text-white bg-blush-400 rounded-full px-5 py-2 hover:bg-blush-500 shadow-sm transition-all"
              onClick={onConfirm}
            >
              Potvrdiť
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
