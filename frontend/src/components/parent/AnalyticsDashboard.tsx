import { useState, useEffect, useCallback } from "react";
/**
 * AnalyticsDashboard.tsx — Advanced analytics with trend charts and exports.
 * Phase 8: Advanced Analytics & Export.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { api } from '../../lib/api';
import type { ChildTrends, User } from '../../lib/types';

interface ChildOption {
  id: number;
  display_name: string;
}

export function AnalyticsDashboard() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [trends, setTrends] = useState<ChildTrends | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api.getChildren()
      .then(data => {
        const kids = data as unknown as User[];
        setChildren(kids.map(c => ({ id: c.id, display_name: c.display_name })));
        if (kids.length > 0 && !selectedChild) setSelectedChild(kids[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrends = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const data = await api.getChildTrends(selectedChild, days) as unknown as ChildTrends;
      setTrends(data);
    } catch (e) {
      console.error('Failed to load trends:', e);
    }
    setLoading(false);
  }, [selectedChild, days]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedChild) loadTrends();
  }, [selectedChild, days, loadTrends]);

  const handleExportPdf = (childId: number) => {
    window.open(api.getChildExportPdfUrl(childId), '_blank');
  };

  const handleExportCsv = () => {
    window.open(api.getFamilyExportCsvUrl(), '_blank');
  };

  const chartData = trends?.daily.map(d => ({
    date: d.date,
    completion: d.rate,
    points: d.points,
  })) || [];

  const dowData = trends ? Object.entries(trends.day_of_week_performance).map(([day, count]) => ({
    day,
    completed: count,
  })) : [];

  const categoryData = trends ? Object.entries(trends.category_breakdown).map(([cat, count]) => ({
    category: cat,
    count,
  })) : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">📊 Analytics</h2>
        <div className="flex gap-2">
          {trends && (
            <>
              <button
                onClick={() => handleExportPdf(selectedChild!)}
                className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
              >
                📄 PDF Report
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                📥 CSV Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={selectedChild || ''}
          onChange={e => setSelectedChild(Number(e.target.value))}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          {children.map(c => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {loading && <p className="text-gray-400 text-center py-8">Loading analytics...</p>}

      {trends && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-lg border text-center">
              <div className="text-2xl font-bold text-indigo-600">{trends.completion_rate}%</div>
              <div className="text-xs text-gray-500">Completion Rate</div>
            </div>
            <div className="p-3 bg-white rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{trends.total_completed}</div>
              <div className="text-xs text-gray-500">Tasks Completed</div>
            </div>
            <div className="p-3 bg-white rounded-lg border text-center">
              <div className="text-xl font-bold text-amber-600">{trends.best_day || '-'}</div>
              <div className="text-xs text-gray-500">Best Day</div>
            </div>
            <div className="p-3 bg-white rounded-lg border text-center">
              <div className="text-xl font-bold text-red-500">{trends.worst_day || '-'}</div>
              <div className="text-xs text-gray-500">Worst Day</div>
            </div>
          </div>

          {/* Completion Trend Chart */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">📈 Completion Trend</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="completion" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} name="Completion %" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            )}
          </div>

          {/* Day of Week Performance */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">📅 Day of Week</h3>
            {dowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            )}
          </div>

          {/* Category Breakdown */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">📂 Categories</h3>
              <div className="space-y-2">
                {categoryData.map(c => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-24">{c.category}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                      <div
                        className="bg-purple-500 h-4 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (c.count / Math.max(...categoryData.map(x => x.count), 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-8 text-right">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Average time */}
          {trends.average_completion_seconds && (
            <div className="bg-white rounded-lg border p-4 text-center">
              <span className="text-gray-500 text-sm">⏱️ Average completion time: </span>
              <span className="font-semibold">
                {Math.round(trends.average_completion_seconds / 60)} minutes
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
