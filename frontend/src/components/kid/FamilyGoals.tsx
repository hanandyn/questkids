import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { FamilyGoal, FamilyGoalStatus } from '../../lib/types';

interface FamilyGoalsPanelProps {
  isParent?: boolean;
}

export function FamilyGoalsPanel({ isParent = false }: FamilyGoalsPanelProps) {
  const [activeGoals, setActiveGoals] = useState<FamilyGoalStatus[]>([]);
  const [allGoals, setAllGoals] = useState<FamilyGoal[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create form
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [targetRate, setTargetRate] = useState(80);
  const [targetStreak, setTargetStreak] = useState(0);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [message, setMessage] = useState('');

  const loadGoals = async () => {
    try {
      const [statuses, goals] = await Promise.all([
        api.getFamilyGoalStatus().catch(() => []),
        api.getFamilyGoals().catch(() => []),
      ]);
      setActiveGoals(statuses as unknown as FamilyGoalStatus[]);
      setAllGoals(goals as unknown as FamilyGoal[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFamilyGoal({
        name: goalName,
        description: goalDesc,
        target_completion_rate: targetRate,
        target_streak: targetStreak,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        reward_description: rewardDesc,
      });
      setShowCreate(false);
      setGoalName(''); setGoalDesc(''); setRewardDesc('');
      setMessage('Family goal created! 🎯');
      loadGoals();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: number) => {
    await api.deleteFamilyGoal(id);
    loadGoals();
  };

  const getProgressColor = (rate: number, target: number) => {
    if (rate >= target) return 'bg-green-500';
    if (rate >= target * 0.6) return 'bg-yellow-500';
    return 'bg-red-400';
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading family goals...</div>;

  return (
    <div>
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl mb-4 text-sm"
        >
          {message}
        </motion.div>
      )}

      {isParent && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowCreate(true)} className="bg-quest-blue text-white px-4 py-2 rounded-xl font-bold text-sm">
            + New Goal
          </button>
        </div>
      )}

      {activeGoals.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-lg">No active family goals</p>
          {isParent && <p className="text-sm">Create one to motivate the whole family!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeGoals.map(({ goal, current_completion_rate, weeks_progress, is_achieved, days_remaining }) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`card-quest ${is_achieved ? 'bg-green-50 border-green-300' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {is_achieved ? '🏆' : '🎯'} {goal.name}
                  </h3>
                  {goal.description && <p className="text-sm text-gray-500">{goal.description}</p>}
                </div>
                {isParent && (
                  <button onClick={() => handleDelete(goal.id)} className="text-xs text-red-400 hover:text-red-600">
                    ✕
                  </button>
                )}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Family completion</span>
                  <span className="font-bold">{current_completion_rate}% / {goal.target_completion_rate}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(current_completion_rate, 100)}%` }}
                    className={`h-full rounded-full transition-all ${getProgressColor(current_completion_rate, goal.target_completion_rate)}`}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>

              <div className="flex gap-4 text-xs text-gray-500 mb-2">
                {goal.target_streak > 0 && <span>🔥 Streak target: {goal.target_streak} weeks</span>}
                <span>⏰ {days_remaining} days left</span>
              </div>

              {is_achieved && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-bold text-center"
                >
                  🎉 Goal Achieved! {goal.reward_description && `Reward: ${goal.reward_description}`}
                </motion.div>
              )}

              {goal.reward_description && !is_achieved && (
                <p className="text-xs text-amber-600 mt-2">🎁 Reward: {goal.reward_description}</p>
              )}

              {/* Weekly progress bars */}
              {weeks_progress.length > 0 && (
                <div className="mt-3 flex gap-1">
                  {weeks_progress.map((w, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      title={`Week ${i + 1}: ${w.completion_rate}%`}
                    >
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${w.achieved ? 'bg-green-500' : 'bg-yellow-400'}`}
                          style={{ width: `${Math.min(w.completion_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Inactive goals */}
      {allGoals.filter(g => !g.is_active).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Past Goals</h3>
          <div className="space-y-2">
            {allGoals.filter(g => !g.is_active).map(goal => (
              <div key={goal.id} className="bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-400 flex justify-between">
                <span>{goal.name}</span>
                <span>{goal.target_completion_rate}% target</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-quest w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">🎯 Create Family Goal</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Goal name (e.g. Super Clean Week!)" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
              <input type="text" value={goalDesc} onChange={e => setGoalDesc(e.target.value)} placeholder="Description" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Target Rate (%)</label>
                  <input type="number" value={targetRate} onChange={e => setTargetRate(Number(e.target.value))} min={10} max={100} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Streak (weeks)</label>
                  <input type="number" value={targetStreak} onChange={e => setTargetStreak(Number(e.target.value))} min={0} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Starts</label>
                  <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" required />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Ends</label>
                  <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" required />
                </div>
              </div>
              <input type="text" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} placeholder="Reward (e.g. Pizza night!)" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" />
              <div className="flex gap-3">
                <button type="submit" className="bg-quest-blue text-white px-4 py-2 rounded-xl font-bold flex-1">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="bg-gray-200 px-4 py-2 rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** Simplified kid-friendly version — just shows the family goal card */
export function FamilyGoalKidCard() {
  const [goalStatuses, setGoalStatuses] = useState<FamilyGoalStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFamilyGoalStatus()
      .then(data => setGoalStatuses(data as unknown as FamilyGoalStatus[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || goalStatuses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-kid bg-gradient-to-r from-purple-50 to-pink-50 mb-4"
    >
      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
        🎯 Family Goal
      </h3>
      {goalStatuses.slice(0, 2).map(({ goal, current_completion_rate }) => (
        <div key={goal.id} className="mb-3 last:mb-0">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{goal.name}</span>
            <span className="font-bold">{current_completion_rate}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(current_completion_rate, 100)}%` }}
              className={`h-full rounded-full ${current_completion_rate >= goal.target_completion_rate ? 'bg-green-500' : 'bg-purple-500'}`}
              transition={{ duration: 1 }}
            />
          </div>
          {goal.reward_description && (
            <p className="text-xs text-amber-600 mt-1">🎁 {goal.reward_description}</p>
          )}
        </div>
      ))}
    </motion.div>
  );
}
