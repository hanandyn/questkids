import React, { useCallback, useEffect, useState } from 'react';
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
import { FulfillmentQueue } from './FulfillmentQueue';
import { SmartSuggestionsPanel } from './SmartSuggestionsPanel';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { FamilyMessageBoard } from '../shared/FamilyMessageBoard';
import { RitualSettings } from '../settings/RitualSettings';
import { KidCredentialsPanel } from './KidCredentialsPanel';
import { ParentTaskManagement } from './ParentTaskManagement';
import { NLTaskCreator } from './NLTaskCreator';
import { PhotoApprovalQueue } from './PhotoApprovalQueue';
import { TaskVisual } from '../shared/TaskVisual';
import { DEFAULT_TASK_IMAGES, inferTaskVisual } from '../../lib/taskVisuals';

type RewardRequest = {
  id: number;
  name: string;
  description?: string;
  suggested_cost_stars: number;
  category?: string;
  status: string;
  child_id: number;
};

export function ParentDashboard() {
  const { user, logout } = useAuth();
  const [children, setChildren] = useState<User[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<'children' | 'tasks' | 'manage' | 'rewards' | 'goals' | 'recap' | 'insights' | 'organizations' | 'marketplace' | 'calendar' | 'teacher' | 'metrics' | 'analytics' | 'suggestions' | 'rituals' | 'approvals'>('children');
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);

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
  const [taskAssignKids, setTaskAssignKids] = useState<number[]>([]);
  const [taskIcon, setTaskIcon] = useState('');
  const [taskImageUrl, setTaskImageUrl] = useState('');
  const [taskImageFile, setTaskImageFile] = useState<File | null>(null);
  const [taskImagePreview, setTaskImagePreview] = useState('');

  // Reward form
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardCostStars, setRewardCostStars] = useState(200);
  const [rewardCostGems, setRewardCostGems] = useState(0);
  const [rewardCategory, setRewardCategory] = useState('digital_fun');
  const [rewardReqApproval, setRewardReqApproval] = useState(true);

  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [c, t, r, rr] = await Promise.all([
        api.getChildren(),
        api.getTemplates(),
        api.getRewards(),
        api.getRewardRequests().catch(() => []),
      ]);
      setChildren(c as unknown as User[]);
      setTemplates(t as unknown as TaskTemplate[]);
      setRewards(r as unknown as Reward[]);
      setRewardRequests(rr as unknown as RewardRequest[]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

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
      const created = await api.createTemplate({
        name: taskName,
        task_type: taskType,
        base_points: basePoints,
        timer_duration: taskType === 'timed' ? timerDuration : null,
        max_asks: maxAsks,
        bonus_first_ask: firstAskBonus,
        penalty_per_ask: -Math.abs(penaltyPerAsk),
        overstay_penalty_per_min: Math.abs(5),
        schedule_type: scheduleType,
        assigned_child_ids: taskAssignKids.length > 0 ? taskAssignKids : null,
        icon: taskIcon || undefined,
        image_url: taskImageUrl || undefined,
      }) as unknown as TaskTemplate;
      if (taskImageFile) await api.uploadTemplateImage(created.id, taskImageFile);
      setShowAddTask(false);
      setTaskName(''); setTaskAssignKids([]); setTaskIcon(''); setTaskImageUrl(''); handleTaskImageFile(null);
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
    if (!confirm('Delete this task? Pending instances will be removed.')) return;
    await api.deleteTemplate(id);
    setMessage('Task deleted ✅');
    loadData();
  };

  const handleEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    try {
      await api.updateTemplate(editingTemplate.id, {
        name: taskName,
        task_type: taskType,
        base_points: basePoints,
        timer_duration: taskType === 'timed' ? timerDuration : null,
        max_asks: maxAsks,
        schedule_type: scheduleType,
        assigned_kids: taskAssignKids.length > 0 ? taskAssignKids : null,
        icon: taskIcon || undefined,
        image_url: taskImageUrl || undefined,
      });
      if (taskImageFile) await api.uploadTemplateImage(editingTemplate.id, taskImageFile);
      setEditingTemplate(null);
      setTaskName(''); setTaskAssignKids([]); setTaskIcon(''); setTaskImageUrl(''); handleTaskImageFile(null);
      setMessage('Task updated! ✅');
      loadData();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Something went wrong'); }
  };

  const handleCleanOrphaned = async () => {
    try {
      const result = await api.cleanOrphanedInstances() as unknown as { count: number };
      setMessage(`Cleaned ${result.count} orphaned task(s) 🧹`);
      loadData();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Error'); }
  };

  const handleResolveRequest = async (id: number, approved: boolean, stars: number) => {
    try {
      await api.resolveRewardRequest(id, { approved, cost_stars: stars, cost_gems: 0 });
      setMessage(approved ? 'Reward added to shop! ✅' : 'Request rejected');
      loadData();
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Error'); }
  };

  const openEditTemplate = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setTaskName(tpl.name);
    setTaskType(tpl.task_type);
    setBasePoints(tpl.base_points);
    setTimerDuration(tpl.timer_duration || 600);
    setMaxAsks(tpl.max_asks);
    setScheduleType(tpl.schedule_type);
    setTaskIcon(tpl.icon || '');
    setTaskImageUrl(tpl.image_url || '');
    handleTaskImageFile(null);
    setTaskAssignKids((tpl as unknown as { assigned_kids?: number[] }).assigned_kids || []);
  };

  const handleTaskImageFile = (file: File | null) => {
    if (taskImagePreview) URL.revokeObjectURL(taskImagePreview);
    setTaskImageFile(file);
    setTaskImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const taskPreview = {
    name: taskName,
    category: '',
    task_type: taskType as TaskTemplate['task_type'],
    icon: taskIcon || inferTaskVisual(taskName).icon,
    image_url: taskImagePreview || taskImageUrl || inferTaskVisual(taskName).imageUrl,
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
            🏰 QuestKids <span className="text-sm text-gray-400">| Parent</span> <span className="text-xs text-gray-300 ml-1">v1.0.0</span>
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
          {(['children', 'tasks', 'manage', 'rewards', 'goals', 'recap', 'insights', 'analytics', 'suggestions', 'rituals', 'marketplace', 'organizations', 'calendar', 'teacher', 'metrics', 'approvals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                activeTab === tab
                  ? 'bg-quest-blue text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'children' ? '👶 Children' : tab === 'manage' ? '⚖️ Manage' : tab === 'tasks' ? '📋 Tasks' : tab === 'rewards' ? '🎁 Rewards' : tab === 'goals' ? '🎯 Goals' : tab === 'recap' ? '📊 Recap' : tab === 'insights' ? '💡 Insights' : tab === 'analytics' ? '📊 Analytics' : tab === 'suggestions' ? '🧠 Tips' : tab === 'rituals' ? '🌅 Rituals' : tab === 'marketplace' ? '📋 Marketplace' : tab === 'organizations' ? '🏫 Orgs' : tab === 'calendar' ? '📅 Calendar' : tab === 'teacher' ? '👩‍🏫 Teacher' : tab === 'approvals' ? '📸 Approvals' : '📈 Metrics'}
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

            {/* Kid Login Info Panel */}
            <KidCredentialsPanel children={children} />

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
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-xl font-bold">Task Templates ({templates.length})</h2>
              <div className="flex gap-2">
                <NLTaskCreator children={children} onCreated={() => { loadData(); }} />
                <button onClick={() => setShowAddTask(true)} className="btn-primary">
                  + Create Task
                </button>
                <button onClick={() => handleCleanOrphaned()} className="btn-quest bg-gray-200 text-sm" title="Remove tasks from deleted templates">
                  🧹 Clean
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {templates.map(tpl => {
                const assignedKids = (tpl as unknown as { assigned_kids?: number[] }).assigned_kids;
                const assignedNames = assignedKids
                  ? children.filter(c => assignedKids.includes(c.id)).map(c => c.display_name)
                  : [];
                return (
                <motion.div
                  key={tpl.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="card-quest flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <TaskVisual template={tpl} size="lg" className="border border-gray-100 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-lg">{tpl.name}</h3>
                    <div className="text-sm text-gray-500 flex gap-3 flex-wrap">
                      <span>{tpl.task_type}</span>
                      <span>⭐ {tpl.base_points} pts</span>
                      <span>{tpl.schedule_type}</span>
                      {tpl.timer_duration && <span>⏱ {tpl.timer_duration}s</span>}
                      {assignedNames.length > 0
                        ? <span className="text-blue-500">👤 {assignedNames.join(', ')}</span>
                        : <span className="text-gray-400">👤 All kids</span>}
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditTemplate(tpl)}
                      className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="text-red-400 hover:text-red-600 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
                );
              })}
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
                    <div className="rounded-2xl border-2 border-gray-100 p-3 bg-gray-50">
                      <label className="text-xs text-gray-500 mb-2 block">Task picture for kids</label>
                      <div className="flex gap-3 items-start">
                        <TaskVisual template={taskPreview} size="xl" className="border-2 border-white flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                            {DEFAULT_TASK_IMAGES.map(item => (
                              <button
                                key={item.imageUrl}
                                type="button"
                                onClick={() => { setTaskIcon(item.icon); setTaskImageUrl(item.imageUrl); handleTaskImageFile(null); }}
                                className={`rounded-xl border-2 p-1.5 bg-white hover:border-quest-blue transition-colors ${taskImageUrl === item.imageUrl ? 'border-quest-blue' : 'border-gray-200'}`}
                                title={item.label}
                              >
                                <img src={item.imageUrl} alt={item.label} className="w-10 h-10 object-contain mx-auto" />
                              </button>
                            ))}
                          </div>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            onChange={e => handleTaskImageFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-gray-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-quest-blue file:font-medium"
                          />
                        </div>
                      </div>
                    </div>
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
                    {/* Assign to specific kids */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Assign to (default: all kids)</label>
                      <div className="flex flex-wrap gap-2">
                        {children.map(c => (
                          <label key={c.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 cursor-pointer text-sm transition-colors ${taskAssignKids.includes(c.id) ? 'border-quest-blue bg-blue-50 text-quest-blue' : 'border-gray-200 text-gray-500'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={taskAssignKids.includes(c.id)}
                              onChange={e => {
                                if (e.target.checked) setTaskAssignKids([...taskAssignKids, c.id]);
                                else setTaskAssignKids(taskAssignKids.filter(id => id !== c.id));
                              }}
                            />
                            {c.age_tier === 1 ? '🐣' : c.age_tier === 2 ? '🌟' : '🧑'} {c.display_name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary flex-1">Create Task</button>
                      <button type="button" onClick={() => { setShowAddTask(false); setTaskAssignKids([]); setTaskIcon(''); setTaskImageUrl(''); handleTaskImageFile(null); }} className="btn-quest bg-gray-200">Cancel</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Edit Task Modal */}
            {editingTemplate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                <div className="card-quest w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">✏️ Edit Task Template</h3>
                  <form onSubmit={handleEditTemplate} className="space-y-3">
                    <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Task name" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200" required />
                    <div className="rounded-2xl border-2 border-gray-100 p-3 bg-gray-50">
                      <label className="text-xs text-gray-500 mb-2 block">Task picture for kids</label>
                      <div className="flex gap-3 items-start">
                        <TaskVisual template={taskPreview} size="xl" className="border-2 border-white flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                            {DEFAULT_TASK_IMAGES.map(item => (
                              <button
                                key={item.imageUrl}
                                type="button"
                                onClick={() => { setTaskIcon(item.icon); setTaskImageUrl(item.imageUrl); handleTaskImageFile(null); }}
                                className={`rounded-xl border-2 p-1.5 bg-white hover:border-quest-blue transition-colors ${taskImageUrl === item.imageUrl ? 'border-quest-blue' : 'border-gray-200'}`}
                                title={item.label}
                              >
                                <img src={item.imageUrl} alt={item.label} className="w-10 h-10 object-contain mx-auto" />
                              </button>
                            ))}
                          </div>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            onChange={e => handleTaskImageFile(e.target.files?.[0] || null)}
                            className="block w-full text-xs text-gray-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-quest-blue file:font-medium"
                          />
                        </div>
                      </div>
                    </div>
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
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Assign to (empty = all kids)</label>
                      <div className="flex flex-wrap gap-2">
                        {children.map(c => (
                          <label key={c.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 cursor-pointer text-sm transition-colors ${taskAssignKids.includes(c.id) ? 'border-quest-blue bg-blue-50 text-quest-blue' : 'border-gray-200 text-gray-500'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={taskAssignKids.includes(c.id)}
                              onChange={e => {
                                if (e.target.checked) setTaskAssignKids([...taskAssignKids, c.id]);
                                else setTaskAssignKids(taskAssignKids.filter(id => id !== c.id));
                              }}
                            />
                            {c.age_tier === 1 ? '🐣' : c.age_tier === 2 ? '🌟' : '🧑'} {c.display_name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary flex-1">Save Changes</button>
                      <button type="button" onClick={() => { setEditingTemplate(null); setTaskAssignKids([]); setTaskIcon(''); setTaskImageUrl(''); handleTaskImageFile(null); }} className="btn-quest bg-gray-200">Cancel</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Manage Tab — parent task management */}
        {activeTab === 'manage' && (
          <ParentTaskManagement children={children} />
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

            {/* Kid Reward Requests */}
            {rewardRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3">💌 Reward Requests from Kids</h3>
                <div className="space-y-2">
                  {rewardRequests.filter(r => r.status === 'pending').map(req => {
                    const child = children.find(c => c.id === req.child_id);
                    return (
                      <div key={req.id} className="card-quest bg-gradient-to-br from-purple-50 to-pink-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold">{req.name}</h4>
                            {req.description && <p className="text-sm text-gray-500">{req.description}</p>}
                            <p className="text-xs text-gray-400 mt-1">
                              💡 Suggested: {req.suggested_cost_stars} ⭐
                              {child && <span> · from {child.display_name}</span>}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleResolveRequest(req.id, true, req.suggested_cost_stars)}
                              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600"
                            >
                              ✅ Add to Shop
                            </button>
                            <button
                              onClick={() => handleResolveRequest(req.id, false, 0)}
                              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-300"
                            >
                              ❌ Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Family Goals Tab */}
        {activeTab === 'goals' && <FamilyGoalsPanel isParent />}

        {/* Weekly Recap Tab */}
        {activeTab === 'recap' && <WeeklyRecap isParent />}

        {/* Insights Dashboard Tab */}
        {activeTab === 'insights' && <InsightsDashboard />}

        {/* Phase 8: Analytics Dashboard */}
        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {/* Phase 8: Smart Suggestions */}
        {activeTab === 'suggestions' && <SmartSuggestionsPanel />}

        {/* Phase 8: Rituals Settings */}
        {activeTab === 'rituals' && <RitualSettings />}

        {/* Phase 5 Tabs */}
        {activeTab === 'marketplace' && <TemplateMarketplace onClose={() => setActiveTab('tasks')} onFork={() => {}} />}
        {activeTab === 'organizations' && <OrganizationDashboard onClose={() => setActiveTab('children')} />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'teacher' && <TeacherDashboard onClose={() => setActiveTab('children')} />}

        {/* Phase 6: Metrics */}
        {activeTab === 'metrics' && <AdminMetricsPanel />}

        {/* Photo Approval Queue */}
        {activeTab === 'approvals' && <PhotoApprovalQueue />}

        {/* Phase 8: Fulfillment Queue + Family Board (shown on Children tab) */}
        {activeTab === 'children' && (
          <div className="mt-6 space-y-4">
            <FulfillmentQueue />
            <FamilyMessageBoard />
          </div>
        )}
      </div>
    </div>
  );
}
