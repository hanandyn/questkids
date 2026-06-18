import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { WeeklyRecap, KidRecap } from '../../lib/types';
import { AvatarDisplay } from './AvatarPicker';

interface RecapProps {
  isParent?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WeeklyRecap(_props: RecapProps) {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeeklyRecap()
      .then(data => setRecap(data as unknown as WeeklyRecap))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-400">Generating recap...</div>;
  if (!recap) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-kid bg-gradient-to-br from-indigo-50 to-purple-50"
    >
      <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
        📊 Weekly Recap
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {recap.week_start} → {recap.week_end}
      </p>

      {/* Family overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/70 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{recap.family_completion_rate}%</div>
          <div className="text-xs text-gray-500">Family Rate</div>
        </div>
        <div className="bg-white/70 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-quest-blue">{recap.total_tasks_completed}</div>
          <div className="text-xs text-gray-500">Tasks Done</div>
        </div>
        <div className="bg-white/70 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-quest-gold">{recap.total_points_earned}</div>
          <div className="text-xs text-gray-500">Points Earned</div>
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white/70 rounded-xl p-3 mb-4">
        <h3 className="font-bold text-sm mb-2">🌟 Highlights</h3>
        <div className="space-y-1 text-sm">
          <p>🏆 Top Performer: <strong>{recap.highlights.top_performer_name}</strong> ({recap.highlights.top_performer_rate}%)</p>
          {recap.highlights.most_improved_name && (
            <p>📈 Most Improved: <strong>{recap.highlights.most_improved_name}</strong> (+{recap.highlights.most_improved_change} pts)</p>
          )}
          {recap.highlights.longest_streak_name && (
            <p>🔥 Best Streak: <strong>{recap.highlights.longest_streak_name}</strong> ({recap.highlights.longest_streak_value} days)</p>
          )}
        </div>
      </div>

      {/* Per-child recaps */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm">👨‍👩‍👧‍👦 Each Child</h3>
        {recap.children_recap.map(child => (
          <motion.div
            key={child.child_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/80 rounded-xl p-3"
          >
            <div className="flex items-center gap-3 mb-2">
              <AvatarDisplay avatarConfig={child.avatar_config} size={32} />
              <div className="flex-1">
                <h4 className="font-bold">{child.display_name}</h4>
                <div className="text-xs text-gray-500">
                  Lv.{child.level} • 🔥 {child.streak_days}d streak
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{child.completion_rate}%</div>
                <div className="text-xs text-gray-500">
                  {child.tasks_completed}/{child.tasks_total} tasks
                </div>
              </div>
            </div>
            {/* Mini progress */}
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(child.completion_rate, 100)}%` }}
                className={`h-full rounded-full ${
                  child.completion_rate >= 80 ? 'bg-green-500' :
                  child.completion_rate >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                }`}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="flex gap-3 text-xs text-gray-500 mt-2">
              <span>⭐ {child.points_earned} pts</span>
              {child.stars_change !== 0 && (
                <span className={child.stars_change > 0 ? 'text-green-600' : 'text-red-400'}>
                  {child.stars_change > 0 ? '+' : ''}{child.stars_change} vs last week
                </span>
              )}
              {child.achievements_unlocked.length > 0 && (
                <span>🏅 {child.achievements_unlocked.length} new</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      {recap.tips.length > 0 && (
        <div className="mt-4 bg-amber-50 rounded-xl p-3">
          <h3 className="font-bold text-sm mb-2">💡 Tips</h3>
          <ul className="space-y-1 text-sm">
            {recap.tips.map((tip, i) => (
              <li key={i} className="text-gray-700">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

/** Kid-friendly simplified recap */
export function KidWeeklyRecap() {
  const [recap, setRecap] = useState<KidRecap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getKidRecap()
      .then(data => setRecap(data as unknown as KidRecap))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !recap) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-kid bg-gradient-to-br from-indigo-50 to-purple-50 mb-4"
    >
      <h2 className="font-bold text-lg mb-2">📊 My Week</h2>
      <p className="text-xs text-gray-500 mb-3">{recap.week_start} → {recap.week_end}</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <div className="text-xl font-bold text-green-600">{recap.completion_rate}%</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <div className="text-xl font-bold text-quest-blue">{recap.tasks_completed}</div>
          <div className="text-xs text-gray-500">Tasks</div>
        </div>
        <div className="bg-white/70 rounded-xl p-2 text-center">
          <div className="text-xl font-bold text-quest-gold">{recap.stars}</div>
          <div className="text-xs text-gray-500">Stars</div>
        </div>
      </div>

      <div className="text-sm space-y-1 mb-3">
        <p>🔥 Streak: {recap.streak_days} days</p>
        <p>🏅 Rank: #{recap.family_rank} of {recap.total_siblings} siblings</p>
        {recap.achievements_unlocked.length > 0 && (
          <p>🎖️ New badges: {recap.achievements_unlocked.join(', ')}</p>
        )}
      </div>

      {/* Mini family standing */}
      <div className="bg-white/70 rounded-xl p-2">
        <p className="text-xs font-bold text-gray-500 mb-1">Family Stars</p>
        {recap.siblings.map((sib, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{sib.display_name}</span>
            <span className="font-bold">⭐ {sib.stars}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
