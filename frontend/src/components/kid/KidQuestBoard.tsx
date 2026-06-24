import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../shared/NotificationBell';
import { api } from '../../lib/api';
import type { TaskInstance, Reward, SpinResult, ChestResult } from '../../lib/types';
import { CountdownTimer } from '../timer/CountdownTimer';
import { Confetti } from './Confetti';
import { DailySpinWheel } from './DailySpinWheel';
import { MysteryChest } from './MysteryChest';
import { AchievementTab, AchievementNotification } from './AchievementTab';
import { AvatarPicker, AvatarDisplay } from './AvatarPicker';
import { EnhancedLeaderboard } from './EnhancedLeaderboard';
import { FamilyGoalKidCard } from './FamilyGoals';
import { KidWeeklyRecap } from './WeeklyRecap';
import { CheerNotification } from './CheerSystem';
import { PowerUpShop } from './PowerUpShop';
import { RewardShop } from './RewardShop';
import { SchoolQuests } from './SchoolQuests';
import { SeasonalBanner } from './SeasonalBanner';
import { SettingsPanel } from '../settings/SettingsPanel';
import { FamilyMessageBoard } from '../shared/FamilyMessageBoard';
import { TaskVisual } from '../shared/TaskVisual';
import { KidDailyRecap } from './KidDailyRecap';
import heroImg from '../../assets/fundo-hero.jpg';
import emptyImg from '../../assets/fundo-empty.jpg';
import { useCheers } from '../../lib/useCheers';
import * as audio from '../../lib/audio';

type ViewType = 'quests' | 'shop' | 'leaderboard' | 'achievements' | 'powerups' | 'settings' | 'family';

interface TaskCompleteExtras {
  gems_earned?: number;
  leveled_up?: boolean;
  new_level?: number;
  new_achievements?: Array<{ name: string; icon?: string; rarity?: string }>;
  chest_available?: boolean;
}

