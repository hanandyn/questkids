import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface StepProps {
  onNext: (data?: Record<string, unknown>) => void;
  onPrev: () => void;
  data: Record<string, unknown>;
}

// Step 1: Welcome + Family Name
function WelcomeStep({ onNext, data }: StepProps) {
  const { t } = useTranslation();
  const [familyName, setFamilyName] = useState((data.familyName as string) || '');

  return (
    <div className="text-center">
      <img src="/logo.png" alt="FunDo" className="h-24 w-24 mb-6 rounded-2xl" />
      <h1 className="text-3xl font-bold text-quest-dark mb-4">
        {t('onboarding.welcome', 'Welcome to FunDo!')}
      </h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {t('onboarding.welcomeDesc', "Let's set up your family's adventure. We'll help your kids turn everyday tasks into epic quests!")}
      </p>
      <div className="max-w-sm mx-auto">
        <label htmlFor="family-name" className="block text-left text-sm font-medium text-gray-700 mb-2">
          {t('onboarding.familyName', 'Family Name')}
        </label>
        <input
          id="family-name"
          type="text"
          value={familyName}
          onChange={e => setFamilyName(e.target.value)}
          placeholder={t('onboarding.familyNamePlaceholder', 'e.g. The Smiths')}
          className="w-full p-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-quest-blue focus:ring-2 focus:ring-quest-blue/30 outline-none transition-all"
          autoFocus
          aria-label="Family name"
        />
      </div>
      <button
        onClick={() => familyName.trim() && onNext({ familyName: familyName.trim() })}
        disabled={!familyName.trim()}
        className="mt-8 px-8 py-3 bg-quest-blue text-white text-lg font-bold rounded-2xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press focus-ring"
        aria-label="Continue to next step"
      >
        {t('onboarding.continue', "Let's Go! 🚀")}
      </button>
    </div>
  );
}

