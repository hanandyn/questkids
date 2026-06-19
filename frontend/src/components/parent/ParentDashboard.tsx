import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { User, TaskTemplate, Reward } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import { FamilyGoalsPanel } from '../kid/FamilyGoals';
import { WeeklyRecap } from '../kid/WeeklyRecap';
import { InsightsDashboard } from './InsightsDashboard';
import { OrganizationDashboard } from './OrganizationDashboard';
import { TemplateMarketplace } from './TemplateMarketplace';
import { CalendarPage } from './CalendarPage';
import { TeacherDashboard } from './TeacherDashboard';
import { NotificationBell } from '../shared/NotificationBell';
import { AdminMetricsPanel } from './AdminMetricsPanel';

export function ParentDashboard() {
  const { user, logout } = useAuth();
  const [children, setChildren] = useState<User[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<'children' | 'tasks' | 'rewards' | 'goals' | 'recap' | 'insights' | 'organizations' | 'marketplace' | 'calendar' | 'teacher' | 'metrics'>('children');
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);

  // Child form
  const [childName, setChildName] = useState('');
  const [childUsername, setChildUsername] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [childAgeTier, setChildAgeTier] = useState(2);

  // Task form
  const [taskName, setTaskName] = useState('');
  const [taskType, setTaskType] = useState('one_shot');
  const [basePoints, setBasePoints] = useState(10);
  const [timerDuration, setTimerDuration] = useState(600);
  const [maxAsks, setMaxAsks] = useState(2);
  const firstAskBonus = 10;
  const penaltyPerAsk = 5;
  const [scheduleType, setScheduleType] = useState('daily');

  // Reward form
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardCostStars, setRewardCostStars] = useState(200);
  const [rewardCostGems, setRewardCostGems] = useState(0);
  const [rewardCategory, setRewardCategory] = useState('digital_fun');
  const [rewardReqApproval, setRewardReqApproval] = useState(true);

  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const [c, t, r] = await Promise.all([
        api.getChildren(),
        api.getTemplates(),
        api.getRewards(),
      ]);
      setChildren(c as unknown as User[]);
      setTemplates(t as unknown as TaskTemplate[]);
      setRewards(r as unknown as Reward[]);
    } catch (e) {
      console.error(e);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, []);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createChild({
        username: childUsername,
        display_name: childName,
        password: childPassword,
        role: 'child',
        age_tier: childAgeTier,
      });
      setShowAddChild(false);
      setChildName(''); setChildUsername(''); setChildPassword('');
      setMessage('Child added! 🎉');
      loadData();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Something went wrong'); }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTemplate({
        name: taskName,
        task_type: taskType,
        base_points: basePoints,
        timer_duration: taskType === 'timed' ? timerDuration : null,
        max_asks: maxAsks,
        bonus_first_ask: firstAskBonus,
        penalty_per_ask: -Math.abs(penaltyPerAsk),
        overstay_penalty_per_min: Math.abs(5),
        schedule_type: scheduleType,
        assigned_child_ids: children.map(c => c.id),
      });
      setShowAddTask(false);
      setMessage('Task template created! ✅');
      loadData();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Something went wrong'); }
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createReward({
        name: rewardName,
        description: rewardDesc,
        cost_stars: rewardCostStars,
        cost_gems: rewardCostGems,
        category: rewardCategory,
        requires_approval: rewardReqApproval,
      });
      setShowAddReward(false);
      setMessage('Reward added to shop! 🛒');
      loadData();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Something went wrong'); }
  };

  const handleDeleteTemplate = async (id: number) => {
    await api.deleteTemplate(id);
    loadData();
  };

  const handleDeleteReward = async (id: number) => {
    await api.deleteReward(id);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🏰 QuestKids <span className="text-sm text-gray-400">| Parent</span> <span className="text-xs text-gray-300 ml-1">v0.6.0</span>
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-gray-500">👋 {user?.display_name}</span>
            <button onClick={logout} className="text-sm text-red-500 hover:underline">{'Logout'}</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4"
            onAnimationComplete={() => setTimeout(() => setMessage(''), 3000)}
          >
            {message}
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {(['children', 'tasks', 'rewards', 'goals', 'recap', 'insights', 'marketplace', 'organizations', 'calendar', 'teacher', 'metrics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                activeTab === tab
                  ? 'bg-quest-blue text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'children' ? '👶 Children' : tab === 'tasks' ? '📋 Tasks' : tab === 'rewards' ? '🎁 Rewards' : tab === 'goals' ? '🎯 Goals' : tab === 'recap' ? '📊 Recap' : tab === 'insights' ? '💡 Insights' : tab === 'marketplace' ? '📋 Marketplace' : tab === 'organizations' ? '🏫 Orgs' : tab === 'calendar' ? '📅 Calendar' : tab === 'teacher' ? '👩‍🏫 Teacher' : '📈 Metrics'}
            </button>
          ))}
        </div>

        {/* Children Tab */}
        {activeTab === 'children' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Children ({children.length})</h2>
              <button onClick={() => setShowAddChild(true)} className="btn-primary">
                + Add Child
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map(child => (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-kid bg-gradient-to-br from-yellow-50 to-orange-50"
                >
                  <div className="text-center">
                    <div className="text-5xl mb-2">{
                      child.age_tier === 1 ? '🐣' :
                      child.age_tier === 2 ? '🌟' :
                      child.age_tier === 3 ? '🦊' :
                      child.age_tier === 4 ? '⚔️' : '👑'
                    }</div>
                    <h3 className="text-xl font-bold">{child.display_name}</h3>
                    <p className="text-sm text-gray-500">Level {child.level} • Tier {child.age_tier}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white/50 rounded-xl p-2">
                        <div className="text-lg font-bold">{child.stars}</div>
                        <div className="text-xs text-gray-500">⭐ Stars</div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-2">
                        <div className="text-lg font-bold">{child.gems}</div>
                        <div className="text-xs text-gray-500">💎 Gems</div>
                      </div>
                      <div className="bg-white/50 rounded-xl p-2">
                        <div className="text-lg font-bold">🔥 {child.current_streak}</div>
                        <div className="text-xs text-gray-500">Streak</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add Child Form */}
            {showAddChild && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="card-quest w-full max-w-md m-4">
                  <h3 className="text-xl font-bold mb-4">Add a Child</h3>
                  <form onSubmit={handleAddChild} className="space-y-3">
                    <input type="text" value={childName} onChange={e => setChildName(e.target.value)} placeholder="Display Name (e.g. Yossi)" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
                    <input type="text" value={childUsername} onChange={e => setChildUsername(e.target.value)} placeholder="Username for login" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
                    <input type="password" value={childPassword} onChange={e => setChildPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
                    <select value={childAgeTier} onChange={e => setChildAgeTier(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200">
                      <option value={1}>Tier 1 — Little Explorer (3–5)</option>
                      <option value={2}>Tier 2 — Young Adventurer (6–8)</option>
                      <option value={3}>Tier 3 — Quest Master (9–12)</option>
                      <option value={4}>Tier 4 — Self Manager (13–15)</option>
                      <option value={5}>Tier 5 — Young Adult (16–18)</option>
                    </select>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary flex-1">Create</button>
                      <button type="button" onClick={() => setShowAddChild(false)} className="btn-quest bg-gray-200 flex-1">Cancel</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Task Templates ({templates.length})</h2>
              <button onClick={() => setShowAddTask(true)} className="btn-primary">
                + Create Task
              </button>
            </div>
            <div className="space-y-3">
              {templates.map(tpl => (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="card-quest flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-lg">{tpl.name}</h3>
                    <div className="text-sm text-gray-500 flex gap-3">
                      <span>{tpl.task_type}</span>
                      <span>⭐ {tpl.base_points} pts</span>
                      <span>{tpl.schedule_type}</span>
                      {tpl.timer_duration && <span>⏱ {tpl.timer_duration}s</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-lg">No tasks yet. Create your first task!</p>
                </div>
              )}
            </div>

            {showAddTask && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                <div className="card-quest w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">Create Task Template</h3>
                  <form onSubmit={handleAddTask} className="space-y-3">
                    <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Task name (e.g. Shower Time 🚿)" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={taskType} onChange={e => setTaskType(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-gray-200">
                        <option value="one_shot">One Shot</option>
                        <option value="timed">Timed</option>
                        <option value="checklist">Checklist</option>
                        <option value="bonus">Bonus</option>
                      </select>
                      <select value={scheduleType} onChange={e => setScheduleType(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-gray-200">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="weekdays">Weekdays</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Base Points</label>
                        <input type="number" value={basePoints} onChange={e => setBasePoints(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Timer (sec)</label>
                        <input type="number" value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Max Asks</label>
                        <input type="number" value={maxAsks} onChange={e => setMaxAsks(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary flex-1">Create Task</button>
                      <button type="button" onClick={() => setShowAddTask(false)} className="btn-quest bg-gray-200">Cancel</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Reward Shop ({rewards.length})</h2>
              <button onClick={() => setShowAddReward(true)} className="btn-primary">
                + Add Reward
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map(reward => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-quest bg-gradient-to-br from-yellow-50 to-amber-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{reward.name}</h3>
                      {reward.description && <p className="text-sm text-gray-500">{reward.description}</p>}
                      <div className="flex gap-3 mt-2">
                        <span className="bg-yellow-100 px-3 py-1 rounded-full text-sm font-bold">⭐ {reward.cost_stars}</span>
                        {reward.cost_gems > 0 && <span className="bg-cyan-100 px-3 py-1 rounded-full text-sm font-bold">💎 {reward.cost_gems}</span>}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {reward.requires_approval ? 'Needs approval' : 'Auto-redeem'}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteReward(reward.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                </motion.div>
              ))}
            </div>

            {showAddReward && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="card-quest w-full max-w-md m-4">
                  <h3 className="text-xl font-bold mb-4">Add Reward</h3>
                  <form onSubmit={handleAddReward} className="space-y-3">
                    <input type="text" value={rewardName} onChange={e => setRewardName(e.target.value)} placeholder="Reward name" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
                    <input type="text" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} placeholder="Description" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Cost (Stars)</label>
                        <input type="number" value={rewardCostStars} onChange={e => setRewardCostStars(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Cost (Gems)</label>
                        <input type="number" value={rewardCostGems} onChange={e => setRewardCostGems(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border-2 border-gray-200" />
                      </div>
                    </div>
                    <select value={rewardCategory} onChange={e => setRewardCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200">
                      <option value="digital_fun">📱 Digital Fun</option>
                      <option value="food">🍕 Food & Treats</option>
                      <option value="privileges">⭐ Privileges</option>
                      <option value="experiences">🎯 Experiences</option>
                      <option value="items">🎁 Physical Items</option>
                    </select>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={rewardReqApproval} onChange={e => setRewardReqApproval(e.target.checked)} />
                      <span className="text-sm">Requires parent approval</span>
                    </label>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary flex-1">Add Reward</button>
                      <button type="button" onClick={() => setShowAddReward(false)} className="btn-quest bg-gray-200">Cancel</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Family Goals Tab */}
        {activeTab === 'goals' && <FamilyGoalsPanel isParent />}

        {/* Weekly Recap Tab */}
        {activeTab === 'recap' && <WeeklyRecap isParent />}

        {/* Insights Dashboard Tab */}
        {activeTab === 'insights' && <InsightsDashboard />}

        {/* Phase 5 Tabs */}
        {activeTab === 'marketplace' && <TemplateMarketplace onClose={() => setActiveTab('tasks')} onFork={() => {}} />}
        {activeTab === 'organizations' && <OrganizationDashboard onClose={() => setActiveTab('children')} />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'teacher' && <TeacherDashboard onClose={() => setActiveTab('children')} />}

        {/* Phase 6: Metrics */}
        {activeTab === 'metrics' && <AdminMetricsPanel />}
      </div>
    </div>
  );
}
