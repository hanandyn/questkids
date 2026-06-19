import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../shared/LanguageSwitcher';
import loginBg from '../../assets/questkids-login-bg.jpg';

type LoginMode = 'choose' | 'kid' | 'parent';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<LoginMode>(() => {
    // Allow deep-linking to parent login via #parent
    if (typeof window !== 'undefined' && window.location.hash === '#parent') {
      return 'parent';
    }
    return 'choose';
  });

  // Kid login state
  const [kidUsername, setKidUsername] = useState('');
  const [kidPassword, setKidPassword] = useState('');
  const [kidError, setKidError] = useState('');
  const [kidBusy, setKidBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Parent login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleKidLogin = async (e: FormEvent) => {
    e.preventDefault();
    setKidError('');
    setKidBusy(true);
    try {
      await login(kidUsername, kidPassword);
    } catch (err: unknown) {
      setKidError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setKidBusy(false);
    }
  };

  const handleParentSubmit = async (e: FormEvent) => {
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
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Mode chooser ──────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={document.documentElement.dir} style={{backgroundImage: `linear-gradient(rgba(99,102,241,0.65), rgba(168,85,247,0.65)), url(${loginBg})`, backgroundSize: "cover", backgroundPosition: "center"}}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="card-quest w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">🏰 {t('app.name', 'QuestKids')}</h1>
            <p className="text-gray-500 text-lg">
              {t('auth.whoAreYou', 'Who are you?')}
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <LanguageSwitcher />
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode('kid')}
              className="w-full p-6 bg-gradient-to-r from-quest-pink to-quest-purple text-white text-xl font-bold rounded-2xl hover:scale-[1.02] transition-all btn-press focus-ring"
            >
              🧒 {t('auth.imAKid', "I'm a Kid!")}
            </button>
            <button
              onClick={() => setMode('parent')}
              className="w-full p-6 bg-gradient-to-r from-quest-blue to-quest-green text-white text-xl font-bold rounded-2xl hover:scale-[1.02] transition-all btn-press focus-ring"
            >
              👨👩 {t('auth.imAParent', "I'm a Grown-up")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Kid login ──────────────────────────────────────────────────
  if (mode === 'kid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir={document.documentElement.dir} style={{backgroundImage: `linear-gradient(rgba(236,72,153,0.6), rgba(147,51,234,0.6)), url(${loginBg})`, backgroundSize: "cover", backgroundPosition: "center"}}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="card-quest w-full max-w-md"
        >
          <div className="text-center mb-6">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
              className="text-7xl mb-2"
            >
              🦊
            </motion.div>
            <h1 className="text-3xl font-bold text-quest-dark mb-1">
              {t('auth.kidLogin', 'Hi Kid! 👋')}
            </h1>
            <p className="text-gray-500 text-lg">
              {t('auth.kidLoginDesc', 'Log in to start your quests!')}
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <LanguageSwitcher />
          </div>

          <form onSubmit={handleKidLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                🧑 {t('auth.kidUsername', 'Your Username')}
              </label>
              <input
                type="text"
                value={kidUsername}
                onChange={e => setKidUsername(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-quest-blue focus:ring-4 focus:ring-quest-blue/20 outline-none text-xl text-center font-mono"
                placeholder="username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">
                🔑 {t('auth.kidPassword', 'Your Password')}
              </label>
              <input
                type="password"
                value={kidPassword}
                onChange={e => setKidPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-quest-blue focus:ring-4 focus:ring-quest-blue/20 outline-none text-xl text-center font-mono"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {kidError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center"
                role="alert"
              >
                {kidError}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={kidBusy}
              className="btn-primary w-full text-xl py-4"
            >
              {kidBusy ? '⏳...' : `🚀 ${t('auth.letsPlay', "Let's Play!")}`}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-gray-400 hover:text-gray-600 text-sm focus-ring"
            >
              {t('auth.forgotCredentials', 'Forgot your login?')}
            </button>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-gray-600"
              >
                {t('auth.askParent', 'Ask your parent to check the credentials they got during setup!')}
              </motion.div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode('parent')}
              className="text-gray-400 hover:text-gray-600 text-sm focus-ring"
            >
              👨👩 {t('auth.parentLogin', "I'm a grown-up")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Parent login ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={document.documentElement.dir} style={{backgroundImage: `linear-gradient(rgba(59,130,246,0.6), rgba(139,92,246,0.6)), url(${loginBg})`, backgroundSize: "cover", backgroundPosition: "center"}}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="card-quest w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🏰 {t('app.name', 'QuestKids')}</h1>
          <p className="text-gray-500 text-lg">
            {isRegister ? t('auth.createAccount') : t('auth.welcomeBack')}
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <LanguageSwitcher />
        </div>

        <form onSubmit={handleParentSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-bold mb-1">👨👩👧👦 Family Name</label>
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
              autoFocus
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

        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-quest-blue hover:underline text-sm block"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
          <button
            onClick={() => setMode('choose')}
            className="text-gray-400 hover:text-gray-600 text-sm block focus-ring"
          >
            ← {t('auth.backToChoice', 'Back')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}