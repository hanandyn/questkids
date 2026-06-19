import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

/**
 * Kid's Daily Recap — shows evening summary of today's achievements.
 * Displayed as a beautiful card with stats, highlights, and tomorrow's tip.
 */
export function KidDailyRecap() {
  const { t } = useTranslation();
  const [recap, setRecap] = useState<Record<string, unknown> | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show after 5 PM
    const hour = new Date().getHours();
    if (hour < 17) return;

    api.getKidDailyRecap().then(data => {
      setRecap(data as unknown as Record<string, unknown>);
      // Auto-show if there are completed tasks today
      const summary = (data as Record<string, unknown>)?.summary as Record<string, unknown> | undefined;
      if (summary && (summary.completed as number) > 0) {
        const dismissed = localStorage.getItem('recap-dismissed-' + new Date().toDateString());
        if (!dismissed) setShow(true);
      }
    }).catch(() => {});
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem('recap-dismissed-' + new Date().toDateString(), '1');
  };

  if (!recap || !show) return null;

  const summary = recap.summary as Record<string, unknown>;
  const vsYesterday = recap.vs_yesterday as Record<string, unknown>;
  const highlights = recap.highlights as string[];
  const streak = recap.streak as number;
  const points = recap.points_earned as number;
  const completed = summary.completed as number;
  const total = summary.total as number;
  const completionRate = summary.completion_rate as number;
  const tomorrowTip = recap.tomorrow_tip as string;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="card-kid bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white mb-6 relative overflow-hidden"
      >
        {/* Stars decoration */}
        <div className="absolute top-2 right-2 text-4xl opacity-20 animate-pulse">✨</div>
        <div className="absolute bottom-2 left-2 text-3xl opacity-20">🌙</div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              🌙 {t('recap.goodnight', 'Goodnight Recap!')}
            </h2>
            <button onClick={handleClose} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/20 rounded-2xl p-3 text-center">
              <div className="text-3xl font-bold">{completed}/{total}</div>
              <div className="text-xs opacity-80">{t('recap.tasks', 'Tasks')}</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 text-center">
              <div className="text-3xl font-bold">⭐{points}</div>
              <div className="text-xs opacity-80">{t('recap.earned', 'Earned')}</div>
            </div>
            <div className="bg-white/20 rounded-2xl p-3 text-center">
              <div className="text-3xl font-bold">🔥{streak}</div>
              <div className="text-xs opacity-80">{t('recap.streak', 'Streak')}</div>
            </div>
          </div>

          {/* Completion rate bar */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{t('recap.completion', 'Completion')}</span>
              <span className="text-sm font-bold">{completionRate}%</span>
              {vsYesterday && (vsYesterday.trend as string) === '↑' && (
                <span className="text-xs bg-green-400/30 px-2 rounded-full">{vsYesterday.trend as string} {vsYesterday.percentage as string}</span>
              )}
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-yellow-300 to-green-300 rounded-full"
              />
            </div>
          </div>

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">🌟 {t('recap.highlights', 'Highlights')}</h3>
              <div className="space-y-1">
                {highlights.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.2 }}
                    className="bg-white/10 rounded-xl px-3 py-2 text-sm"
                  >
                    {h}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Tomorrow's tip */}
          <div className="bg-white/10 rounded-2xl p-3">
            <span className="text-xs opacity-80">🌱 {t('recap.tomorrowTip', 'Tomorrow')}</span>
            <p className="text-sm font-medium mt-1">{tomorrowTip}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}