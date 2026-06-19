/* eslint-disable react-hooks/immutability */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { EmailVerificationPage } from './components/auth/EmailVerificationPage';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { KidQuestBoard } from './components/kid/KidQuestBoard';
import { TeenDashboard } from './components/kid/TeenDashboard';
import { ShabbatBanner } from './components/kid/ShabbatBanner';
import { setLanguageDirection, SUPPORTED_LANGUAGES } from './lib/i18n';
import { api } from './lib/api';
import { useTranslation } from 'react-i18next';
import type { ThemePreferences } from './lib/types';

function AppContent() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  // Apply theme and direction on mount
  useEffect(() => {
    const lang = localStorage.getItem('questkids_lang') || 'en';
    const langDef = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    setLanguageDirection((langDef?.dir as 'ltr' | 'rtl') || 'ltr');

    // Load and apply theme preferences
    api.getThemePreferences()
      .then(raw => {
        const prefs = raw as unknown as ThemePreferences;
        applyThemeClasses(prefs);
      })
      .catch(() => {});
  }, []);

  // Re-apply theme when user data changes
  useEffect(() => {
    if (user?.theme_preference) {
      try {
        const prefs = JSON.parse(user.theme_preference) as ThemePreferences;
        applyThemeClasses(prefs);
      } catch { /* ignore */ }
    }
  }, [user?.theme_preference]);

  const applyThemeClasses = (prefs: ThemePreferences | null) => {
    const html = document.documentElement;

    // Remove all theme classes
    html.classList.remove(
      'shabbat-mode', 'focus-mode',
      'cb-deuteranopia', 'cb-protanopia', 'cb-tritanopia',
      'high-contrast'
    );

    if (!prefs) return;

    if (prefs.focus_mode) html.classList.add('focus-mode');
    if (prefs.colorblind_theme === 'deuteranopia') html.classList.add('cb-deuteranopia');
    if (prefs.colorblind_theme === 'protanopia') html.classList.add('cb-protanopia');
    if (prefs.colorblind_theme === 'tritanopia') html.classList.add('cb-tritanopia');
    if (prefs.high_contrast) html.classList.add('high-contrast');
  };

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center bg-quest-bg">
        <div className="text-center">
          <div className="text-7xl animate-bounce">🏰</div>
          <p className="text-xl text-gray-500 mt-4">{t('app.loading')}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content">
        <Routes>
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </main>
    );
  }

  // Tier 5 teens get their own dashboard
  if (user.role === 'child' && (user.age_tier || 0) >= 5) {
    return (
      <>
        <ShabbatBanner />
        <TeenDashboard />
      </>
    );
  }

  if (user.role === 'parent') {
    return (
      <>
        <ShabbatBanner />
        <ParentDashboard />
      </>
    );
  }

  return (
    <>
      <ShabbatBanner />
      <KidQuestBoard />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
