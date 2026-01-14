import { useState } from 'react';

export function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="max-w-md w-full card space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-light text-beige-800">Hebká labka</h1>
          <p className="text-sm text-beige-500">Prihlásenie (1 používateľ)</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-beige-700">Email</label>
          <input
            className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-beige-700">Heslo</label>
          <input
            className="w-full rounded-2xl border border-beige-300 bg-white/80 px-4 py-3 text-beige-800 placeholder-beige-400 focus:bg-white focus:border-blush-300 transition-all"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-blush-500 bg-blush-50 rounded-2xl px-4 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blush-400 text-white font-medium rounded-2xl py-3 hover:bg-blush-500 shadow-sm hover:shadow-md disabled:opacity-60 transition-all"
        >
          {loading ? 'Prihlasujem…' : 'Prihlásiť'}
        </button>
      </form>
    </div>
  );
}

