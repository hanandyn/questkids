import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { TaskInstance, KidRecap, AllowanceStatus, WeeklyRecap } from '../../lib/types';
import { CountdownTimer } from '../timer/CountdownTimer';
import { KidDailyRecap } from './KidDailyRecap';
import { RewardShop } from './RewardShop';
import { TaskVisual } from '../shared/TaskVisual';
import { FamilyMessageBoard } from '../shared/FamilyMessageBoard';
import * as audio from '../../lib/audio';

type ViewType = 'today' | 'habits' | 'money' | 'goals' | 'insights' | 'shop';

/**
 * Tier 5: Young Adult Dashboard (Ages 16–18)
 *
 * Design principles from PLAN.md §4.5:
 * - Minimalist, professional, customizable widgets
 * - Full adult literacy, no "parent voice"
 * - Autonomy: plan own week, set own goals
 * - Financial literacy integration
 * - Habit tracking focus
 * - Calendar sync
 */
export function YoungAdultDashboard() {
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [recap, setRecap] = useState<KidRecap | null>(null);
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [allowance, setAllowance] = useState<AllowanceStatus | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('today');
  const [activeTimer, setActiveTimer] = useState<TaskInstance | null>(null);
  const [toast, setToast] = useState('');
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);


  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [inst, kidRecap, weekly, allowanceStatus] = await Promise.all([
        api.getInstances(),
        api.getKidRecap().catch(() => null),
        api.getWeeklyRecap().catch(() => null),
        api.getAllowanceStatus().catch(() => null),
      ]);
      setInstances(inst as unknown as TaskInstance[]);
      if (kidRecap) setRecap(kidRecap as unknown as KidRecap);
      if (weekly) setWeeklyRecap(weekly as unknown as WeeklyRecap);
      if (allowanceStatus) setAllowance(allowanceStatus as unknown as AllowanceStatus);
    } catch { /* ignore */ }
    setPullRefreshing(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Auto-refresh tasks every 15 seconds for real-time parent updates
  useEffect(() => {
    const interval = setInterval(() => {
      api.getInstances().then(data => {
        setInstances(data as unknown as TaskInstance[]);
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(async () => {
    setPullRefreshing(true);
    await loadData();
  }, [loadData]);

  const handleStartTimer = async (instance: TaskInstance) => {
    audio.playButtonClick();
    try {
      await api.startTimer(instance.id);
      setActiveTimer({ ...instance, status: 'in_progress' });
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleCompleteTimed = async (instance: TaskInstance, elapsedSeconds: number) => {
    try {
      const result = await api.completeTask(instance.id, elapsedSeconds) as unknown as Record<string, unknown>;
      audio.playTaskComplete();
      showToast(`+${result.points_earned || 0} pts`);
      setActiveTimer(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error');
      setActiveTimer(null);
    }
  };

  const handleComplete = async (instance: TaskInstance) => {
    try {
      const result = await api.completeTask(instance.id, 0) as unknown as Record<string, unknown>;
      audio.playTaskComplete();
      showToast(`+${result.points_earned || 0} pts`);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleUndo = async (instance: TaskInstance) => {
    try {
      await api.undoTask(instance.id);
      showToast('Task undone — points returned');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error');
    }
  };

  // Compute stats
  const pending = instances.filter(i => i.status === 'pending');
  const completed = instances.filter(i => i.status === 'completed');
  const completionRate = pending.length + completed.length > 0
    ? Math.round((completed.length / (pending.length + completed.length)) * 100)
    : 0;

  // Build habit tracker data from instances
  const habitData = useMemo(() => {
    const habits: Record<string, { template_id: number; name: string; category: string; days: boolean[] }> = {};
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    for (const inst of instances) {
      const key = inst.template?.name || 'Unknown';
      if (!habits[key]) {
        habits[key] = {
          template_id: inst.template_id,
          name: key,
          category: inst.template?.category || 'general',
          days: Array(7).fill(false),
        };
      }
      if (inst.status === 'completed' && inst.date) {
        const instDate = new Date(inst.date);
        const dayDiff = Math.floor((instDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 7) {
          habits[key].days[dayDiff] = true;
        }
      }
    }
    return Object.values(habits).sort((a, b) => a.name.localeCompare(b.name));
  }, [instances]);

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Minimalist header */}
      <header className="border-b border-slate-800/60 fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
              {user?.display_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-100 leading-tight">{user?.display_name}</h1>
              <p className="text-[10px] text-slate-500">{todayDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">{user?.stars ?? 0}<span className="text-slate-600 ml-0.5">⭐</span></span>
              <span className="text-slate-400">{user?.gems ?? 0}<span className="text-slate-600 ml-0.5">💎</span></span>
              <span className="text-slate-500">Lv.{user?.level}</span>
            </div>
            <button onClick={logout} className="text-slate-600 hover:text-slate-400 transition-colors text-sm" title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </header>

      <div className="h-14"></div>

      <main className="max-w-4xl mx-auto px-5 py-4">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-sm text-center"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pull refresh */}
        {pullRefreshing && (
          <div className="text-center py-2 text-slate-600 text-xs animate-pulse">Refreshing…</div>
        )}

        {/* Progress summary — compact */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm text-slate-400">Today</span>
              <span className="text-sm font-medium text-slate-300">{completed.length}/{pending.length + completed.length} done</span>
            </div>
            <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
          {user?.current_streak != null && user.current_streak > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-200">{user.current_streak}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">day streak</div>
            </div>
          )}
        </div>

        {/* Tab navigation — minimal underline style */}
        <nav className="flex gap-1 mb-6 border-b border-slate-800/60 overflow-x-auto">
          {([
            { key: 'today' as const, label: 'Today' },
            { key: 'habits' as const, label: 'Habits' },
            { key: 'money' as const, label: 'Finance' },
            { key: 'goals' as const, label: 'Goals' },
            { key: 'insights' as const, label: 'Insights' },
            { key: 'shop' as const, label: '🎁 Shop' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeView === key ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
              {activeView === key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        {/* ── Today View ── */}
        {activeView === 'today' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="today"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {pending.length === 0 && completed.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-600 text-lg">No tasks assigned.</p>
                  <p className="text-slate-700 text-sm mt-1">Enjoy your free time.</p>
                </div>
              ) : (
                <>
                  {/* Pending tasks */}
                  {pending.map(inst => (
                    <div
                      key={inst.id}
                      className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/40 hover:border-slate-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <TaskVisual template={inst.template} size="sm" className="bg-slate-800/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-200 truncate">{inst.template?.name || 'Task'}</p>
                          <p className="text-xs text-slate-500">
                            {inst.template?.base_points} pts
                            {inst.template?.task_type === 'timed' && ` · ${Math.floor((inst.template?.timer_duration || 0) / 60)} min`}
                            {inst.template?.task_type === 'checklist' && ' · checklist'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => inst.template?.task_type === 'timed' ? handleStartTimer(inst) : handleComplete(inst)}
                        className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-900 bg-slate-200 hover:bg-white transition-colors flex-shrink-0"
                      >
                        {inst.template?.task_type === 'timed' ? 'Start' : 'Done'}
                      </button>
                    </div>
                  ))}

                  {/* Completed — collapsible */}
                  {completed.length > 0 && (
                    <details className="mt-4 group">
                      <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-300 select-none py-1">
                        Completed ({completed.length})
                      </summary>
                      <div className="space-y-1.5 mt-2">
                        {completed.slice(0, 15).map(inst => (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/20 border border-slate-800/20"
                          >
                            <span className="text-sm text-slate-500 line-through">{inst.template?.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-emerald-500/70">+{inst.points_earned}</span>
                              <button
                                onClick={() => handleUndo(inst)}
                                className="text-xs text-slate-600 hover:text-orange-400 transition-colors opacity-0 group-hover:opacity-100"
                                title="Undo"
                              >
                                ↩
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Habits View ── */}
        {activeView === 'habits' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">This Week's Habits</h2>
              <span className="text-xs text-slate-500">{habitData.length} tracked</span>
            </div>

            {habitData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Complete tasks to build habit history.</p>
              </div>
            ) : (
              <div className="space-y-2">
              {/* Day headers */}
              <div className="grid grid-cols-[1fr_repeat(7,1fr)] gap-1 px-1">
                <div></div>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-slate-600 font-medium py-1">{d}</div>
                ))}
              </div>
              {habitData.map(habit => {
                const doneCount = habit.days.filter(Boolean).length;
                const rate = Math.round((doneCount / 7) * 100);
                return (
                  <div
                    key={habit.name}
                    className="grid grid-cols-[1fr_repeat(7,1fr)] gap-1 items-center p-2.5 rounded-xl bg-slate-900/30 border border-slate-800/30"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-slate-300 truncate">{habit.name}</p>
                      <p className="text-[10px] text-slate-600">{doneCount}/7 · {rate}%</p>
                    </div>
                    {habit.days.map((done, i) => (
                      <div
                        key={i}
                        className={`aspect-square max-w-[28px] rounded-md mx-auto transition-all ${
                          done
                            ? 'bg-emerald-500/80 shadow-sm shadow-emerald-500/30'
                            : 'bg-slate-800/40 border border-slate-800/40'
                        }`}
                        title={done ? 'Completed' : 'Not done'}
                      />
                    ))}
                  </div>
                );
              })}
              </div>
            )}

            {/* Streak info */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-200">{user?.current_streak ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Current</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-200">{user?.longest_streak ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Longest</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-200">{user?.total_tasks_completed ?? 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Total Done</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Finance View ── */}
        {activeView === 'money' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-200">Financial Overview</h2>

            {!allowance?.enabled ? (
              <div className="text-center py-12 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <div className="text-4xl mb-3 opacity-30">🔒</div>
                <p className="text-slate-500 text-sm">Allowance not configured.</p>
                <p className="text-slate-600 text-xs mt-1">Ask a parent to set it up in family settings.</p>
              </div>
            ) : (
              <>
                {/* Balance card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/40 border border-slate-800/40">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-slate-100">
                    {allowance.currency === 'ILS' ? '₪' : allowance.currency === 'EUR' ? '€' : '$'}
                    {allowance.allowance_amount.toFixed(2)}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                    <span>{allowance.stars} ⭐</span>
                    <span className="text-slate-700">→</span>
                    <span>rate {allowance.allowance_rate}:1</span>
                  </div>
                </div>

                {/* Savings goal */}
                {allowance.savings_goal > 0 && (
                  <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/30">
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-300">Savings Goal</h3>
                      <span className="text-sm text-slate-500">
                        {allowance.currency === 'ILS' ? '₪' : '$'}{allowance.allowance_amount.toFixed(2)} /
                        {allowance.currency === 'ILS' ? '₪' : '$'}{allowance.savings_goal}
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-800/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, allowance.progress_percent)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-2">
                      {allowance.progress_percent}% complete
                      {allowance.progress_percent < 100 && (
                        <span className="text-slate-600">
                          {' '}·{' '}
                          {allowance.currency === 'ILS' ? '₪' : '$'}
                          {(allowance.savings_goal - allowance.allowance_amount).toFixed(2)} to go
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Earning rate */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
                    <p className="text-xs text-slate-500 mb-1">Exchange Rate</p>
                    <p className="text-lg font-semibold text-slate-300">
                      {allowance.allowance_rate}⭐ = 1{allowance.currency === 'ILS' ? '₪' : allowance.currency === 'EUR' ? '€' : '$'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
                    <p className="text-xs text-slate-500 mb-1">Stars Available</p>
                    <p className="text-lg font-semibold text-slate-300">{user?.stars ?? 0} ⭐</p>
                  </div>
                </div>

                {/* Tip */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/20">
                  <p className="text-sm text-slate-400">
                    💡 <span className="text-slate-500">Financial literacy:</span> Consistent daily habits compound over time.
                    Your {user?.current_streak ?? 0}-day streak is building real value.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Goals View ── */}
        {activeView === 'goals' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-200">Goals & Milestones</h2>

            {/* Level progress */}
            <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/30">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-400">Level Progress</p>
                  <p className="text-2xl font-bold text-slate-100">Level {user?.level}</p>
                </div>
                <p className="text-sm text-slate-500">{user?.xp} XP</p>
              </div>
              <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all"
                  style={{ width: `${((user?.xp || 0) % 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">
                {100 - ((user?.xp || 0) % 100)} XP to level {((user?.level || 1) + 1)}
              </p>
            </div>

            {/* Streak milestones */}
            <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/30">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Streak Milestones</h3>
              <div className="space-y-2">
                {[
                  { days: 7, label: '1 Week', emoji: '⚡', reached: (user?.current_streak ?? 0) >= 7 },
                  { days: 14, label: '2 Weeks', emoji: '💪', reached: (user?.current_streak ?? 0) >= 14 },
                  { days: 30, label: '1 Month', emoji: '👑', reached: (user?.current_streak ?? 0) >= 30 },
                  { days: 60, label: '2 Months', emoji: '🚀', reached: (user?.current_streak ?? 0) >= 60 },
                  { days: 100, label: '100 Days', emoji: '💎', reached: (user?.current_streak ?? 0) >= 100 },
                ].map(m => (
                  <div
                    key={m.days}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      m.reached ? 'bg-emerald-950/30' : 'bg-slate-800/20'
                    }`}
                  >
                    <span className={`text-lg ${m.reached ? '' : 'opacity-30'}`}>{m.emoji}</span>
                    <span className={`text-sm flex-1 ${m.reached ? 'text-slate-200' : 'text-slate-500'}`}>
                      {m.label} Streak
                    </span>
                    {m.reached ? (
                      <span className="text-xs text-emerald-500">✓ Achieved</span>
                    ) : (
                      <span className="text-xs text-slate-600">
                        {(user?.current_streak ?? 0)}/{m.days}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Savings goal mini */}
            {allowance?.enabled && allowance.savings_goal > 0 && (
              <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-300">Savings Goal</h3>
                  <span className="text-sm text-slate-500">{allowance.progress_percent}%</span>
                </div>
                <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, allowance.progress_percent)}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Insights View ── */}
        {activeView === 'insights' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-200">Insights</h2>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <p className="text-xs text-slate-500 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-100">{completionRate}%</p>
                <p className="text-xs text-slate-600 mt-1">Today</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <p className="text-xs text-slate-500 mb-1">Points Today</p>
                <p className="text-2xl font-bold text-slate-100">
                  {completed.reduce((sum, t) => sum + (t.points_earned || 0), 0)}
                </p>
                <p className="text-xs text-slate-600 mt-1">⭐ earned</p>
              </div>
            </div>

            {/* Weekly comparison */}
            {weeklyRecap && (
              <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <h3 className="text-sm font-medium text-slate-300 mb-4">This Week</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-slate-200">
                      {(weeklyRecap as unknown as Record<string, unknown>).total_points as number || 0}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">Points</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-200">
                      {(weeklyRecap as unknown as Record<string, unknown>).completion_rate as number || 0}%
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">Completion</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-200">
                      {(weeklyRecap as unknown as Record<string, unknown>).tasks_completed as number || 0}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">Tasks Done</p>
                  </div>
                </div>
              </div>
            )}

            {/* Daily recap */}
            {recap && (
              <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/30">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Today's Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tasks completed</span>
                    <span className="text-slate-300">{recap.tasks_completed ?? completed.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Points earned</span>
                    <span className="text-slate-300">{recap.points_earned ?? 0} ⭐</span>
                  </div>
                  {recap.family_rank && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Family rank</span>
                      <span className="text-slate-300">#{recap.family_rank}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Calendar feed link */}
            <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Calendar Sync</p>
                <p className="text-xs text-slate-500">Sync tasks with your calendar app</p>
              </div>
              <button
                onClick={() => {
                  const url = api.getCalendarFeedUrl(user?.id ?? 0);
                  navigator.clipboard.writeText(url).then(() => showToast('Calendar URL copied'));
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Copy URL
              </button>
            </div>
          </motion.div>
        )}
        {/* ── Shop View ── */}
        {activeView === 'shop' && (
          <RewardShop />
        )}
      </main>

      {/* Daily recap component */}
      <div className="max-w-4xl mx-auto px-5 pb-6">
        <KidDailyRecap />
      </div>

      {/* Family Message Board */}
      <div className="max-w-4xl mx-auto px-5 pb-6">
        <FamilyMessageBoard />
      </div>

      {/* Pull-to-refresh */}
      <div
        className="fixed inset-0 pointer-events-none"
        onTouchStart={e => setTouchStart(e.touches[0].clientY)}
        onTouchEnd={e => {
          const diff = e.changedTouches[0].clientY - touchStart;
          if (diff > 80 && window.scrollY < 10) handleRefresh();
        }}
      />

      {/* Timer overlay */}
      {activeTimer && (
        <CountdownTimer
          instance={activeTimer}
          onComplete={(elapsed) => handleCompleteTimed(activeTimer, elapsed)}
          onCancel={() => setActiveTimer(null)}
        />
      )}
    </div>
  );
}