// Step 2: Add Children
function AddChildrenStep({ onNext, onPrev, data }: StepProps) {
  const { t } = useTranslation();
  const [children, setChildren] = useState<Array<{ name: string; age: number; tier: number }>>(
    (data.children as Array<{ name: string; age: number; tier: number }>) || []
  );
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  const getTier = (childAge: number): number => {
    if (childAge <= 2) return 1;
    if (childAge <= 5) return 2;
    if (childAge <= 8) return 3;
    if (childAge <= 11) return 4;
    return 5;
  };

  const addChild = () => {
    if (!name.trim() || !age) return;
    const childAge = parseInt(age);
    const tier = getTier(childAge);
    setChildren([...children, { name: name.trim(), age: childAge, tier }]);
    setName('');
    setAge('');
  };

  const removeChild = (idx: number) => {
    setChildren(children.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
        <h1 className="text-3xl font-bold text-quest-dark mb-2">
          {t('onboarding.addKids', 'Add Your Kids')}
        </h1>
        <p className="text-gray-600">
          {t('onboarding.addKidsDesc', 'Each child gets their own dashboard and level system')}
        </p>
      </div>

      {/* Add form */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('onboarding.childName', "Child's name")}
            className="flex-1 min-w-[150px] p-3 border-2 border-gray-200 rounded-xl focus:border-quest-blue focus:ring-2 focus:ring-quest-blue/30 outline-none"
            aria-label="Child name"
          />
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder={t('onboarding.childAge', 'Age')}
            min="1"
            max="18"
            className="w-20 p-3 border-2 border-gray-200 rounded-xl focus:border-quest-blue focus:ring-2 focus:ring-quest-blue/30 outline-none"
            aria-label="Child age"
          />
          <button
            onClick={addChild}
            disabled={!name.trim() || !age}
            className="px-6 py-3 bg-quest-green text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-40 transition-all btn-press focus-ring"
            aria-label="Add child"
          >
            + {t('onboarding.add', 'Add')}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {t('onboarding.ageNote', 'Ages 0-2 → Little Explorer · 3-5 → Junior · 6-8 → Apprentice · 9-12 → Knight · 13+ → Champion')}
        </p>
      </div>

      {/* Children list */}
      {children.length > 0 && (
        <div className="space-y-2 mb-6">
          {children.map((child, idx) => (
            <motion.div
              key={`${child.name}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between bg-white border-2 border-gray-100 rounded-xl p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{child.tier <= 2 ? '🧒' : child.tier <= 4 ? '👦' : '🧑'}</span>
                <div>
                  <p className="font-bold text-gray-800">{child.name}</p>
                  <p className="text-sm text-gray-500">
                    {t('onboarding.age', 'Age')} {child.age} · {t('onboarding.tier', 'Tier')} {child.tier}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeChild(idx)}
                className="text-red-400 hover:text-red-600 p-2 transition-colors focus-ring"
                aria-label={`Remove ${child.name}`}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors focus-ring"
          aria-label="Go back"
        >
          ← {t('onboarding.back', 'Back')}
        </button>
        <button
          onClick={() => children.length > 0 && onNext({ children })}
          disabled={children.length === 0}
          className="px-8 py-3 bg-quest-blue text-white text-lg font-bold rounded-2xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-press focus-ring"
          aria-label="Continue to next step"
        >
          {t('onboarding.continueBtn', 'Continue')} →
        </button>
      </div>
    </div>
  );
}

// Step 3: Quick-start task templates
function TemplatesStep({ onNext, onPrev, data }: StepProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Array<{
    name: string; description: string; category: string; task_type: string;
    base_points: number; timer_duration?: number; age_tier_min: number;
    age_tier_max: number; icon: string;
  }>>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const children = (data.children as Array<{ tier: number }>) || [];
    const tiers = [...new Set(children.map(c => c.tier))].join(',');
    api.onboardingTemplates(tiers)
      .then((res: unknown) => {
        const r = res as { tasks: typeof templates };
        setTemplates(r.tasks || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [data.children]);

  const toggleTask = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">⚔️</div>
        <h1 className="text-3xl font-bold text-quest-dark mb-2">
          {t('onboarding.templates', 'Quick-Start Tasks')}
        </h1>
        <p className="text-gray-600">
          {t('onboarding.templatesDesc', 'Select starter tasks for your family. You can add more later!')}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{t('onboarding.noTemplates', 'No templates available for your children\'s age ranges.')}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mb-4">
          {templates.map((tmpl, idx) => (
            <button
              key={`${tmpl.name}-${idx}`}
              onClick={() => toggleTask(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected.has(idx)
                  ? 'border-quest-blue bg-blue-50 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover-lift'
              }`}
              aria-pressed={selected.has(idx)}
              aria-label={`${selected.has(idx) ? 'Selected' : 'Select'} ${tmpl.name}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{tmpl.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{tmpl.name}</p>
                  <p className="text-sm text-gray-500">{tmpl.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-quest-green">+{tmpl.base_points} ⭐</span>
                  <p className="text-xs text-gray-400 mt-1">{tmpl.category}</p>
                </div>
              </div>
              {tmpl.task_type === 'timed' && tmpl.timer_duration && (
                <div className="mt-2 text-xs bg-gray-100 rounded-full px-3 py-1 inline-block">
                  ⏱ {Math.round(tmpl.timer_duration / 60)} min timer
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onPrev}
          className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors focus-ring"
        >
          ← {t('onboarding.back', 'Back')}
        </button>
        <button
          onClick={() => onNext({ selectedTemplates: templates.filter((_, i) => selected.has(i)) })}
          className="px-8 py-3 bg-quest-blue text-white text-lg font-bold rounded-2xl hover:bg-blue-600 transition-all btn-press focus-ring"
        >
          {selected.size > 0
            ? t('onboarding.createTasks', `Create ${selected.size} Tasks →`)
            : t('onboarding.skipForNow', 'Skip for now →')}
        </button>
      </div>
    </div>
  );
}

// Step 4: Set up first reward
function RewardsStep({ onNext, onPrev }: StepProps) {
  const { t } = useTranslation();
  const [rewardName, setRewardName] = useState('');
  const [starCost, setStarCost] = useState('50');

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🎁</div>
        <h1 className="text-3xl font-bold text-quest-dark mb-2">
          {t('onboarding.firstReward', 'Set Up a First Reward')}
        </h1>
        <p className="text-gray-600">
          {t('onboarding.firstRewardDesc', 'Kids earn stars for completing tasks. What can they redeem them for?')}
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-4">
        <div>
          <label htmlFor="reward-name" className="block text-sm font-medium text-gray-700 mb-2">
            {t('onboarding.rewardName', 'Reward Name')}
          </label>
          <input
            id="reward-name"
            type="text"
            value={rewardName}
            onChange={e => setRewardName(e.target.value)}
            placeholder={t('onboarding.rewardPlaceholder', 'e.g. Extra screen time, Movie night...')}
            className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-quest-blue focus:ring-2 focus:ring-quest-blue/30 outline-none"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="reward-cost" className="block text-sm font-medium text-gray-700 mb-2">
            {t('onboarding.starCost', 'Star Cost')}
          </label>
          <input
            id="reward-cost"
            type="number"
            value={starCost}
            onChange={e => setStarCost(e.target.value)}
            min="10"
            max="999"
            className="w-32 p-4 border-2 border-gray-200 rounded-2xl focus:border-quest-blue focus:ring-2 focus:ring-quest-blue/30 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors focus-ring"
        >
          ← {t('onboarding.back', 'Back')}
        </button>
        <button
          onClick={() => onNext({ reward: { name: rewardName, cost: parseInt(starCost) || 50 } })}
          className="px-8 py-3 bg-quest-blue text-white text-lg font-bold rounded-2xl hover:bg-blue-600 transition-all btn-press focus-ring"
        >
          {rewardName.trim()
            ? t('onboarding.addReward', 'Add Reward →')
            : t('onboarding.skipForNow', 'Skip for now →')}
        </button>
      </div>
    </div>
  );
}

// Step 5: Done!
function DoneStep({ data, onPrev }: StepProps) {
  const { t } = useTranslation();
  useAuth();
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [createdChildren, setCreatedChildren] = useState<Array<{ name: string; username: string; password: string; tier: number }>>([]);

  const handleFinish = useCallback(async () => {
    setCreating(true);
    setError('');
    try {
      const children = (data.children as Array<{ name: string; age: number; tier: number }>) || [];
      const createdCredentials: Array<{ name: string; username: string; password: string; tier: number }> = [];

      // Create children — capture credentials for display
      for (const child of children) {
        const childUsername = child.name.toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 1000);
        const childPassword = `${child.name.toLowerCase().replace(/\s/g, '')}123`;
        await api.createChild({
          username: childUsername,
          display_name: child.name,
          email: `${childUsername}@fundo.local`,
          password: childPassword,
          role: 'child',
          age_tier: child.tier,
        });
        createdCredentials.push({ name: child.name, username: childUsername, password: childPassword, tier: child.tier });
      }

      // Create selected templates
      const templates = (data.selectedTemplates as Array<Record<string, unknown>>) || [];
      for (const tmpl of templates) {
        await api.createTemplate(tmpl as Record<string, unknown>);
      }

      // Create reward if specified
      const reward = data.reward as { name: string; cost: number };
      if (reward?.name?.trim()) {
        await api.createReward({
          name: reward.name.trim(),
          cost_stars: reward.cost || 50,
          cost_gems: 0,
          age_min: 1,
          age_max: 5,
          availability: 'always',
          is_active: true,
        });
      }

      // Mark onboarding complete
      await api.completeOnboarding();

      setDone(true);
      setCreatedChildren(createdCredentials);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null) {
        // FastAPI HTTPException: { detail: string } or { detail: [] }
        if ('detail' in err) {
          const detail = (err as {detail: unknown}).detail;
          const msg = Array.isArray(detail) && detail.length > 0 ? detail.map((e: { msg?: string }) => e.msg && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)).join(', ') : typeof detail === 'string' ? detail : JSON.stringify(err);
          setError(msg);
        } else {
          setError(JSON.stringify(err, null, 2));
        }
      } else {
        setError('Something went wrong');
      }
    } finally {
      setCreating(false);
    }
  }, [data]);

  if (done) {
    return (
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-8xl mb-6"
        >
          🎉
        </motion.div>
        <h1 className="text-3xl font-bold text-quest-dark mb-4">
          {t('onboarding.allSet', "You're All Set!")}
        </h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {t('onboarding.allSetDesc', "Your family's adventure begins now! Check out the dashboard to see your kids' quests.")}
        </p>

        {/* Display kid credentials so the parent can share them */}
        {createdChildren.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 max-w-lg mx-auto text-left">
            <h2 className="text-xl font-bold text-quest-dark mb-2 text-center">
              🔑 {t('onboarding.kidCredentials', 'Kid Login Credentials')}
            </h2>
            <p className="text-sm text-gray-500 mb-4 text-center">
              {t('onboarding.kidCredentialsDesc', 'Save these! Your kids will need them to log in. You can change passwords later in settings.')}
            </p>
            <div className="space-y-3">
              {createdChildren.map((child, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{child.tier <= 2 ? '🧒' : child.tier <= 4 ? '👦' : '🧑'}</span>
                    <span className="font-bold text-gray-800">{child.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Username:</span>
                      <br />
                      <span className="font-mono font-bold text-quest-blue select-all">{child.username}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Password:</span>
                      <br />
                      <span className="font-mono font-bold text-quest-green select-all">{child.password}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="mt-4 text-sm text-quest-blue hover:underline focus-ring"
            >
              🖨 {t('onboarding.printCredentials', 'Print this page')}
            </button>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-quest-blue text-white text-lg font-bold rounded-2xl hover:bg-blue-600 transition-all btn-press focus-ring"
          >
            {t('onboarding.goToDashboard', 'Go to Dashboard 🏰')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-6xl mb-4">✨</div>
      <h1 className="text-3xl font-bold text-quest-dark mb-4">
        {t('onboarding.ready', 'Ready to Start?')}
      </h1>
      <div className="text-left bg-gray-50 rounded-2xl p-6 mb-8 max-w-md mx-auto space-y-2">
        <p className="text-sm text-gray-500 font-medium mb-2">{t('onboarding.summary', "Here's a summary:")}</p>
        <p>👨‍👩‍👧‍👦 {t('onboarding.familyLabel', 'Family')}: <strong>{data.familyName as string}</strong></p>
        {(data.children as Array<{ name: string; tier: number }>)?.map((c, i) => (
          <p key={i}>🧒 <strong>{c.name}</strong> (Tier {c.tier})</p>
        ))}
        <p>⚔️ {t('onboarding.tasksCount', 'Tasks')}: {(data.selectedTemplates as Array<unknown>)?.length || 0}</p>
        {(data.reward as { name: string })?.name && (
          <p>🎁 {t('onboarding.reward', 'Reward')}: {(data.reward as { name: string }).name}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onPrev}
          disabled={creating}
          className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-40 focus-ring"
        >
          ← {t('onboarding.back', 'Back')}
        </button>
        <button
          onClick={handleFinish}
          disabled={creating}
          className="px-8 py-3 bg-quest-green text-white text-lg font-bold rounded-2xl hover:bg-green-600 disabled:opacity-40 transition-all btn-press focus-ring"
        >
          {creating
            ? t('onboarding.creating', 'Creating... ⏳')
            : t('onboarding.finish', 'Finish Setup 🎉')}
        </button>
      </div>
    </div>
  );
}

const TOTAL_STEPS = 5;

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>({});

  const goNext = (newData?: Record<string, unknown>) => {
    if (newData) setData(prev => ({ ...prev, ...newData }));
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
  };

  const goPrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const steps = [
    <WelcomeStep key="welcome" onNext={goNext} onPrev={goPrev} data={data} />,
    <AddChildrenStep key="children" onNext={goNext} onPrev={goPrev} data={data} />,
    <TemplatesStep key="templates" onNext={goNext} onPrev={goPrev} data={data} />,
    <RewardsStep key="rewards" onNext={goNext} onPrev={goPrev} data={data} />,
    <DoneStep key="done" onNext={goNext} onPrev={goPrev} data={data} />,
  ];

  return (
    <div className="min-h-screen bg-quest-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl w-full">
        {/* Progress bar */}
        {step < TOTAL_STEPS - 1 && (
          <div className="mb-6">
            <div className="flex gap-2 mb-2">
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full flex-1 transition-all duration-500 ${
                    i < step ? 'bg-quest-blue' : i === step ? 'bg-quest-blue/50' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400 text-center">
              {step + 1} / {TOTAL_STEPS - 1}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
