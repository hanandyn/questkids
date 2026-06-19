import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { AdminMetrics } from '../../lib/types';

export function AdminMetricsPanel() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAdminMetrics()
      .then(data => setMetrics(data as unknown as AdminMetrics))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl animate-bounce">📊</div>
        <p className="text-gray-500 mt-2">{t('general.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        {error}
      </div>
    );
  }

  if (!metrics) return null;

  const cards = [
    { icon: '👥', label: t('metrics.users'), value: metrics.user_count, color: 'from-blue-400 to-blue-600' },
    { icon: '👨‍👩‍👧‍👦', label: t('metrics.families'), value: metrics.family_count, color: 'from-purple-400 to-purple-600' },
    { icon: '✅', label: t('metrics.tasksToday'), value: metrics.tasks_completed_today, color: 'from-green-400 to-green-600' },
    { icon: '🔥', label: t('metrics.activeStreaks'), value: metrics.active_streaks, color: 'from-orange-400 to-orange-600' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('metrics.title')}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`card-quest bg-gradient-to-br ${card.color} text-white text-center`}
          >
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="text-3xl font-bold">{card.value}</div>
            <div className="text-sm opacity-80">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-quest bg-white">
          <h3 className="font-bold text-lg mb-3">User Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>👨‍👩‍👧 Parents</span>
              <span className="font-bold text-quest-blue">{metrics.parent_count}</span>
            </div>
            <div className="flex justify-between">
              <span>👶 Children</span>
              <span className="font-bold text-quest-pink">{metrics.child_count}</span>
            </div>
          </div>
        </div>
        <div className="card-quest bg-white">
          <h3 className="font-bold text-lg mb-3">Engagement</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{t('metrics.tasksToday')}</span>
              <span className="font-bold text-green-600">{metrics.tasks_completed_today}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('metrics.activeStreaks')}</span>
              <span className="font-bold text-orange-600">{metrics.active_streaks}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
