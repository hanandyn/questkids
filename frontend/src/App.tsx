/* eslint-disable react-hooks/immutability */
import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/shared/Toast';
import { LoginPage } from './components/auth/LoginPage';
import { EmailVerificationPage } from './components/auth/EmailVerificationPage';
import { ShabbatBanner } from './components/kid/ShabbatBanner';
import { RitualBanner } from './components/shared/RitualBanner';
import { setLanguageDirection, SUPPORTED_LANGUAGES } from './lib/i18n';
import { api } from './lib/api';
import { initPerformanceMonitor } from './lib/performance';
import { CookieConsentBanner } from './components/shared/CookieConsent';
import { useTranslation } from 'react-i18next';
import type { ThemePreferences } from './lib/types';

// Phase 9: Lazy-loaded routes for code splitting (via default-export wrappers in src/lazy/)
const OnboardingWizard = lazy(() => import('./components/onboarding/OnboardingWizard'));
const KidQuestBoard = lazy(() => import('./lazy/KidQuestBoard'));
const TeenDashboard = lazy(() => import('./lazy/TeenDashboard'));
const YoungAdultDashboard = lazy(() => import('./lazy/YoungAdultDashboard'));
const LittleExplorerDashboard = lazy(() => import('./lazy/LittleExplorerDashboard'));
const ParentDashboard = lazy(() => import('./lazy/ParentDashboard'));
const MarketplacePage = lazy(() => import('./lazy/TemplateMarketplace'));
const AnalyticsDashboardPage = lazy(() => import('./lazy/AnalyticsDashboard'));
const SettingsPage = lazy(() => import('./lazy/SettingsPanel'));
const CalendarPage = lazy(() => import('./lazy/CalendarPage'));
const InsightsPage = lazy(() => import('./lazy/InsightsDashboard'));
const SmartSuggestionsPage = lazy(() => import('./lazy/SmartSuggestionsPanel'));
const AdminMetricsPage = lazy(() => import('./lazy/AdminMetricsPanel'));
const FulfillmentPage = lazy(() => import('./lazy/FulfillmentQueue'));
const OrganizationsPage = lazy(() => import('./lazy/OrganizationDashboard'));
const EnhancedSchedulerPage = lazy(() => import('./lazy/EnhancedScheduler'));
const AllowanceSettingsPage = lazy(() => import('./lazy/AllowanceSettings'));
const TeacherDashboardPage = lazy(() => import('./lazy/TeacherDashboard'));
const NotificationPrefsPage = lazy(() => import('./lazy/NotificationPreferences'));
const RitualSettingsPage = lazy(() => import('./lazy/RitualSettings'));
const IntegrationsSettingsPage = lazy(() => import('./lazy/IntegrationsSettings'));

// Phase 10
const PrivacySettingsPage = lazy(() => import('./lazy/PrivacySettings'));
const PhotoApprovalQueuePage = lazy(() => import('./lazy/PhotoApprovalQueue'));

// Phase 9: Shared components still eagerly loaded (needed everywhere)
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-quest-bg">
    <div className="text-center">
      <div className="text-7xl animate-bounce">🏰</div>
      <p className="text-xl text-gray-500 mt-4">Loading...</p>
    </div>
  </div>
);

function AppContent() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

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

    // Phase 10: Init performance monitoring
    initPerformanceMonitor();
  }, []);

  // Phase 9: Check if parent needs onboarding
  useEffect(() => {
    if (!loading && user?.role === 'parent') {
      api.onboardingStatus()
        .then((r: unknown) => {
          const res = r as { completed: boolean };
          setOnboardingNeeded(!res.completed);
        })
        .catch(() => {})
        .finally(() => setOnboardingChecked(true));
    } else if (!loading && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnboardingChecked(true);
    }
  }, [user, loading]);

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

  if (loading || (user?.role === 'parent' && !onboardingChecked)) {
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

  // Phase 9: Show onboarding wizard for new parents
  if (user.role === 'parent' && onboardingNeeded) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OnboardingWizard />
      </Suspense>
    );
  }

  // Phase 7: Tier 1 (ages 3-5) → Little Explorer Dashboard
  if (user.role === 'child' && user.age_tier && user.age_tier <= 2) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ShabbatBanner />
        <RitualBanner />
        <LittleExplorerDashboard />
      </Suspense>
    );
  }

  // Tier 4 teens (ages 13-15) get the teen dashboard
  if (user.role === 'child' && (user.age_tier || 0) === 4) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ShabbatBanner />
        <RitualBanner />
        <TeenDashboard />
      </Suspense>
    );
  }

  // Tier 5 young adults (ages 16-18) get a minimalist, mature dashboard
  if (user.role === 'child' && (user.age_tier || 0) >= 5) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ShabbatBanner />
        <RitualBanner />
        <YoungAdultDashboard />
      </Suspense>
    );
  }

  if (user.role === 'parent') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ShabbatBanner />
        <RitualBanner />
        {/* Phase 9: Parent view with lazy-loaded sub-routes */}
        <Routes>
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/analytics" element={<AnalyticsDashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/suggestions" element={<SmartSuggestionsPage />} />
          <Route path="/admin" element={<AdminMetricsPage />} />
          <Route path="/fulfillment" element={<FulfillmentPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/scheduler" element={<EnhancedSchedulerPage />} />
          <Route path="/allowance-settings" element={<AllowanceSettingsPage />} />
          <Route path="/teacher" element={<TeacherDashboardPage />} />
          <Route path="/notification-prefs" element={<NotificationPrefsPage />} />
          <Route path="/ritual-settings" element={<RitualSettingsPage />} />
          <Route path="/integrations" element={<IntegrationsSettingsPage />} />
          <Route path="/privacy" element={<PrivacySettingsPage />} />
          <Route path="/approvals" element={<PhotoApprovalQueuePage />} />
          <Route path="*" element={<ParentDashboard />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ShabbatBanner />
      <RitualBanner />
      <KidQuestBoard />
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
          <CookieConsentBanner />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
