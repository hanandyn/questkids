import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../lib/i18n';

export function LoginPage() {
  const { login, register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        await register({ username, password, display_name: displayName, role: 'parent' });
      } else {
        await login(username, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quest-blue via-quest-purple to-quest-pink p-4">
      <div className="card-quest w-full max-w-md animate-bounce-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🏰 QuestKids</h1>
          <p className="text-gray-500 text-lg">
            {isRegister ? 'Create your family account' : 'Welcome back, adventurer!'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-bold mb-1">👨‍👩‍👧‍👦 Family Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-quest-blue outline-none text-lg"
                placeholder="The Cohen Family"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold mb-1">👤 {t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-quest-blue outline-none text-lg"
              placeholder="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">🔐 {t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-quest-blue outline-none text-lg"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full text-lg"
          >
            {busy ? '⏳ Loading...' : isRegister ? t('register') : t('login')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-quest-blue hover:underline text-sm"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
