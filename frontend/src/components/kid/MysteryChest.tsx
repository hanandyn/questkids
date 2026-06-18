import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { ChestResult } from '../../lib/types';
import * as sounds from '../../lib/sounds';

interface Props {
  onResult: (result: ChestResult) => void;
  onClose: () => void;
}

export function MysteryChest({ onResult, onClose }: Props) {
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [result, setResult] = useState<ChestResult | null>(null);
  const [error, setError] = useState('');

  const handleOpen = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    sounds.playChestOpen();

    // Animate chest opening
    setTimeout(async () => {
      try {
        const res = await api.openMysteryChest();
        const chestResult = res as unknown as ChestResult;
        setResult(chestResult);
        setOpened(true);
        onResult(chestResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open chest');
      }
      setOpening(false);
    }, 1500);
  }, [opening, onResult]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && opened) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="card-kid bg-gradient-to-b from-purple-50 to-pink-50 max-w-sm w-full text-center"
      >
        <h2 className="text-2xl font-bold mb-2">🎁 Mystery Chest</h2>
        <p className="text-gray-500 mb-4">You earned a mystery chest!</p>

        {/* Chest */}
        <div className="relative w-48 h-48 mx-auto mb-4">
          <motion.div
            className="text-8xl"
            animate={opening ? {
              scale: [1, 1.2, 1],
              rotate: [0, -10, 10, -5, 0],
            } : opened ? {
              scale: 1.1,
            } : {
              scale: 1,
            }}
            transition={{ duration: opening ? 0.8 : 0.3 }}
          >
            {opened ? '🎉' : opening ? '✨' : '🧰'}
          </motion.div>

          {/* Glow effect */}
          {opening && (
            <motion.div
              className="absolute inset-0 rounded-full bg-yellow-300/30"
              animate={{
                scale: [1, 1.5, 2],
                opacity: [0.5, 0.3, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white/80 rounded-2xl p-4 mb-4 border-2 border-quest-gold"
            >
              <div className="text-4xl mb-2">
                {result.reward_type === 'stars' ? '⭐' :
                 result.reward_type === 'gems' ? '💎' :
                 '🎨'}
              </div>
              <div className="text-xl font-bold text-quest-dark">
                {result.item_name || `${result.value} ${result.reward_type}`}
              </div>
              <p className="text-sm text-gray-500 mt-1">{result.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {!opened ? (
          <button
            onClick={handleOpen}
            disabled={opening}
            className="btn-gold text-xl px-8 disabled:opacity-50 animate-pulse-glow"
          >
            {opening ? 'Opening... ✨' : 'OPEN! 🎁'}
          </button>
        ) : (
          <button onClick={onClose} className="btn-primary">
            Awesome! 🎉
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
