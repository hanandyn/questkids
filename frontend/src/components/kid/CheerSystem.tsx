import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { Cheer } from '../../lib/types';

const CHEER_EMOJIS: Record<string, string> = {
  clap: '👏',
  celebrate: '🎉',
  lightning: '⚡',
  muscle: '💪',
  star: '🌟',
};

const CHEER_LABELS: Record<string, string> = {
  clap: 'Nice!',
  celebrate: 'Party!',
  lightning: 'Speedy!',
  muscle: 'Strong!',
  star: 'Super!',
};

interface CheerButtonProps {
  toChildId: number;
  toChildName: string;
  onSent: () => void;
}

export function CheerButton({ toChildId, toChildName, onSent }: CheerButtonProps) {
  const [remaining, setRemaining] = useState(3);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCheersSentToday()
      .then(data => setRemaining((data as { remaining: number }).remaining))
      .catch(() => {});
  }, []);

  const handleCheer = async (type: string) => {
    try {
      const result = await api.sendCheer({ to_child_id: toChildId, message_type: type });
      if ((result as { success: boolean }).success) {
        setSent(true);
        setRemaining(prev => prev - 1);
        onSent();
        setTimeout(() => setSent(false), 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (remaining <= 0) return null;

  return (
    <div className="relative group">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="text-lg px-2 py-1 rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 hover:from-yellow-200 hover:to-orange-200 transition-all"
        title={`Send cheer to ${toChildName}`}
      >
        💌
      </motion.button>

      {/* Cheer picker popup */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-xl p-2 flex gap-1 border border-gray-200">
          {Object.entries(CHEER_EMOJIS).map(([type, emoji]) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              onClick={() => handleCheer(type)}
              className="text-2xl hover:bg-gray-100 rounded-xl px-2 py-1 transition-colors"
              title={CHEER_LABELS[type]}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {sent && (
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: -20 }}
          className="absolute bottom-full right-0 text-green-600 text-xs font-bold whitespace-nowrap"
        >
          Cheered! ✨
        </motion.span>
      )}

      {error && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-full right-0 text-red-500 text-xs bg-red-50 px-2 py-1 rounded whitespace-nowrap"
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}

interface CheerNotificationProps {
  cheers: Cheer[];
}

export function CheerNotification({ cheers }: CheerNotificationProps) {
  return (
    <AnimatePresence>
      {cheers.slice(0, 3).map(cheer => (
        <motion.div
          key={cheer.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl px-4 py-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CHEER_EMOJIS[cheer.message_type] || '💌'}</span>
            <div>
              <p className="font-medium">{cheer.from_child_name} sent you a cheer!</p>
              <p className="text-xs text-gray-500">{CHEER_LABELS[cheer.message_type] || 'Cheer!'}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
