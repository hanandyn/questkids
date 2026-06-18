import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { SpinResult } from '../../lib/types';
import * as sounds from '../../lib/sounds';

const SEGMENTS = [
  { label: '10 ⭐', color: '#FFD700' },
  { label: '25 ⭐', color: '#FFA500' },
  { label: '💎', color: '#00D2FF' },
  { label: '50 ⭐', color: '#FF6347' },
  { label: '😅', color: '#A0A0A0' },
  { label: '3💎', color: '#9370DB' },
  { label: '10⭐', color: '#32CD32' },
  { label: '100⭐', color: '#FF1493' },
];

interface Props {
  onResult: (result: SpinResult) => void;
  onClose: () => void;
}

export function DailySpinWheel({ onResult, onClose }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);

  const segmentAngle = 360 / SEGMENTS.length;

  const handleSpin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    // Play tick sounds during spin
    const totalSpins = 5 + Math.floor(Math.random() * 5);
    const targetAngle = rotation + totalSpins * 360 + Math.random() * 360;
    const duration = 3000 + Math.random() * 2000;

    // Animate with easing
    const startTime = performance.now();
    const startRotation = rotation;
    const tickInterval = setInterval(() => {
      sounds.playSpinTick();
    }, 80);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (targetAngle - startRotation) * eased;
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        clearInterval(tickInterval);
        // Visually settle the wheel

        // Call API for actual result
        api.dailySpin()
          .then((res) => {
            const spinResult = res as unknown as SpinResult;
            setResult(spinResult);
            sounds.playSpinResult();
            onResult(spinResult);
          })
          .catch((err) => {
            setResult({ prize: 'Error', value: 0, prize_type: 'nothing', message: err instanceof Error ? err.message : 'Try again later' });
          })
          .finally(() => setSpinning(false));
      }
    };

    requestAnimationFrame(animate);

    return () => clearInterval(tickInterval);
  }, [spinning, rotation, onResult]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="card-kid bg-gradient-to-b from-yellow-50 to-orange-50 max-w-md w-full text-center"
      >
        <h2 className="text-2xl font-bold mb-2">🎡 Daily Spin</h2>
        <p className="text-gray-500 mb-4">Spin once per day for a prize!</p>

        {/* Wheel */}
        <div className="relative w-64 h-64 mx-auto mb-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-3xl">
            ▼
          </div>
          {/* Wheel */}
          <div
            className="w-full h-full rounded-full border-4 border-quest-gold relative overflow-hidden transition-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {SEGMENTS.map((seg, i) => {
              const startAngle = i * segmentAngle;
              return (
                <div
                  key={i}
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from ${startAngle}deg, ${seg.color} 0deg, ${seg.color} ${segmentAngle}deg, transparent ${segmentAngle}deg)`,
                  }}
                />
              );
            })}
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-quest-gold flex items-center justify-center text-2xl shadow-lg">
              🎡
            </div>
          </div>
          {/* Labels */}
          {SEGMENTS.map((seg, i) => {
            const angle = (i * segmentAngle + segmentAngle / 2) * (Math.PI / 180);
            const r = 90;
            return (
              <div
                key={i}
                className="absolute text-sm font-bold pointer-events-none"
                style={{
                  top: `calc(50% + ${Math.sin(angle) * r}px)`,
                  left: `calc(50% + ${Math.cos(angle) * r}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {seg.label}
              </div>
            );
          })}
        </div>

        {result ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`px-4 py-3 rounded-xl text-lg font-bold mb-4 ${
              result.prize_type === 'nothing' ? 'bg-gray-100' : 'bg-green-100 text-green-800'
            }`}
          >
            {result.message}
          </motion.div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="btn-gold text-xl px-8 disabled:opacity-50"
          >
            {spinning ? '🎰 Spinning...' : 'SPIN! 🎰'}
          </button>
        )}

        <button onClick={onClose} className="mt-2 text-sm text-gray-400 hover:underline">
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
