import { useState, useEffect } from "react";
/**
 * RitualBanner.tsx — Time-of-day contextual greeting banner.
 * Phase 8: Daily Rituals System.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { RitualStatus } from '../../lib/types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️ Good morning!';
  if (hour < 17) return '🌤 Good afternoon!';
  return '🌙 Good evening!';
}

export function RitualBanner() {
  const [status, setStatus] = useState<RitualStatus>({ active_ritual: null, message: null });

  useEffect(() => {
    api.getRitualStatus()
      .then(s => setStatus(s as unknown as RitualStatus))
      .catch(() => {});
  }, []);

  const greeting = getGreeting();

  if (!status.active_ritual) return null;

  const emoji = {
    morning: '🌅',
    after_school: '🎒',
    evening: '🌙',
    weekend: '🌟',
  }[status.active_ritual] || '✨';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-200/30 px-4 py-2 text-center"
      >
        <span className="text-lg font-medium">
          {emoji} {greeting} {status.message}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
