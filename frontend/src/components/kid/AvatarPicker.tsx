import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

const ARCHETYPES = [
  { id: 'knight', name: 'Knight', emoji: '⚔️', defaultColor: '#4A90D9' },
  { id: 'wizard', name: 'Wizard', emoji: '🧙', defaultColor: '#722ED1' },
  { id: 'explorer', name: 'Explorer', emoji: '🧭', defaultColor: '#52C41A' },
  { id: 'ninja', name: 'Ninja', emoji: '🥷', defaultColor: '#1A1A2E' },
  { id: 'robot', name: 'Robot', emoji: '🤖', defaultColor: '#A0A0A0' },
  { id: 'artist', name: 'Artist', emoji: '🎨', defaultColor: '#EB2F96' },
  { id: 'athlete', name: 'Athlete', emoji: '🏃', defaultColor: '#FA8C16' },
  { id: 'scientist', name: 'Scientist', emoji: '🔬', defaultColor: '#00D2FF' },
];

const FREE_COLORS = [
  { name: 'Blue', value: '#4A90D9' },
  { name: 'Green', value: '#52C41A' },
  { name: 'Orange', value: '#FA8C16' },
  { name: 'Pink', value: '#EB2F96' },
  { name: 'Purple', value: '#722ED1' },
];

const PREMIUM_COLORS = [
  { name: 'Gold', value: 'gold', cost: 5, emoji: '🥇' },
  { name: 'Rainbow', value: 'rainbow', cost: 10, emoji: '🌈' },
  { name: 'Cosmic', value: 'cosmic', cost: 3, emoji: '🌌' },
  { name: 'Neon', value: 'neon', cost: 3, emoji: '💡' },
  { name: 'Crimson', value: 'crimson', cost: 2, emoji: '❤️' },
  { name: 'Royal', value: 'royal', cost: 2, emoji: '👑' },
  { name: 'Emerald', value: 'emerald', cost: 2, emoji: '💚' },
  { name: 'Obsidian', value: 'obsidian', cost: 2, emoji: '🖤' },
];

const PREMIUM_COLOR_MAP: Record<string, string> = {
  gold: '#FFD700',
  rainbow: '#FF6B6B',
  cosmic: '#8B5CF6',
  neon: '#39FF14',
  crimson: '#DC2626',
  royal: '#7C3AED',
  emerald: '#059669',
  obsidian: '#1F2937',
};

interface Props {
  onClose: () => void;
  onSave: (avatarConfig: string) => void;
}

export function AvatarPicker({ onClose, onSave }: Props) {
  const { user } = useAuth();
  const avatarConfig = user?.avatar_config;
  const parsedConfig = (() => {
    if (avatarConfig) {
      try {
        return JSON.parse(avatarConfig);
      } catch { /* ignore */ }
    }
    return {};
  })();

  const [selectedArchetype, setSelectedArchetype] = useState(
    parsedConfig.archetype || 'knight'
  );
  const [selectedColor, setSelectedColor] = useState(() => {
    if (parsedConfig.color) {
      return PREMIUM_COLOR_MAP[parsedConfig.color] || parsedConfig.color;
    }
    return '#4A90D9';
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const ar = ARCHETYPES.find(a => a.id === selectedArchetype)!;
  const displayColor = selectedColor;

  const handleSave = useCallback(async () => {
    const isPremium = Object.entries(PREMIUM_COLOR_MAP).find(([, hex]) => hex === selectedColor);
    const colorKey = isPremium ? isPremium[0] : selectedColor;
    const config = JSON.stringify({
      archetype: selectedArchetype,
      color: colorKey,
      cosmetics: [],
    });

    try {
      await api.updateAvatar(config);
      setMessage('Avatar saved! 🎉');
      setMessageType('success');
      onSave(config);
      setTimeout(onClose, 1000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
      setMessageType('error');
    }
  }, [selectedArchetype, selectedColor, onClose, onSave]);

  const isPremiumColor = Object.values(PREMIUM_COLOR_MAP).includes(selectedColor);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="card-kid max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-2 text-center">🎭 Customize Avatar</h2>
        <p className="text-gray-500 text-center mb-4">Choose your hero!</p>

        {/* Preview */}
        <div className="text-center mb-6">
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl border-4 shadow-xl"
            style={{
              backgroundColor: displayColor + '20',
              borderColor: displayColor,
              boxShadow: `0 0 20px ${displayColor}40`,
            }}
          >
            {ar.emoji}
          </div>
          <div className="mt-2 font-bold text-lg" style={{ color: displayColor }}>
            {ar.name}
          </div>
        </div>

        {/* Archetype selection */}
        <h3 className="font-bold mb-2">Class</h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {ARCHETYPES.map(a => (
            <button
              key={a.id}
              onClick={() => { setSelectedArchetype(a.id); if (!isPremiumColor) setSelectedColor(a.defaultColor); }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                selectedArchetype === a.id
                  ? 'border-quest-blue bg-blue-50 scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl">{a.emoji}</div>
              <div className="text-xs font-medium mt-1">{a.name}</div>
            </button>
          ))}
        </div>

        {/* Free Colors */}
        <h3 className="font-bold mb-2">Free Colors</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {FREE_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setSelectedColor(c.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                selectedColor === c.value ? 'border-quest-dark scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        {/* Premium Colors */}
        <h3 className="font-bold mb-2">
          Premium Colors 💎
          <span className="text-sm font-normal text-gray-500 ml-2">(Your gems: {user?.gems || 0})</span>
        </h3>
        <div className="flex gap-2 mb-6 flex-wrap">
          {PREMIUM_COLORS.map(c => {
            const hex = PREMIUM_COLOR_MAP[c.value];
            return (
              <button
                key={c.value}
                onClick={() => setSelectedColor(hex)}
                className={`w-10 h-10 rounded-full border-2 transition-all relative ${
                  selectedColor === hex ? 'border-quest-dark scale-110 ring-2 ring-offset-1 ring-quest-gold' : 'border-gray-300'
                }`}
                style={{ background: c.value === 'rainbow' ? 'linear-gradient(135deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF)' : hex }}
                title={`${c.name} (${c.cost}💎)`}
              >
                <span className="absolute -top-2 -right-2 text-xs bg-white rounded-full px-1 shadow">
                  {c.emoji}
                </span>
              </button>
            );
          })}
        </div>

        {message && (
          <div className={`mb-4 px-4 py-2 rounded-xl text-center font-medium ${
            messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleSave} className="btn-primary flex-1">
            💾 Save Avatar
          </button>
          <button onClick={onClose} className="btn-quest bg-gray-200">
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Small avatar display for leaderboard, profile, etc. */
export function AvatarDisplay({ avatarConfig, size = 40 }: { avatarConfig?: string; size?: number }) {
  let emoji = '🦊';
  let color = '#4A90D9';

  if (avatarConfig) {
    try {
      const config = JSON.parse(avatarConfig);
      if (config.archetype) {
        const ar = ARCHETYPES.find(a => a.id === config.archetype);
        if (ar) emoji = ar.emoji;
      }
      if (config.color) {
        color = PREMIUM_COLOR_MAP[config.color] || config.color;
      }
    } catch { /* ignore */ }
  }

  return (
    <div
      className="rounded-full flex items-center justify-center border-2 flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        backgroundColor: color + '20',
        borderColor: color,
        boxShadow: `0 0 ${size * 0.25}px ${color}40`,
      }}
    >
      {emoji}
    </div>
  );
}
