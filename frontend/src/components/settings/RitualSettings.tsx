import { useState, useEffect } from "react";
/**
 * RitualSettings.tsx — Parent configuration for daily ritual windows.
 * Phase 8: Daily Rituals System.
 */

import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { RitualData } from '../../lib/types';

const DEFAULT_RITUALS: RitualData[] = [
  { ritual_type: 'morning', time_window_start: '07:00', time_window_end: '09:00', enabled: true },
  { ritual_type: 'after_school', time_window_start: '14:00', time_window_end: '16:00', enabled: true },
  { ritual_type: 'evening', time_window_start: '18:00', time_window_end: '20:00', enabled: true },
  { ritual_type: 'weekend', time_window_start: null, time_window_end: null, enabled: true },
];

const RITUAL_LABELS: Record<string, { title: string; emoji: string; desc: string }> = {
  morning: { title: 'Morning Ritual', emoji: '🌅', desc: 'Morning greeting, quests, and daily spin reminder' },
  after_school: { title: 'After-School Ritual', emoji: '🎒', desc: 'Homework quests and afternoon challenges' },
  evening: { title: 'Evening Ritual', emoji: '🌙', desc: 'Wrap-up, incomplete task reminders, streak-at-risk' },
  weekend: { title: 'Weekend Ritual', emoji: '🌟', desc: 'Bonus challenges and family goals highlight' },
};

export function RitualSettings() {
  const [rituals, setRituals] = useState<RitualData[]>(DEFAULT_RITUALS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getRituals()
      .then(data => {
        const r = data as unknown as RitualData[];
        if (r.length > 0) setRituals(r);
      })
      .catch(() => {});
  }, []);

  const updateRitual = (index: number, field: keyof RitualData, value: unknown) => {
    setRituals(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateRituals(rituals as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save rituals:', e);
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 bg-white rounded-xl shadow-sm border border-gray-200"
    >
      <h3 className="text-lg font-semibold mb-4">🌅 Daily Rituals</h3>
      <p className="text-sm text-gray-500 mb-4">
        Configure when contextual greetings and reminders appear for your kids.
      </p>

      <div className="space-y-4">
        {rituals.map((ritual, i) => {
          const label = RITUAL_LABELS[ritual.ritual_type];
          return (
            <div key={ritual.ritual_type} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl">{label.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{label.title}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ritual.enabled}
                      onChange={e => updateRitual(i, 'enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-checked:bg-indigo-500 rounded-full transition-colors">
                      <div className="w-4 h-4 bg-white rounded-full mt-0.5 ml-0.5 peer-checked:ml-4.5 transition-all" />
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-400">{label.desc}</p>
                {ritual.ritual_type !== 'weekend' && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="time"
                      value={ritual.time_window_start || ''}
                      onChange={e => updateRitual(i, 'time_window_start', e.target.value || null)}
                      disabled={!ritual.enabled}
                      className="px-2 py-1 border rounded text-sm"
                    />
                    <span className="text-gray-400 self-center">to</span>
                    <input
                      type="time"
                      value={ritual.time_window_end || ''}
                      onChange={e => updateRitual(i, 'time_window_end', e.target.value || null)}
                      disabled={!ritual.enabled}
                      className="px-2 py-1 border rounded text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Rituals'}
      </button>
    </motion.div>
  );
}
