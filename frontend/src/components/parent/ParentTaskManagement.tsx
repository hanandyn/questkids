import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { User, TaskInstance } from '../../lib/types';

/**
 * Parent task management panel.
 * - View all kids' task instances
 * - Filter by child and status
 * - Change task status (mark complete, revert to pending, mark missed)
 * - Manually assign a task to a specific kid
 */
export function ParentTaskManagement({ children }: { children: User[] }) {
  const { t } = useTranslation();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [filterChild, setFilterChild] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState<number | null>(null);
  const [assignChildIds, setAssignChildIds] = useState<number[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [manualTemplateId, setManualTemplateId] = useState<number | null>(null);
  const [manualChildId, setManualChildId] = useState<number | null>(null);

  const loadInstances = useCallback(async () => {
    try {
      const data = await api.getAllInstances(filterChild ?? undefined, filterStatus ?? undefined);
      setInstances(data as unknown as TaskInstance[]);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [filterChild, filterStatus]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadInstances(); }, [loadInstances]);

  // Load templates for the assign modal
  useEffect(() => {
    api.getTemplates().then((t) => setTemplates(t as unknown as { id: number; name: string }[])).catch(() => {});
  }, []);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleStatusChange = async (instanceId: number, newStatus: string) => {
    try {
      await api.updateTaskStatus(instanceId, newStatus);
      showMessage(`✅ Status updated to ${newStatus}`);
      loadInstances();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTemplateId || assignChildIds.length === 0) return;
    try {
      await api.assignTemplate(assignTemplateId, assignChildIds);
      showMessage(`✅ Task assigned to ${assignChildIds.length} kid(s)`);
      setShowAssignModal(false);
      setAssignTemplateId(null);
      setAssignChildIds([]);
      loadInstances();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTemplateId || !manualChildId) return;
    try {
      await api.createManualInstance(manualTemplateId, manualChildId);
      showMessage(`✅ Task assigned for today`);
      setManualTemplateId(null);
      setManualChildId(null);
      loadInstances();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    missed: '❌',
    skipped: '⏭️',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-50 border-yellow-200',
    in_progress: 'bg-blue-50 border-blue-200',
    completed: 'bg-green-50 border-green-200',
    missed: 'bg-red-50 border-red-200',
    skipped: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        📋 {t('parent.taskManagement', 'Task Management')}
      </h2>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterChild ?? ''}
          onChange={e => setFilterChild(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm"
        >
          <option value="">{t('parent.allKids', 'All Kids')}</option>
          {children.map(c => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>

        <select
          value={filterStatus ?? ''}
          onChange={e => setFilterStatus(e.target.value || null)}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm"
        >
          <option value="">{t('parent.allStatuses', 'All Statuses')}</option>
          <option value="pending">⏳ Pending</option>
          <option value="in_progress">🔄 In Progress</option>
          <option value="completed">✅ Completed</option>
          <option value="missed">❌ Missed</option>
          <option value="skipped">⏭️ Skipped</option>
        </select>

        <button
          onClick={() => setShowAssignModal(true)}
          className="btn-primary text-sm ml-auto"
        >
          + {t('parent.assignTask', 'Assign Task')}
        </button>
      </div>

      {/* Task instances list */}
      <div className="space-y-2">
        <AnimatePresence>
          {instances.map(inst => {
            const child = children.find(c => c.id === inst.child_id);
            return (
              <motion.div
                key={inst.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`border-2 rounded-xl p-3 ${statusColor[inst.status] || 'bg-white border-gray-200'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl">{statusEmoji[inst.status] || '📌'}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold truncate">{inst.template?.name || 'Task'}</h4>
                      <p className="text-xs text-gray-500">
                        {child?.display_name || `Child #${inst.child_id}`} • ⭐ {inst.points_earned} pts
                        {inst.template?.task_type === 'timed' && inst.timer_started_at && (
                          <span className="ml-2">
                            ⏱ {new Date(inst.timer_started_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                            {inst.timer_ended_at && ` → ${new Date(inst.timer_ended_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status controls */}
                  <div className="flex gap-1 flex-shrink-0">
                    {inst.status !== 'completed' && (
                      <button
                        onClick={() => handleStatusChange(inst.id, 'completed')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors focus-ring"
                        title={t('parent.markDone', 'Mark as Done')}
                      >
                        ✅
                      </button>
                    )}
                    {inst.status !== 'pending' && (
                      <button
                        onClick={() => handleStatusChange(inst.id, 'pending')}
                        className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors focus-ring"
                        title={t('parent.revertPending', 'Revert to Pending')}
                      >
                        ↩️
                      </button>
                    )}
                    {inst.status !== 'missed' && (
                      <button
                        onClick={() => handleStatusChange(inst.id, 'missed')}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors focus-ring"
                        title={t('parent.markMissed', 'Mark as Missed')}
                      >
                        ❌
                      </button>
                    )}
                    {inst.status !== 'skipped' && (
                      <button
                        onClick={() => handleStatusChange(inst.id, 'skipped')}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus-ring"
                        title={t('parent.markSkipped', 'Skip')}
                      >
                        ⏭️
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {instances.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p>{t('parent.noTasks', 'No tasks found')}</p>
          </div>
        )}
      </div>

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-quest w-full max-w-md m-4">
            <h3 className="text-xl font-bold mb-4">{t('parent.assignTask', 'Assign Task')}</h3>

            {/* Quick assign: one task to one kid for today */}
            <form onSubmit={handleManualCreate} className="space-y-3 mb-4 pb-4 border-b border-gray-100">
              <h4 className="font-bold text-sm">{t('parent.quickAssign', 'Quick Assign for Today')}</h4>
              <select
                value={manualTemplateId ?? ''}
                onChange={e => setManualTemplateId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200"
                required
              >
                <option value="">{t('parent.selectTask', 'Select a task...')}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={manualChildId ?? ''}
                onChange={e => setManualChildId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200"
                required
              >
                <option value="">{t('parent.selectKid', 'Select a kid...')}</option>
                {children.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary w-full" disabled={!manualTemplateId || !manualChildId}>
                {t('parent.assignForToday', 'Assign for Today')}
              </button>
            </form>

            {/* Bulk assign: template to multiple kids */}
            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <h4 className="font-bold text-sm">{t('parent.bulkAssign', 'Bulk Assign (ongoing)')}</h4>
              <select
                value={assignTemplateId ?? ''}
                onChange={e => setAssignTemplateId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200"
                required
              >
                <option value="">{t('parent.selectTask', 'Select a task...')}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div>
                <label className="text-sm font-bold mb-2 block">{t('parent.assignTo', 'Assign to')}</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {children.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignChildIds.includes(c.id)}
                        onChange={e => {
                          if (e.target.checked) setAssignChildIds([...assignChildIds, c.id]);
                          else setAssignChildIds(assignChildIds.filter(id => id !== c.id));
                        }}
                      />
                      <span>{c.age_tier === 1 ? '🐣' : c.age_tier === 2 ? '🌟' : c.age_tier === 3 ? '🦊' : '🧑'} {c.display_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1" disabled={!assignTemplateId || assignChildIds.length === 0}>
                  {t('parent.assign', 'Assign')}
                </button>
                <button type="button" onClick={() => { setShowAssignModal(false); setAssignTemplateId(null); setAssignChildIds([]); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200 hover:scale-[1.02] transition-transform">
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}