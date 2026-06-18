export interface User {
  id: number;
  username: string;
  display_name: string;
  email?: string;
  role: 'parent' | 'child';
  family_id?: number;
  age_tier?: number;
  level: number;
  xp: number;
  stars: number;
  gems: number;
  current_streak: number;
  longest_streak: number;
  freeze_tokens: number;
  avatar_config?: string;
  theme_preference?: string;
  handicap_multiplier: number;
}

export interface TaskTemplate {
  id: number;
  family_id: number;
  created_by_id: number;
  name: string;
  description?: string;
  category?: string;
  task_type: 'timed' | 'checklist' | 'one_shot' | 'streak' | 'bonus' | 'team';
  base_points: number;
  timer_duration?: number;
  pomodoro_cycles?: number;
  break_duration?: number;
  subtasks?: { name: string; points: number }[];
  all_complete_bonus: number;
  max_asks: number;
  bonus_first_ask: number;
  penalty_per_ask: number;
  early_finish_bonus_per_min: number;
  overstay_penalty_per_min: number;
  schedule_type: string;
  schedule_days?: number[];
  time_window_start?: string;
  time_window_end?: string;
  age_tier_min: number;
  age_tier_max: number;
  requires_photo: boolean;
  requires_approval: boolean;
  is_active: boolean;
}

export interface TaskInstance {
  id: number;
  template_id: number;
  child_id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'missed' | 'skipped';
  timer_started_at?: string;
  timer_ended_at?: string;
  asks_count: number;
  points_earned: number;
  bonus_points: number;
  penalty_points: number;
  template?: TaskTemplate;
}

export interface Reward {
  id: number;
  family_id: number;
  created_by_id: number;
  name: string;
  description?: string;
  category?: string;
  cost_stars: number;
  cost_gems: number;
  age_min: number;
  age_max: number;
  availability: string;
  limit_per_week: number;
  requires_approval: boolean;
  is_active: boolean;
}

export interface Redemption {
  id: number;
  reward_id: number;
  child_id: number;
  status: string;
  redeemed_at?: string;
  fulfilled_at?: string;
  reward?: Reward;
}

export interface LeaderboardEntry {
  child_id: number;
  display_name: string;
  level: number;
  stars: number;
  gems: number;
  current_streak: number;
  completion_rate: number;
  xp_this_week: number;
  age_tier?: number;
  avatar_config?: string;
}

export interface Achievement {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlock_criteria: Record<string, unknown>;
}

export interface ChildAchievement {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  rarity: string;
  unlock_criteria: Record<string, unknown>;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface SpinResult {
  prize: string;
  value: number;
  prize_type: 'stars' | 'gems' | 'nothing';
  message: string;
}

export interface ChestResult {
  reward_type: string;
  value: number;
  item_name?: string;
  message: string;
}

export interface AvatarArchetype {
  id: string;
  name: string;
  emoji: string;
  defaultColor: string;
}
