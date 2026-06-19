import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { User } from '../../lib/types';

/**
 * Natural Language Task Creator — parent types/speaks a description,
 * AI parses it into a task template with confirmation.
 */
export function NLTaskCreator({ children, onCreated }: { children: User[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const examples = [
    "Shower time, 10 minutes, 50 points, daily",
    "Practice piano 30 min every weekday, 75 points, 20 bonus on first ask",
    "Take out trash every Monday, 30 points, assigned to Almog",
    "Clean room, checklist, 40 points, weekly",
  ];

  const handleParse = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api.parseNLTask(text) as Record<string, unknown>;
      const p = result.parsed as Record<string, unknown>;
      setParsed(p);
      setConfidence(result.confidence as number);
      setMessage(result.message as string);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Parse failed');
    }
    setBusy(false);
  };

  const handleCreate = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const assignedChild = parsed.assigned_to
        ? children.find(c => c.display_name.toLowerCase() === (parsed.assigned_to as string).toLowerCase())
        : null;

      await api.createTemplate({
        name: parsed.name,
        task_type: parsed.task_type,
        base_points: parsed.base_points,
        timer_duration: parsed.timer_duration,
        schedule_type: parsed.schedule_type,
        schedule_days: parsed.schedule_days,
        max_asks: parsed.max_asks,
        bonus_first_ask: parsed.bonus_first_ask,
        penalty_per_ask: parsed.penalty_per_ask,
        assigned_child_ids: assignedChild ? [assignedChild.id] : children.map(c => c.id),
      });
      setMessage('✅ Task created!');
      setText('');
      setParsed(null);
      setShow(false);
      onCreated();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Create failed');
    }
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className="text-sm px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors focus-ring"
      >
        ✨ {t('parent.nlCreate', 'Describe a Task')}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-4 mt-3">
              <h3 className="font-bold text-quest-dark mb-2">✨ {t('parent.nlCreateDesc', 'Describe a task in your own words')}</h3>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 outline-none resize-none"
                rows={2}
                placeholder="e.g. Practice piano 30 min every weekday, 75 points, 20 bonus on first ask"
              />

              {/* Example chips */}
              <div className="flex flex-wrap gap-2 mt-2">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setText(ex)}
                    className="text-xs px-2 py-1 bg-white border border-purple-200 rounded-lg text-purple-600 hover:bg-purple-50"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <button
                onClick={handleParse}
                disabled={busy || !text.trim()}
                className="btn-primary mt-3 text-sm"
              >
                {busy ? '⏳...' : `🔮 ${t('parent.parse', 'Parse')}`}
              </button>

              {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}

              {/* Parsed preview */}
              {parsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📋</span>
                    <span className="font-bold">{t('parent.preview', 'Preview')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${confidence > 0.7 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {Math.round(confidence * 100)}% {t('parent.confidence', 'confidence')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Name" value={parsed.name as string} />
                    <Field label="Type" value={parsed.task_type as string} />
                    <Field label="Points" value={`⭐ ${parsed.base_points as number}`} />
                    {parsed.timer_duration ? <Field label="Timer" value={`${(parsed.timer_duration as number) / 60} min`} /> : null}
                    <Field label="Schedule" value={parsed.schedule_type as string} />
                    {parsed.assigned_to ? <Field label="Assigned to" value={parsed.assigned_to as string} /> : null}
                    {(parsed.bonus_first_ask as number) > 0 && <Field label="First-ask bonus" value={`+${parsed.bonus_first_ask as number}⭐`} />}
                    {(parsed.penalty_per_ask as number) > 0 && <Field label="Penalty/ask" value={`-${parsed.penalty_per_ask as number}⭐`} />}
                  </div>

                  <div className="flex gap-3 mt-3">
                    <button onClick={handleCreate} disabled={busy} className="btn-primary flex-1 text-sm">
                      ✅ {t('parent.createTask', 'Create Task')}
                    </button>
                    <button onClick={() => setParsed(null)} className="btn-quest bg-gray-200 text-sm">
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}:</span>
      <span className="font-bold ml-1">{value}</span>
    </div>
  );
}