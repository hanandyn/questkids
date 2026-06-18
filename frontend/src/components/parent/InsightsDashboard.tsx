import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { api } from '../../lib/api';
import type { InsightsResponse } from '../../lib/types';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function InsightsDashboard() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayRange, setDayRange] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.getInsightsAnalytics(dayRange);
      setData(result as unknown as InsightsResponse);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dayRange]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  if (loading) return <div className="text-center py-12 text-gray-400">Loading insights...</div>;
  if (!data) return <div className="text-center py-12 text-gray-400">No data available yet.</div>;

  const stats = data.stats;
  const tips = data.tips;

  // Prepare chart data
  const completionOverTime = stats.daily_completion || [];
  const perChildData = Object.values(stats.per_child || {}).map((child: Record<string, unknown>) => ({
    name: child.display_name as string || `Child ${child.child_id}`,
    rate: child.completion_rate as number || 0,
    tasks: child.tasks_completed as number || 0,
    points: child.points_earned as number || 0,
  }));

  // Task type breakdown mock (can be enhanced with real data)
  const taskTypeData = [
    { name: 'One Shot', value: 40 },
    { name: 'Timed', value: 25 },
    { name: 'Checklist', value: 20 },
    { name: 'Bonus', value: 15 },
  ];

  const tipSeverityColors: Record<string, string> = {
    warning: 'border-amber-400 bg-amber-50',
    info: 'border-blue-300 bg-blue-50',
    success: 'border-green-400 bg-green-50',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">📊 Insights & Analytics</h2>
        <select
          value={dayRange}
          onChange={e => setDayRange(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-quest bg-blue-50 text-center p-4">
          <div className="text-3xl font-bold text-quest-blue">{stats.family_completion_rate}%</div>
          <div className="text-xs text-gray-500">Avg Completion</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-quest bg-green-50 text-center p-4">
          <div className="text-3xl font-bold text-green-600">{stats.total_tasks_completed}</div>
          <div className="text-xs text-gray-500">Tasks Done</div>
        </motion.div>
        {stats.best_day && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-quest bg-yellow-50 text-center p-4">
            <div className="text-lg font-bold text-yellow-700">{stats.best_day.rate}%</div>
            <div className="text-xs text-gray-500">Best Day: {stats.best_day.date}</div>
          </motion.div>
        )}
        {stats.worst_day && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-quest bg-red-50 text-center p-4">
            <div className="text-lg font-bold text-red-500">{stats.worst_day.rate}%</div>
            <div className="text-xs text-gray-500">Worst Day: {stats.worst_day.date}</div>
          </motion.div>
        )}
      </div>

      {/* Smart Tips */}
      {tips.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-quest bg-gradient-to-r from-purple-50 to-pink-50">
          <h3 className="font-bold text-lg mb-3">💡 Smart Tips</h3>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`border-2 rounded-xl px-4 py-3 ${tipSeverityColors[tip.severity] || 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">
                    {tip.severity === 'warning' ? '⚠️' : tip.severity === 'success' ? '✅' : '💡'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{tip.message}</p>
                    {tip.child_name && <p className="text-xs text-gray-400 mt-1">Re: {tip.child_name}</p>}
                  </div>
                  <span className="ml-auto text-xs text-gray-400 capitalize">{tip.tip_type}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Completion Over Time */}
        <div className="card-quest">
          <h3 className="font-bold text-sm mb-3">📈 Completion Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={completionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="completion_rate"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                  name="Completion Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-Child Comparison */}
        <div className="card-quest">
          <h3 className="font-bold text-sm mb-3">👨‍👩‍👧‍👦 Per-Child Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perChildData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="rate" name="Completion %" radius={[8, 8, 0, 0]}>
                  {perChildData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Type Breakdown */}
        <div className="card-quest">
          <h3 className="font-bold text-sm mb-3">📋 Task Type Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={true}
                >
                  {taskTypeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Points Over Time */}
        <div className="card-quest">
          <h3 className="font-bold text-sm mb-3">⭐ Points Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#f59e0b" name="Completed Tasks" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke="#94a3b8" name="Total Tasks" strokeWidth={2} dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Most Consistent */}
      {stats.most_consistent_child_name && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-quest bg-gradient-to-r from-cyan-50 to-teal-50">
          <p className="text-sm">
            🎯 <strong>{stats.most_consistent_child_name}</strong> is the most consistent child — great routine habits!
          </p>
        </motion.div>
      )}
    </div>
  );
}
