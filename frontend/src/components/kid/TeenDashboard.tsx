import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { TaskInstance, KidRecap, AllowanceStatus } from '../../lib/types';
import { CountdownTimer } from '../timer/CountdownTimer';
import { FamilyMessageBoard } from '../shared/FamilyMessageBoard';
import { KidDailyRecap } from './KidDailyRecap';
import { RewardShop } from './RewardShop';
import { TaskVisual } from '../shared/TaskVisual';
import * as audio from '../../lib/audio';

type ViewType = 'tasks' | 'calendar' | 'stats' | 'allowance' | 'shop' | 'settings';

const ACCENT_COLORS = ['#06b6d4', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];

export function TeenDashboard() {
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [recap, setRecap] = useState<KidRecap | null>(null);
  const [allowance, setAllowance] = useState<AllowanceStatus | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('tasks');
  const [activeTimer, setActiveTimer] = useState<TaskInstance | null>(null);
  const [message, setMessage] = useState('');
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [inst, kidRecap, allowanceStatus] = await Promise.all([
        api.getInstances(),
        api.getKidRecap().catch(() => null),
        api.getAllowanceStatus().catch(() => null),
      ]);
      setInstances(inst as unknown as TaskInstance[]);
      if (kidRecap) setRecap(kidRecap as unknown as KidRecap);
      if (allowanceStatus) setAllowance(allowanceStatus as unknown as AllowanceStatus);
    } catch { /* ignore */ }
    setPullRefreshing(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

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
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCompleteTimed = async (instance: TaskInstance, elapsedSeconds: number) => {
    try {
      const result = await api.completeTask(instance.id, elapsedSeconds) as unknown as Record<string, unknown>;
      audio.playTaskComplete();
      const points = result.points_earned || 0;
      setMessage(`+${points} pts — Nice work!`);
      setActiveTimer(null);
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setActiveTimer(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUndoTask = async (instance: TaskInstance) => {
    try {
      await api.undoTask(instance.id);
      setMessage('↩️ Undone — points returned');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleComplete = async (instance: TaskInstance) => {
    try {
      const result = await api.completeTask(instance.id, 0) as unknown as Record<string, unknown>;
      audio.playTaskComplete();
      const points = result.points_earned || 0;
      setMessage(`+${points} pts — Nice work!`);
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
    }
  };

  const pendingTasks = instances.filter(i => i.status === 'pending');
  const completedTasks = instances.filter(i => i.status === 'completed');
  const completionRate = pendingTasks.length + completedTasks.length > 0
    ? Math.round((completedTasks.length / (pendingTasks.length + completedTasks.length)) * 100)
    : 0;

  // Week day labels for mini calendar
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Dark Header with glass effect */}
      <header className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = ACCENT_COLORS[(ACCENT_COLORS.indexOf(accentColor) + 1) % ACCENT_COLORS.length];
                setAccentColor(next);
              }}
              className="text-2xl"
              title="Change accent color"
            >
              🎨
            </button>
            <h1 className="text-lg font-semibold tracking-tight">
              {user?.display_name}
            </h1>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
              Lv.{user?.level} • Tier {user?.age_tier}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm bg-gray-800/50 rounded-lg px-3 py-1.5">
              <span className="flex items-center gap-1">
                <span>⭐</span> {user?.stars}
              </span>
              <span className="text-cyan-400 flex items-center gap-1">
                <span>💎</span> {user?.gems}
              </span>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-gray-300 p-1">🚪</button>
          </div>
        </div>
      </header>

      <div className="h-12"></div>
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Pull-to-refresh indicator */}
        {pullRefreshing && (
          <motion.div
            className="text-center py-2 text-gray-500 text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity }}
          >
            Refreshing...
          </motion.div>
        )}

        {/* Message toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-xl mb-4 text-center font-medium"
              style={{ borderColor: accentColor, backgroundColor: `${accentColor}20` }}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Tasks Done', value: user?.total_tasks_completed || 0, icon: '✅' },
            { label: 'Stars', value: user?.stars || 0, icon: '⭐' },
            { label: 'Streak', value: `🔥 ${user?.current_streak || 0}`, icon: '' },
            { label: 'Rate', value: `${completionRate}%`, icon: '📊' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {stat.icon} {stat.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: accentColor }}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 overflow-x-auto">
          {([
            { key: 'tasks' as const, label: '📋 Tasks' },
            { key: 'calendar' as const, label: '📅 Calendar' },
            { key: 'stats' as const, label: '📊 Stats' },
            { key: 'allowance' as const, label: '💰 Money' },
            { key: 'shop' as const, label: '🎁 Shop' },
            { key: 'settings' as const, label: '⚙️ Settings' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                activeView === key
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={activeView === key ? { backgroundColor: accentColor } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-xl text-gray-500">No tasks yet. Ask a parent to set some up!</p>
                </div>
              ) : (
                <>
                  {/* Completion progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Today's Progress</span>
                      <span>{completedTasks.length}/{pendingTasks.length + completedTasks.length}</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: accentColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${completionRate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pendingTasks.map(inst => (
                      <motion.div
                        key={inst.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <TaskVisual template={inst.template} size="md" className="bg-gray-800" />
                          <div>
                            <h3 className="font-medium">{inst.template?.name || 'Task'}</h3>
                            <p className="text-xs text-gray-500">
                              {inst.template?.base_points} pts
                              {inst.template?.task_type === 'timed' && ` • ${Math.floor((inst.template?.timer_duration || 0) / 60)}min`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => inst.template?.task_type === 'timed' ? handleStartTimer(inst) : handleComplete(inst)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          {inst.template?.task_type === 'timed' ? '▶ Start' : '✓ Done'}
                        </button>
                      </motion.div>
                    ))}

                    {completedTasks.length > 0 && (
                      <details className="mt-6">
                        <summary className="text-sm text-gray-500 cursor-pointer mb-2 hover:text-gray-300">
                          Completed ({completedTasks.length}) ▸
                        </summary>
                        <div className="space-y-2">
                          {completedTasks.slice(0, 10).map(inst => (
                            <div key={inst.id} className="bg-gray-900/50 border border-gray-800/30 rounded-xl p-3 flex items-center justify-between opacity-60">
                              <span className="line-through text-gray-500">{inst.template?.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 text-sm">+{inst.points_earned}</span>
                                <button
                                  onClick={() => handleUndoTask(inst)}
                                  className="text-xs px-2 py-1 bg-orange-900/30 text-orange-400 rounded-lg hover:bg-orange-900/50 transition-colors"
                                  title="Undo"
                                >
                                  ↩️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-bold mb-4">This Week</h2>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(d => (
                <div key={d} className="text-center text-xs text-gray-500 py-1 font-medium">{d}</div>
              ))}
              {Array.from({ length: 7 }, (_, i) => {
                const now = new Date();
                const dayOffset = i - ((now.getDay() + 6) % 7);
                const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
                const isToday = dayOffset === 0;
                const dayTasks = instances.filter(inst => {
                  if (!inst.date) return false;
                  const instDate = new Date(inst.date);
                  return instDate.getDate() === date.getDate();
                });
                const completedCount = dayTasks.filter(t => t.status === 'completed').length;
                const hasPending = dayTasks.some(t => t.status === 'pending');

                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs border transition-all ${
                      isToday
                        ? 'border-2 font-bold'
                        : 'border-gray-800'
                    }`}
                    style={isToday ? { borderColor: accentColor, backgroundColor: `${accentColor}15` } : { backgroundColor: hasPending ? '#1a1a2e' : '#111' }}
                  >
                    <span className="text-gray-400">{date.getDate()}</span>
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {completedCount > 0 && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                        )}
                        {hasPending && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Stats View */}
        {activeView === 'stats' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-bold mb-6">Your Stats</h2>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Points This Week', value: recap?.points_earned || 0, suffix: '⭐' },
                { label: 'Completion Rate', value: `${recap?.completion_rate || 0}%`, suffix: '' },
                { label: 'Longest Streak', value: user?.longest_streak || 0, suffix: '🔥' },
                { label: 'Family Rank', value: `#${recap?.family_rank || '?'}`, suffix: `/ ${recap?.total_siblings || '?'}` },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: accentColor }}>{stat.value} {stat.suffix}</p>
                </div>
              ))}
            </div>

            {/* Weekly bar chart (visual) */}
            <h3 className="text-sm font-medium text-gray-400 mb-3">Weekly Progress</h3>
            <div className="flex items-end gap-1 h-24">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const height = 20 + ((i * 47 + 11) % 70);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-md"
                      style={{ backgroundColor: accentColor, opacity: 0.3 + ((i * 0.1) % 0.7) }}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    />
                    <span className="text-xs text-gray-600">{day}</span>
                  </div>
                );
              })}
            </div>

            {/* Achievements */}
            {recap?.achievements_unlocked && recap.achievements_unlocked.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Achievements</h3>
                <div className="flex flex-wrap gap-2">
                  {recap.achievements_unlocked.map((a, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-300">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Allowance View */}
        {activeView === 'allowance' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>💰</span> Allowance
            </h2>

            {!allowance?.enabled ? (
              <div className="text-center py-10">
                <div className="text-6xl mb-4">🔒</div>
                <p className="text-gray-500 text-lg">Allowance not set up yet.</p>
                <p className="text-gray-600 text-sm mt-2">Ask a parent to configure it in Settings.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current balance */}
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: accentColor }}>
                    {allowance.currency === 'ILS' ? '₪' : '$'}{allowance.allowance_amount.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {allowance.stars} stars × rate ({allowance.allowance_rate}:1)
                  </p>
                </div>

                {/* Savings goal */}
                {allowance.savings_goal > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Savings Goal</span>
                      <span className="text-gray-300">
                        {allowance.currency === 'ILS' ? '₪' : '$'}{allowance.allowance_amount.toFixed(2)} / {allowance.currency === 'ILS' ? '₪' : '$'}{allowance.savings_goal}
                      </span>
                    </div>
                    <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#22c55e' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, allowance.progress_percent)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-2">{allowance.progress_percent}% to goal</p>
                  </div>
                )}

                {/* Rate info */}
                <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
                  <p>💰 {allowance.allowance_rate} stars = 1 {allowance.currency} unit</p>
                  <p>⭐ Rate: {allowance.stars} stars = {allowance.currency === 'ILS' ? '₪' : '$'}{allowance.allowance_amount.toFixed(2)}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Shop View */}
        {activeView === 'shop' && <RewardShop />}

        {/* Settings View */}
        {activeView === 'settings' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <h2 className="text-lg font-bold mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">Accent Color</h3>
                <div className="flex gap-2">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        accentColor === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Set accent color to ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">Refresh Data</h3>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">Account</h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>Username: {user?.username}</p>
                  <p>Level: {user?.level} (Tier {user?.age_tier})</p>
                  <p>XP: {user?.xp}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Daily Recap */}
      <div className="max-w-2xl mx-auto px-4">
        <KidDailyRecap />
      </div>

      {/* Family Message Board */}
      <div className="max-w-5xl mx-auto px-4 pb-6">
        <FamilyMessageBoard />
      </div>

      {/* Touch handler for pull-to-refresh */}
      <div
        className="fixed inset-0 pointer-events-none"
        onTouchStart={e => setTouchStart(e.touches[0].clientY)}
        onTouchEnd={e => {
          const diff = e.changedTouches[0].clientY - touchStart;
          if (diff > 80 && window.scrollY < 10) {
            handleRefresh();
          }
        }}
      />

      {/* Timer overlay for timed tasks */}
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