export function KidQuestBoard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [, setRewards] = useState<Reward[]>([]);
  const [activeView, setActiveView] = useState<ViewType>('quests');
  const [activeTimer, setActiveTimer] = useState<TaskInstance | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'info'>('info');

  // Phase 2 state
  const [spinAvailable, setSpinAvailable] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [chestAvailable, setChestAvailable] = useState(false);
  const [showChest, setShowChest] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Array<{ name: string; icon?: string; rarity?: string }>>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [muted, setMuted] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [inst, rw, spinStatus, chestStatus] = await Promise.all([
        api.getInstances(),
        api.getRewards(),
        api.dailySpinStatus().catch(() => ({ available: false })),
        api.mysteryChestStatus().catch(() => ({ chest_available: false, tasks_until_chest: 10 })),
      ]);
      setInstances(inst as unknown as TaskInstance[]);
      setRewards((rw as unknown as Reward[]).filter((r: Reward) => r.is_active));
      setSpinAvailable((spinStatus as { available: boolean }).available);
      setChestAvailable((chestStatus as { chest_available: boolean }).chest_available);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh tasks every 10 seconds for real-time parent updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        api.getInstances().then(data => {
          setInstances(data as unknown as TaskInstance[]);
        }).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Cheers
  const { receivedCheers } = useCheers();

  const showMessage = (msg: string, type: 'success' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSoundToggle = () => {
    const newMuted = audio.toggleMute();
    setMuted(newMuted);
  };

  const handleStartTimer = async (instance: TaskInstance) => {
    audio.playButtonClick();
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
      const extras = (result as unknown as TaskCompleteExtras);
      setActiveTimer(null);

      // Sound effects
      audio.playTaskComplete();
      setTimeout(() => audio.playPointsEarned(), 400);

      // Confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);

      // Level up
      let msg = `🎉 You earned ${result.points_earned} points!`;
      if (extras.gems_earned && extras.gems_earned > 0) {
        msg += ` +${extras.gems_earned} 💎`;
      }
      if (extras.leveled_up) {
        msg += ` LEVEL UP to ${extras.new_level}! 🚀`;
        setTimeout(() => audio.playLevelUp(), 800);
      }
      showMessage(msg, 'success');

      // Achievement notification
      if (extras.new_achievements && extras.new_achievements.length > 0) {
        setNewAchievements(extras.new_achievements);
        setTimeout(() => audio.playAchievement(), 600);
        setTimeout(() => setNewAchievements([]), 5000);
      }

      // Check chest
      if (extras.chest_available) {
        setChestAvailable(true);
        setTimeout(() => showMessage('You earned a Mystery Chest! 🎁', 'info'), 2000);
      }

      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const handleCompleteOneShot = async (instance: TaskInstance) => {
    try {
      const result = await api.completeTask(instance.id, 0);
      const extras = (result as unknown as TaskCompleteExtras);

      audio.playTaskComplete();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      let msg = `🎉 +${result.points_earned} points!`;
      if (extras.gems_earned && extras.gems_earned > 0) {
        msg += ` +${extras.gems_earned} 💎`;
      }
      if (extras.leveled_up) {
        msg += ` LEVEL UP to ${extras.new_level}! 🚀`;
        setTimeout(() => audio.playLevelUp(), 600);
      }
      showMessage(msg, 'success');

      if (extras.new_achievements && extras.new_achievements.length > 0) {
        setNewAchievements(extras.new_achievements);
        setTimeout(() => audio.playAchievement(), 500);
        setTimeout(() => setNewAchievements([]), 5000);
      }

      if (extras.chest_available) {
        setChestAvailable(true);
        setTimeout(() => showMessage('You earned a Mystery Chest! 🎁', 'info'), 2000);
      }

      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const handleUndoTask = async (instance: TaskInstance) => {
    try {
      await api.undoTask(instance.id);
      setMessage('↩️ Task undone — points returned!');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Something went wrong', 'info');
    }
  };

  const handleSpinResult = (result: SpinResult) => {
    if (result.prize_type !== 'nothing') {
      setTimeout(() => audio.playPointsEarned(), 500);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    loadData();
  };

  const handleChestResult = (_result: ChestResult) => {
    void _result;
    setChestAvailable(false);
    loadData();
  };

  const handleAvatarSave = (_config: string) => {
    void _config;
    audio.playButtonClick();
    showMessage('Avatar updated!', 'success');
    loadData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const isWithinTimeWindow = (inst: TaskInstance): boolean => {
    const tpl = inst.template;
    if (!tpl?.time_window_start && !tpl?.time_window_end) return true;
    if (tpl.time_window_start && currentTime < tpl.time_window_start) return false;
    if (tpl.time_window_end && currentTime > tpl.time_window_end) return false;
    return true;
  };

  const getTimeWindowStatus = (inst: TaskInstance): 'upcoming' | 'active' | 'expired' | 'none' => {
    const tpl = inst.template;
    if (!tpl?.time_window_start && !tpl?.time_window_end) return 'none';
    if (tpl.time_window_start && currentTime < tpl.time_window_start) return 'upcoming';
    if (tpl.time_window_end && currentTime > tpl.time_window_end) return 'expired';
    return 'active';
  };

  const pendingTasks = instances.filter(i => i.status === 'pending' && (!i.date || i.date.startsWith(todayStr)));
  const inProgressTasks = instances.filter(i => i.status === 'in_progress');
  const completedTasks = instances.filter(i => i.status === 'completed');

  const getRankEmoji = () => {
    const av = user?.avatar_config;
    if (av) {
      try {
        const config = JSON.parse(av);
        const arMap: Record<string, string> = {
          knight: '⚔️', wizard: '🧙', explorer: '🧭', ninja: '🥷',
          robot: '🤖', artist: '🎨', athlete: '🏃', scientist: '🔬',
        };
        if (config.archetype && arMap[config.archetype]) return arMap[config.archetype];
      } catch { /* ignore */ }
    }
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
      {/* Confetti overlay */}
      <Confetti active={showConfetti} />

      {/* Kid Header — fixed at top */}
      <header className="bg-white/95 backdrop-blur shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-1"
              onClick={() => { audio.playButtonClick(); setActiveView('quests'); }}
            >
              🏰 <span className="hidden sm:inline">FunDo</span>
            </h1>
            <div className="flex items-center gap-1 text-sm">
              <NotificationBell />
              <button onClick={handleSoundToggle} className="text-lg p-1" title={muted ? 'Unmute' : 'Mute'}>
                {muted ? '🔇' : '🔊'}
              </button>
              <span className="bg-quest-gold/20 px-2 py-1 rounded-full font-bold text-xs">
                ⭐ {user?.stars || 0}
              </span>
              <span className="bg-quest-gem/20 px-2 py-1 rounded-full font-bold text-xs">
                💎 {user?.gems || 0}
              </span>
              <span className="bg-red-100 px-2 py-1 rounded-full font-bold text-xs">
                🔥 {user?.current_streak || 0}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14"></div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-kid bg-gradient-to-r from-quest-blue to-quest-purple text-white text-center mb-6 relative overflow-hidden"
        >
          <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="flex items-center justify-center gap-3 mb-2">
            <button onClick={() => setShowAvatarPicker(true)} className="transition-transform hover:scale-110">
              <AvatarDisplay avatarConfig={user?.avatar_config} size={56} />
            </button>
            <div className="text-4xl animate-float">{getRankEmoji()}</div>
          </div>
          <h2 className="text-3xl font-bold">{user?.display_name}</h2>
          <p className="text-white/80">
            Level {user?.level} • {(user?.current_streak ?? 0) > 0 ? `🔥 ${user?.current_streak}-day streak!` : 'Start your streak today!'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="bg-white/20 px-4 py-2 rounded-full text-sm">
              🛡️ Freeze tokens: {user?.freeze_tokens || 0}
            </span>
            {spinAvailable && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => { audio.playButtonClick(); setShowSpin(true); }}
                className="bg-quest-gold text-quest-dark px-4 py-2 rounded-full text-sm font-bold animate-pulse-glow"
              >
                🎡 Daily Spin!
              </motion.button>
            )}
            {chestAvailable && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => { audio.playButtonClick(); setShowChest(true); }}
                className="bg-quest-purple/50 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse-glow"
              >
                🎁 Open Chest!
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Achievement Notifications */}
        <AnimatePresence>
          {newAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <AchievementNotification achievements={newAchievements} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cheer Notifications */}
        {receivedCheers && receivedCheers.cheers.length > 0 && (
          <div className="mb-4 space-y-2">
            <CheerNotification cheers={receivedCheers.cheers} />
          </div>
        )}

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
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          {([
            ['quests', '⚔️ ' + t('nav.quests')],
            ['shop', '🛒 ' + t('nav.shop')],
            ['powerups', '⚡ ' + t('nav.powerups')],
            ['leaderboard', '🏆 ' + t('nav.leaderboard')],
            ['achievements', '🏅 ' + t('nav.achievements')],
            ['family', '💬 Family'],
            ['settings', '⚙️ ' + t('nav.settings')],
          ] as [ViewType, string][]).map(([view, label]) => (
            <button
              key={view}
              onClick={() => { audio.playButtonClick(); setActiveView(view); }}
              className={`px-4 py-3 rounded-2xl font-bold text-sm md:text-base transition-all touch-target ${
                activeView === view
                  ? 'bg-quest-blue text-white shadow-lg scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Family Board View */}
        {activeView === 'family' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <FamilyMessageBoard />
          </motion.div>
        )}

        {/* Active Timer Overlay */}
        {activeTimer && (
          <CountdownTimer
            instance={activeTimer}
            onComplete={(elapsed) => handleCompleteTask(activeTimer, elapsed)}
            onCancel={() => setActiveTimer(null)}
          />
        )}

        {/* Daily Spin Modal */}
        {showSpin && (
          <DailySpinWheel
            onResult={handleSpinResult}
            onClose={() => { setShowSpin(false); loadData(); }}
          />
        )}

        {/* Mystery Chest Modal */}
        {showChest && (
          <MysteryChest
            onResult={handleChestResult}
            onClose={() => { setShowChest(false); loadData(); }}
          />
        )}

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <AvatarPicker
            onClose={() => setShowAvatarPicker(false)}
            onSave={handleAvatarSave}
          />
        )}

        {/* Family Goal Card */}
        {activeView === 'quests' && <FamilyGoalKidCard />}

        {/* Kid Weekly Recap (collapsed summary) */}
        {activeView === 'quests' && <KidWeeklyRecap />}

        {/* Seasonal Events Banner */}
        {activeView === 'quests' && <SeasonalBanner />}

        {/* School Quests */}
        {activeView === 'quests' && <SchoolQuests />}

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
                <img src={emptyImg} alt="No quests" className="w-32 h-32 mx-auto mb-4 object-contain animate-float" />
                <p className="text-xl text-gray-500">No quests for today!</p>
                <p className="text-gray-400">Enjoy your free time, adventurer!</p>
              </motion.div>
            )}
            {pendingTasks.map(inst => {
              const windowStatus = getTimeWindowStatus(inst);
              const canAct = isWithinTimeWindow(inst);
              return (
              <motion.div
                key={inst.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`card-kid bg-white hover:shadow-xl transition-shadow ${!canAct ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <TaskVisual template={inst.template} size="lg" className="bg-purple-50 flex-shrink-0" />
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
                        {windowStatus === 'upcoming' && (
                          <div className="text-xs text-quest-blue mt-1">⏰ Opens at {inst.template?.time_window_start}</div>
                        )}
                        {windowStatus === 'expired' && (
                          <div className="text-xs text-red-500 mt-1">⏰ Window closed at {inst.template?.time_window_end}</div>
                        )}
                        {windowStatus === 'active' && (
                          <div className="text-xs text-green-600 mt-1">⏰ Until {inst.template?.time_window_end}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {inst.template?.task_type === 'timed' ? (
                      <button
                        onClick={() => handleStartTimer(inst)}
                        disabled={!canAct}
                        className={`text-base ${canAct ? 'btn-primary' : 'btn-quest bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                      >
                        ▶ Start
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteOneShot(inst)}
                        disabled={!canAct}
                        className={`text-base ${canAct ? 'btn-success' : 'btn-quest bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                      >
                        ✅ Done
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
              );
            })}

            {/* Completed Today */}
            {completedTasks.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2 mt-6">
                  ✅ Completed ({completedTasks.length})
                </h3>
                {completedTasks.slice(0, 10).map(inst => (
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUndoTask(inst)}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors focus-ring"
                          title="Oops! Undo"
                        >
                          ↩️ Undo
                        </button>
                        <span className="text-2xl">✅</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Achievement Badges View */}
        {activeView === 'achievements' && <AchievementTab />}

        {/* Reward Shop View */}
        {activeView === 'shop' && (
          <RewardShop />
        )}

        {/* Power-Ups Shop View */}
        {activeView === 'powerups' && <PowerUpShop />}

        {/* Settings View */}
        {activeView === 'settings' && <SettingsPanel onClose={() => setActiveView('quests')} />}

        {/* Leaderboard View */}
        {activeView === 'leaderboard' && <EnhancedLeaderboard />}

        {/* Phase 8: Family Board (shown on quests view) */}
        {activeView === 'quests' && (
          <div className="mt-6">
            <KidDailyRecap />
          </div>
        )}
      </div>
    </div>
  );
}
