import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../shared/LanguageSwitcher';
import { getUserServerUrl, setUserServerUrl, DEFAULT_PRODUCTION_ORIGIN } from '../../lib/apiBase';
import loginBg from '../../assets/fundo-login-bg.jpg';

type LoginMode = 'choose' | 'kid' | 'parent';

function ServerConfigDialog({
  show,
  serverUrl,
  serverMsg,
  onClose,
  onSave,
  onReset,
  onServerUrlChange,
}: {
  show: boolean;
  serverUrl: string;
  serverMsg: string;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  onServerUrlChange: (value: string) => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-1">🖥️ Server Settings</h2>
            <p className="text-sm text-gray-500 mb-4">Enter your FunDo server address (URL or IP:port)</p>
            <input
              type="text"
              value={serverUrl}
              onChange={e => onServerUrlChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-quest-blue outline-none text-lg mb-3"
              placeholder={DEFAULT_PRODUCTION_ORIGIN}
            />
            {serverMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-3">
                {serverMsg}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={onSave}
                className="flex-1 bg-quest-blue text-white font-bold py-3 rounded-xl hover:bg-quest-blue/90 transition-colors"
              >
                Save & Reload
              </button>
              {serverUrl && (
                <button
                  onClick={onReset}
                  className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 text-gray-400 hover:text-gray-600 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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

  // Server config dialog
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => getUserServerUrl() || '');
  const [serverMsg, setServerMsg] = useState('');

  const handleServerSave = () => {
    const trimmed = serverUrl.trim().replace(/\/+$/, '');
    setUserServerUrl(trimmed);
    setServerMsg(trimmed ? `Server set to ${trimmed}. Reloading...` : 'Server reset to default. Reloading...');
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleServerReset = () => {
    setServerUrl('');
    setUserServerUrl('');
    setServerMsg('Server reset to default. Reloading...');
    setTimeout(() => window.location.reload(), 1200);
  };

  const serverConfigDialog = (
    <ServerConfigDialog
      show={showServerConfig}
      serverUrl={serverUrl}
      serverMsg={serverMsg}
      onClose={() => setShowServerConfig(false)}
      onSave={handleServerSave}
      onReset={handleServerReset}
      onServerUrlChange={value => { setServerUrl(value); setServerMsg(''); }}
    />
  );

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
  const [inviteCode, setInviteCode] = useState('');
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
        await register({ username, password, display_name: displayName, role: 'parent', invite_code: inviteCode || undefined });
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
        {serverConfigDialog}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="card-quest w-full max-w-md relative"
        >
          {/* Server config gear — top right inside card */}
          <button
            onClick={() => setShowServerConfig(true)}
            className="absolute top-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg shadow-sm transition-colors z-10"
            aria-label="Server settings"
          >
            ⚙️
          </button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
              <img src="/logo.png" alt="FunDo" className="h-12 w-12 rounded-xl object-contain" />
              {t('app.name', 'FunDo')}
            </h1>
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
        {serverConfigDialog}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="card-quest w-full max-w-md relative"
        >
          {/* Server config gear — top right inside card */}
          <button
            onClick={() => setShowServerConfig(true)}
            className="absolute top-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg shadow-sm transition-colors z-10"
            aria-label="Server settings"
          >
            ⚙️
          </button>

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
      {serverConfigDialog}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="card-quest w-full max-w-md relative"
      >
        {/* Server config gear — top right inside card */}
        <button
          onClick={() => setShowServerConfig(true)}
          className="absolute top-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg shadow-sm transition-colors z-10"
          aria-label="Server settings"
        >
          ⚙️
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
              <img src="/logo.png" alt="FunDo" className="h-12 w-12 rounded-xl object-contain" />
              {t('app.name', 'FunDo')}
            </h1>
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
          {isRegister && (
            <div>
              <label className="block text-sm font-bold mb-1">🎟️ Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-quest-blue outline-none text-lg"
                placeholder="Required only for private installs"
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
