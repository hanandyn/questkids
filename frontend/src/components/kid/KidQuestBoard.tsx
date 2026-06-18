import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { TaskInstance, Reward, LeaderboardEntry } from '../../lib/types';
import { CountdownTimer } from '../timer/CountdownTimer';

export function KidQuestBoard() {
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeView, setActiveView] = useState<'quests' | 'shop' | 'leaderboard'>('quests');
  const [activeTimer, setActiveTimer] = useState<TaskInstance | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'info'>('info');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [inst, rw, lb] = await Promise.all([
        api.getInstances(),
        api.getRewards(),
        api.getLeaderboard(),
      ]);
      setInstances(inst as unknown as TaskInstance[]);
      setRewards((rw as unknown as Reward[]).filter((r: Reward) => r.is_active));
      setLeaderboard((lb as { leaderboard: LeaderboardEntry[] }).leaderboard || []);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const showMessage = (msg: string, type: 'success' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleStartTimer = async (instance: TaskInstance) => {
    try {
      await api.startTimer(instance.id);
      setActiveTimer({ ...instance, status: 'in_progress' });
      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const handleCompleteTask = async (instance: TaskInstance, elapsedSeconds: number) => {
    try {
      const result = await api.completeTask(instance.id, elapsedSeconds);
      setActiveTimer(null);
      showMessage(`🎉 You earned ${result.points_earned} points!`, 'success');
      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const handleCompleteOneShot = async (instance: TaskInstance) => {
    try {
      const result = await api.completeTask(instance.id, 0);
      showMessage(`🎉 +${result.points_earned} points!`, 'success');
      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const handleRedeemReward = async (reward: Reward) => {
    if (!user) return;
    if (reward.cost_stars > user.stars) {
      showMessage('Not enough stars! Keep questing! ⭐', 'info');
      return;
    }
    try {
      await api.redeemReward(reward.id);
      showMessage(`Redeemed: ${reward.name}! 🎁`, 'success');
      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const pendingTasks = instances.filter(i => i.status === 'pending');
  const inProgressTasks = instances.filter(i => i.status === 'in_progress');
  const completedTasks = instances.filter(i => i.status === 'completed');

  const getRankEmoji = () => {
    const lv = user?.level || 1;
    if (lv <= 5) return '🐣';
    if (lv <= 10) return '🌟';
    if (lv <= 15) return '🦊';
    if (lv <= 20) return '⚔️';
    if (lv <= 30) return '🦸';
    return '👑';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-quest-bg to-yellow-100">
      {/* Kid Header */}
      <header className="bg-white/90 backdrop-blur shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              🏰 QuestKids
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-quest-gold/20 px-3 py-1 rounded-full font-bold">
                ⭐ {user?.stars || 0}
              </span>
              <span className="bg-quest-gem/20 px-3 py-1 rounded-full font-bold">
                💎 {user?.gems || 0}
              </span>
              <span className="bg-red-100 px-3 py-1 rounded-full font-bold">
                🔥 {user?.current_streak || 0}
              </span>
              <button onClick={logout} className="text-xs text-red-400 ml-2">🚪</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-kid bg-gradient-to-r from-quest-blue to-quest-purple text-white text-center mb-6"
        >
          <div className="text-6xl mb-2 animate-float">{getRankEmoji()}</div>
          <h2 className="text-3xl font-bold">{user?.display_name}</h2>
          <p className="text-white/80">
            Level {user?.level} • {(user?.current_streak ?? 0) > 0 ? `🔥 ${user?.current_streak}-day streak!` : 'Start your streak today!'}
          </p>
          <div className="mt-3 inline-block bg-white/20 px-4 py-2 rounded-full text-sm">
            🛡️ Freeze tokens: {user?.freeze_tokens || 0}
          </div>
        </motion.div>

        {/* Message Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-4 px-6 py-3 rounded-xl text-lg font-bold text-center ${
                messageType === 'success'
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-blue-100 text-blue-800 border-2 border-blue-300'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Nav */}
        <div className="flex gap-2 mb-6 justify-center">
          {([
            ['quests', '⚔️ Quests'],
            ['shop', '🛒 Shop'],
            ['leaderboard', '🏆 Leaderboard'],
          ] as const).map(([view, label]) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-6 py-3 rounded-2xl font-bold text-base md:text-lg transition-all ${
                activeView === view
                  ? 'bg-quest-blue text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active Timer Overlay */}
        {activeTimer && (
          <CountdownTimer
            instance={activeTimer}
            onComplete={(elapsed) => handleCompleteTask(activeTimer, elapsed)}
            onCancel={() => setActiveTimer(null)}
          />
        )}

        {/* Quests View */}
        {activeView === 'quests' && (
          <div className="space-y-4">
            {/* In Progress */}
            {inProgressTasks.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">⏳ In Progress</h3>
                {inProgressTasks.map(inst => (
                  <motion.div
                    key={inst.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card-kid bg-gradient-to-r from-blue-50 to-cyan-50 mb-3 animate-pulse-glow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-lg">{inst.template?.name || 'Task'}</h4>
                        <p className="text-sm text-gray-500">Timer running...</p>
                      </div>
                      <button
                        onClick={() => setActiveTimer(inst)}
                        className="btn-primary"
                      >
                        ⏱ View Timer
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pending Tasks */}
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              📋 Today's Quests ({pendingTasks.length})
            </h3>
            {pendingTasks.length === 0 && completedTasks.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-7xl mb-4 animate-float">🌟</div>
                <p className="text-xl text-gray-500">No quests for today!</p>
                <p className="text-gray-400">Enjoy your free time, adventurer!</p>
              </motion.div>
            )}
            {pendingTasks.map(inst => (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-kid bg-white hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {inst.template?.task_type === 'timed' ? '⏱️' :
                         inst.template?.task_type === 'checklist' ? '📋' :
                         inst.template?.task_type === 'bonus' ? '🎁' : '📌'}
                      </span>
                      <div>
                        <h4 className="font-bold text-lg">{inst.template?.name || 'Quest'}</h4>
                        <div className="flex gap-3 text-sm text-gray-500">
                          <span>⭐ {inst.template?.base_points} pts</span>
                          {inst.template?.timer_duration && (
                            <span>⏱ {Math.floor(inst.template.timer_duration / 60)} min</span>
                          )}
                          {(inst.template?.bonus_first_ask ?? 0) > 0 && (
                            <span className="text-green-600">+{inst.template?.bonus_first_ask} on 1st ask</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {inst.template?.task_type === 'timed' ? (
                      <button
                        onClick={() => handleStartTimer(inst)}
                        className="btn-primary text-base"
                      >
                        ▶ Start
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteOneShot(inst)}
                        className="btn-success text-base"
                      >
                        ✅ Done
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Completed Today */}
            {completedTasks.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2 mt-6">
                  ✅ Completed ({completedTasks.length})
                </h3>
                {completedTasks.slice(0, 5).map(inst => (
                  <motion.div
                    key={inst.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="card-quest bg-green-50/50 border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold line-through text-gray-500">{inst.template?.name}</h4>
                        <span className="text-sm text-green-600">+{inst.points_earned} points</span>
                      </div>
                      <span className="text-2xl">✅</span>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Reward Shop View */}
        {activeView === 'shop' && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🛒 Reward Shop
              <span className="text-base font-normal text-gray-500">
                (Balance: ⭐{user?.stars} 💎{user?.gems})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map(reward => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.03 }}
                  className={`card-kid bg-gradient-to-br from-yellow-50 to-amber-50 ${
                    user && reward.cost_stars > user.stars ? 'opacity-50' : ''
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {reward.category === 'digital_fun' ? '📱' :
                       reward.category === 'food' ? '🍕' :
                       reward.category === 'privileges' ? '⭐' :
                       reward.category === 'experiences' ? '🎯' : '🎁'}
                    </div>
                    <h3 className="font-bold text-lg">{reward.name}</h3>
                    {reward.description && (
                      <p className="text-sm text-gray-500">{reward.description}</p>
                    )}
                    <div className="flex justify-center gap-3 mt-3">
                      {reward.cost_stars > 0 && (
                        <span className="bg-yellow-100 px-3 py-1 rounded-full text-sm font-bold">⭐ {reward.cost_stars}</span>
                      )}
                      {reward.cost_gems > 0 && (
                        <span className="bg-cyan-100 px-3 py-1 rounded-full text-sm font-bold">💎 {reward.cost_gems}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRedeemReward(reward)}
                      disabled={!!(user && reward.cost_stars > user.stars)}
                      className="btn-gold mt-3 w-full"
                    >
                      🎁 Redeem
                    </button>
                  </div>
                </motion.div>
              ))}
              {rewards.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <div className="text-5xl mb-4">🛒</div>
                  <p>No rewards yet. Ask a parent to add some!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard View */}
        {activeView === 'leaderboard' && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🏆 Family Leaderboard</h2>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <motion.div
                  key={entry.child_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`card-quest ${
                    entry.child_id === user?.id ? 'bg-blue-50 border-blue-300 border-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">
                        {entry.display_name}
                        {entry.child_id === user?.id && ' (You!)'}
                      </h3>
                      <div className="flex gap-3 text-sm text-gray-500">
                        <span>Lv.{entry.level}</span>
                        <span>🔥 {entry.current_streak}d</span>
                        <span>{entry.completion_rate}% complete</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-quest-gold">⭐ {entry.stars}</div>
                      <div className="text-xs text-gray-400">💎 {entry.gems}</div>
                    </div>
                  </div>
                  {/* Simple bar chart */}
                  <div className="mt-2 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(entry.completion_rate, 100)}%` }}
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-quest-gold' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-quest-blue'
                      }`}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
