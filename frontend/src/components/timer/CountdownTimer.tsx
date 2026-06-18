import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { TaskInstance } from '../../lib/types';

interface Props {
  instance: TaskInstance;
  onComplete: (elapsedSeconds: number) => void;
  onCancel: () => void;
}

export function CountdownTimer({ instance, onComplete, onCancel }: Props) {
  const template = instance.template;
  const duration = template?.timer_duration || 600; // Default 10 min
  const [remaining, setRemaining] = useState(duration);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = (remaining / duration) * 100;
  const circumference = 2 * Math.PI * 120; // r=120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    setStarted(true);
    intervalRef.current = window.setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 1;
        const newRemaining = duration - newElapsed;
        setRemaining(Math.max(0, newRemaining));
        return newElapsed;
      });
    }, 1000);
  };

  const handleComplete = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onComplete(elapsed);
  }, [elapsed, onComplete]);

  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getMessage = () => {
    if (!started) return "Ready? Let's go! 🚀";
    if (remaining <= 0) return "Time's up! 🎉";
    if (remaining < 30) return 'Almost there! 🏃';
    if (remaining < 120) return "You're doing great! 💪";
    if (remaining < 300) return 'Halfway there! 🌟';
    return 'Keep going, champion! ⚡';
  };

  const getProgressColor = () => {
    if (remaining <= 30) return '#FF4D4F';
    if (remaining <= 120) return '#FAAD14';
    return '#52C41A';
  };

  // Auto-complete when timer hits 0 while started
  useEffect(() => {
    if (started && remaining <= 0) {
      handleComplete();
    }
  }, [remaining, started, handleComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    >
      <div className="card-kid max-w-md w-full bg-gradient-to-b from-blue-50 to-purple-50 text-center">
        <h2 className="text-2xl font-bold mb-2">
          {template?.name || '⏱ Timer Quest'}
        </h2>

        {/* SVG Ring Timer */}
        <div className="relative w-64 h-64 mx-auto my-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            {/* Background ring */}
            <circle
              cx="130"
              cy="130"
              r="120"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="16"
            />
            {/* Progress ring */}
            <motion.circle
              cx="130"
              cy="130"
              r="120"
              fill="none"
              stroke={getProgressColor()}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </svg>
          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-mono font-bold ${remaining <= 30 ? 'text-quest-red animate-pulse' : 'text-quest-dark'}`}>
              {formatTime(remaining)}
            </div>
            <div className="text-sm text-gray-500 mt-1">remaining</div>
          </div>
        </div>

        {/* Message */}
        <motion.p
          key={Math.floor(remaining / 30)}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-lg font-bold mb-4"
        >
          {getMessage()}
        </motion.p>

        {/* Points preview */}
        <div className="bg-white/50 rounded-xl p-3 mb-4 text-sm">
          <span>Base: ⭐{template?.base_points || 0}</span>
          {(template?.early_finish_bonus_per_min ?? 0) > 0 && (
            <span className="ml-3 text-green-600">Early: +{template?.early_finish_bonus_per_min}/min</span>
          )}
          {(template?.overstay_penalty_per_min ?? 0) > 0 && (
            <span className="ml-3 text-red-500">Late: -{template?.overstay_penalty_per_min}/min</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!started ? (
            <button onClick={startTimer} className="btn-success text-xl px-8">
              ▶ Start!
            </button>
          ) : (
            <button onClick={handleComplete} className="btn-gold text-xl px-8">
              I'M DONE! 🎉
            </button>
          )}
          <button onClick={handleCancel} className="btn-quest bg-gray-200 text-gray-600">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
