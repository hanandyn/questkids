import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { EnhancedLeaderboard as ELB } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import { AvatarDisplay } from './AvatarPicker';
import { CheerButton } from './CheerSystem';

export function EnhancedLeaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState<ELB | null>(null);
  const [period, setPeriod] = useState<'all_time' | 'weekly' | 'monthly'>('all_time');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.getEnhancedLeaderboard(period);
      setData(result as unknown as ELB);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const renderRankChange = (change: number) => {
    if (change > 0) return <span className="text-green-500 font-bold text-sm">↑{change}</span>;
    if (change < 0) return <span className="text-red-400 font-bold text-sm">↓{Math.abs(change)}</span>;
    return <span className="text-gray-300 text-sm">–</span>;
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading leaderboard...</div>;

  const entries = data?.leaderboard || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">🏆 Family Leaderboard</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all_time', 'weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === p ? 'bg-white shadow text-quest-blue' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'all_time' ? 'All Time' : p === 'weekly' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Highlights */}
      {data && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {data.most_improved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-3 text-sm"
            >
              <div className="text-xs text-gray-500 mb-1">🚀 Most Improved</div>
              <div className="font-bold">{data.most_improved.display_name}</div>
              <div className="text-green-600">↑{data.most_improved.rank_change} ranks this week</div>
            </motion.div>
          )}
          {data.longest_streak_entry && data.longest_streak_entry.current_streak > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-3 text-sm"
            >
              <div className="text-xs text-gray-500 mb-1">🔥 Longest Streak</div>
              <div className="font-bold">{data.longest_streak_entry.display_name}</div>
              <div className="text-orange-600">{data.longest_streak_entry.current_streak} days!</div>
            </motion.div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="space-y-2">
        <AnimatePresence>
          {entries.map((entry, index) => {
            const isMe = entry.child_id === user?.id;
            const medal = getMedalEmoji(entry.rank);

            return (
              <motion.div
                key={entry.child_id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`card-quest flex items-center gap-3 ${
                  isMe ? 'bg-blue-50 border-blue-300 border-2' : ''
                }`}
              >
                {/* Rank */}
                <div className="flex items-center gap-2 min-w-[40px]">
                  {medal ? (
                    <span className="text-2xl">{medal}</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-400 w-8 text-center">
                      {entry.rank}
                    </span>
                  )}
                  <div className="flex flex-col items-center">
                    {renderRankChange(entry.rank_change)}
                  </div>
                </div>

                {/* Avatar */}
                <AvatarDisplay avatarConfig={entry.avatar_config} size={40} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">
                    {entry.display_name}
                    {isMe && <span className="text-quest-blue text-xs ml-1">(You)</span>}
                  </h3>
                  <div className="flex gap-2 text-xs text-gray-500 flex-wrap">
                    <span>Lv.{entry.level}</span>
                    <span>🔥 {entry.current_streak}d</span>
                    <span>{entry.completion_rate}%</span>
                    {entry.handicap_multiplier !== 100 && (
                      <span className="text-amber-600">⚖️ {entry.handicap_multiplier}%</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(entry.completion_rate, 100)}%` }}
                      className={`h-full rounded-full ${
                        entry.rank === 1 ? 'bg-yellow-400' :
                        entry.rank === 2 ? 'bg-gray-400' :
                        entry.rank === 3 ? 'bg-amber-600' : 'bg-quest-blue'
                      }`}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right min-w-[70px]">
                  <div className="text-lg font-bold text-quest-gold">
                    ⭐ {entry.stars}
                  </div>
                  {entry.handicap_multiplier !== 100 && (
                    <div className="text-xs text-gray-400">
                      Adjusted: ⭐ {entry.adjusted_stars}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">💎 {entry.gems}</div>
                </div>

                {/* Cheer button (only for siblings, not self) */}
                {entry.child_id !== user?.id && user?.role === 'child' && (
                  <CheerButton
                    toChildId={entry.child_id}
                    toChildName={entry.display_name}
                    onSent={() => load()}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">🏆</div>
          <p>No leaderboard data yet. Complete some quests!</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>⚖️ Stars with handicap multiplier applied for fair comparison</p>
        <p>↑↓ Rank change compared to last week</p>
      </div>
    </div>
  );
}
