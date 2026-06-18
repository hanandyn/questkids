import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { ChildAchievement } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

const RARITY_COLORS: Record<string, string> = {
  common: 'from-gray-100 to-gray-50 border-gray-300',
  rare: 'from-blue-50 to-blue-100 border-blue-300',
  epic: 'from-purple-50 to-purple-100 border-purple-400',
  legendary: 'from-yellow-50 to-amber-100 border-yellow-400',
};

export function AchievementTab() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<ChildAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getChildAchievements(user.id);
      setAchievements(data as unknown as ChildAchievement[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const earned = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl animate-bounce">🏆</div>
        <p className="text-gray-500 mt-4">Loading achievements...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          🏆 Trophy Case
        </h2>
        <p className="text-gray-500">
          {earned.length} / {achievements.length} unlocked
        </p>
        {/* Progress bar */}
        <div className="mt-2 bg-gray-200 rounded-full h-4 max-w-xs mx-auto overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${achievements.length > 0 ? (earned.length / achievements.length) * 100 : 0}%` }}
            className="h-full bg-gradient-to-r from-quest-gold to-quest-orange rounded-full"
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3">🌟 Earned ({earned.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {earned.map(ach => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className={`bg-gradient-to-br ${RARITY_COLORS[ach.rarity] || RARITY_COLORS.common} rounded-2xl p-3 border-2 text-center`}
              >
                <div className="text-3xl mb-1">{ach.icon || '🏅'}</div>
                <div className="font-bold text-sm">{ach.name}</div>
                <div className="text-xs text-gray-400 mt-1">{ach.rarity}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      <div>
        <h3 className="font-bold text-lg mb-3">🔒 Locked ({locked.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {locked.map(ach => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-100 rounded-2xl p-3 border-2 border-dashed border-gray-300 text-center opacity-60"
            >
              <div className="text-3xl mb-1 grayscale">🔒</div>
              <div className="font-bold text-sm text-gray-500">{ach.name}</div>
              <div className="text-xs text-gray-400 mt-1">{ach.description}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">🏆</div>
          <p>No achievements available yet.</p>
        </div>
      )}
    </div>
  );
}

export function AchievementNotification({ achievements }: { achievements: Array<{ name: string; icon?: string; rarity?: string }> }) {
  if (!achievements || achievements.length === 0) return null;

  const rarityColor: Record<string, string> = {
    common: 'bg-gray-100 border-gray-300',
    rare: 'bg-blue-50 border-blue-300',
    epic: 'bg-purple-50 border-purple-400',
    legendary: 'bg-yellow-50 border-yellow-400',
  };

  return (
    <div className="space-y-2">
      {achievements.map((ach, i) => (
        <motion.div
          key={ach.name}
          initial={{ opacity: 0, x: -50, scale: 0.5 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: i * 0.3 }}
          className={`${rarityColor[ach.rarity || 'common']} border-2 rounded-2xl px-4 py-3 flex items-center gap-3`}
        >
          <span className="text-3xl animate-bounce-in">{ach.icon || '🏅'}</span>
          <div>
            <div className="font-bold">🏅 Achievement Unlocked!</div>
            <div className="text-lg">{ach.name}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
