import { useState, useEffect } from "react";
/**
 * SmartSuggestionsPanel.tsx — AI-powered task suggestions for parents.
 * Phase 8: Smart Task Suggestions.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { TaskSuggestion } from '../../lib/types';

const TYPE_ICONS: Record<string, string> = {
  timer: '⏱️',
  difficulty: '📊',
  schedule: '📅',
  new_task: '💡',
  pricing: '💰',
};

const TYPE_COLORS: Record<string, string> = {
  timer: 'border-blue-200 bg-blue-50',
  difficulty: 'border-orange-200 bg-orange-50',
  schedule: 'border-purple-200 bg-purple-50',
  new_task: 'border-green-200 bg-green-50',
  pricing: 'border-yellow-200 bg-yellow-50',
};

export function SmartSuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadSuggestions = async (refresh = false) => {
    setLoading(true);
    try {
      const data = await api.getSuggestions(refresh) as unknown as TaskSuggestion[];
      setSuggestions(data.filter(s => s.status === 'pending'));
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSuggestions();
  }, []);

  const handleApply = async (id: number) => {
    setActionId(id);
    try {
      await api.applySuggestion(id);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'applied' as const } : s));
    } catch (e) {
      console.error('Apply failed:', e);
    }
    setActionId(null);
  };

  const handleDismiss = async (id: number) => {
    setActionId(id);
    try {
      await api.dismissSuggestion(id);
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('Dismiss failed:', e);
    }
    setActionId(null);
  };

  const handleRefresh = () => loadSuggestions(true);

  if (loading && suggestions.length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">🧠 Smart Suggestions</h3>
        <p className="text-sm text-gray-400">Analyzing patterns...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">🧠 Smart Suggestions</h3>
        <button
          onClick={handleRefresh}
          className="text-xs text-indigo-500 hover:text-indigo-700"
        >
          🔄 Refresh
        </button>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No suggestions right now. Keep using QuestKids and I&apos;ll find optimizations!
        </p>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {suggestions.map(s => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className={`p-3 rounded-lg border ${TYPE_COLORS[s.suggestion_type] || 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{TYPE_ICONS[s.suggestion_type] || '💡'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{s.description}</p>
                    {s.reason && (
                      <p className="text-xs text-gray-400 mt-1 italic">💭 {s.reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => handleDismiss(s.id)}
                    disabled={actionId === s.id}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleApply(s.id)}
                    disabled={actionId === s.id}
                    className="px-3 py-1 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {actionId === s.id ? '...' : 'Apply'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
