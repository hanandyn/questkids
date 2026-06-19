import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { ActiveEvents, SeasonalEvent } from '../../lib/types';

export function SeasonalBanner() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.getActiveEvents()
      .then((data: unknown) => {
        const active = data as ActiveEvents;
        if (active.has_active) {
          setEvents(active.events);
        }
      })
      .catch(() => {});
  }, []);

  // Rotate through events every 8 seconds
  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % events.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0 || dismissed) return null;

  const event = events[currentIndex];

  const themeColors: Record<string, { bg: string; border: string; emoji: string }> = {
    summer: { bg: 'from-yellow-400 to-orange-400', border: 'border-yellow-300', emoji: '☀️' },
    'back-to-school': { bg: 'from-blue-400 to-purple-400', border: 'border-blue-300', emoji: '📚' },
    chanukah: { bg: 'from-blue-600 to-indigo-700', border: 'border-blue-400', emoji: '🕎' },
    passover: { bg: 'from-red-500 to-orange-600', border: 'border-red-300', emoji: '🍷' },
  };

  const colors = themeColors[event.theme] || { bg: 'from-quest-blue to-purple-500', border: 'border-quest-blue', emoji: '🎉' };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className={`bg-gradient-to-r ${colors.bg} text-white p-3 text-center relative border-b-2 ${colors.border}`}
      >
        <span className="text-xl mr-2">{colors.emoji}</span>
        <span className="font-bold">{event.name}</span>
        {event.bonus_multiplier > 1 && (
          <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {(event.bonus_multiplier * 100 - 100).toFixed(0)}% {t('events.bonus', 'Bonus Points!')}
          </span>
        )}
        {event.special_badge_name && (
          <span className="ml-2 bg-yellow-400/30 px-2 py-0.5 rounded-full text-xs">
            🏅 {event.special_badge_name}
          </span>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-lg"
          aria-label="Dismiss"
        >
          &times;
        </button>
        {events.length > 1 && (
          <div className="flex justify-center gap-1 mt-1">
            {events.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
