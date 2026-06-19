/**
 * SoundManager.tsx — Centralized audio context manager with volume controls.
 * Phase 8: Complete Sound & Music System.
 * Uses Web Audio API (oscillator-based, no external audio files needed).
 */

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import type { SoundSettingsData } from '../../lib/types';
import {
  playTaskComplete,
  playLevelUp,
  playAchievement as playAchievementSound,
  playChestOpen,
  playTimerWarning,
  playTimerExpired,
  playPointsEarned,
  playSpinTick,
  playSpinResult,
  setMuted,
} from '../../lib/sounds';

interface SoundContextType {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  ambientTrack: string | null;
  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  toggleMute: () => void;
  play: (type: SoundEventType) => void;
}

export type SoundEventType =
  | 'task_complete'
  | 'level_up'
  | 'streak_milestone'
  | 'chest_open'
  | 'timer_warning'
  | 'timer_expired'
  | 'daily_login'
  | 'cheer_received'
  | 'reward_redeemed'
  | 'spin_tick'
  | 'spin_result'
  | 'points_earned'
  | 'achievement';

const defaults: SoundSettingsData = {
  master_volume: 0.7,
  music_volume: 0.5,
  sfx_volume: 0.7,
  muted: false,
};

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children, ageTier }: { children: React.ReactNode; ageTier?: number }) {
  const [settings, setSettings] = useState<SoundSettingsData>(defaults);
  const musicCtx = useRef<AudioContext | null>(null);
  const musicOsc = useRef<OscillatorNode | null>(null);

  // Load saved settings
  useEffect(() => {
    api.getSoundSettings()
      .then(s => setSettings(s as unknown as SoundSettingsData))
      .catch(() => {});
  }, []);

  // Sync mute state to the sounds lib
  useEffect(() => {
    setMuted(settings.muted);
  }, [settings.muted]);

  const persist = useCallback(async (newSettings: SoundSettingsData) => {
    setSettings(newSettings);
    try { await api.updateSoundSettings(newSettings as unknown as Record<string, unknown>); } catch { /* offline */ }
  }, []);

  const setMasterVolume = useCallback((v: number) => persist({ ...settings, master_volume: v }), [settings, persist]);
  const setMusicVolume = useCallback((v: number) => persist({ ...settings, music_volume: v }), [settings, persist]);
  const setSfxVolume = useCallback((v: number) => persist({ ...settings, sfx_volume: v }), [settings, persist]);
  const toggleMute = useCallback(() => persist({ ...settings, muted: !settings.muted }), [settings, persist]);

  const play = useCallback((type: SoundEventType) => {
    // Temporarily set volume before playing
    const origMuted = settings.muted;
    setMuted(false); // override momentary mute for this event

    try {
      switch (type) {
        case 'task_complete': playTaskComplete(); break;
        case 'level_up': playLevelUp(); break;
        case 'points_earned': playPointsEarned(); break;
        case 'streak_milestone':
        case 'achievement': playAchievementSound(); break;
        case 'chest_open': playChestOpen(); break;
        case 'timer_warning': playTimerWarning(); break;
        case 'timer_expired': playTimerExpired(); break;
        case 'daily_login': playPointsEarned(); break;
        case 'cheer_received': playPointsEarned(); break;
        case 'reward_redeemed': playTaskComplete(); break;
        case 'spin_tick': playSpinTick(); break;
        case 'spin_result': playSpinResult(); break;
      }
    } catch { /* audio unavailable */ }

    setMuted(origMuted);
  }, [settings.muted]);

  // Ambient music
  useEffect(() => {
    if (settings.muted || settings.music_volume === 0 || settings.master_volume === 0) {
      musicOsc.current?.disconnect();
      musicOsc.current = null;
      return;
    }

    const ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>)['webkitAudioContext'] as typeof AudioContext)();
    musicCtx.current = ctx;

    // Determine music style based on age tier
    const tier = ageTier || 3; // default tier 3 (middle ages)
    const baseFreq = tier <= 2 ? 330 : tier >= 5 ? 220 : 262; // playful, lo-fi, or adventure

    const gain = ctx.createGain();
    gain.gain.value = (settings.master_volume * settings.music_volume * 0.08);

    const osc1 = ctx.createOscillator();
    osc1.type = tier <= 2 ? 'triangle' : tier >= 5 ? 'sine' : 'square';
    osc1.frequency.value = baseFreq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 1.5;

    const merge = ctx.createGain();
    osc1.connect(merge);
    osc2.connect(merge);
    merge.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    musicOsc.current = osc1;

    return () => {
      try { osc1.stop(); osc2.stop(); gain.disconnect(); merge.disconnect(); } catch { /* already stopped */ }
    };
  }, [settings.muted, settings.music_volume, settings.master_volume, ageTier]);

  return (
    <SoundContext.Provider value={{
      masterVolume: settings.master_volume,
      musicVolume: settings.music_volume,
      sfxVolume: settings.sfx_volume,
      muted: settings.muted,
      ambientTrack: null,
      setMasterVolume,
      setMusicVolume,
      setSfxVolume,
      toggleMute,
      play,
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
