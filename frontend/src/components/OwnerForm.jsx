import { useState, useEffect } from 'react';

export function OwnerForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        phone: initial.phone || '',
        email: initial.email || '',
        address: initial.address || '',
      });
    } else {
      setForm({ name: '', phone: '', email: '', address: '' });
    }
  }, [initial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    if (!initial) {
      setForm({ name: '', phone: '', email: '', address: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-beige-700">Telefón</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            inputMode="tel"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-beige-700">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-beige-700">Adresa</label>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
        />
      </div>
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

