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

// Phase 3: Social & Competition

export interface FamilyGoal {
  id: number;
  family_id: number;
  name: string;
  description?: string;
  target_completion_rate: number;
  target_streak: number;
  starts_at: string;
  ends_at: string;
  reward_description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface FamilyGoalStatus {
  goal: FamilyGoal;
  current_completion_rate: number;
  current_streak: number;
  weeks_progress: Array<{ week_start: string; completion_rate: number; achieved: boolean }>;
  is_achieved: boolean;
  days_remaining: number;
}

export interface Cheer {
  id: number;
  from_child_id: number;
  from_child_name?: string;
  to_child_id: number;
  task_instance_id?: number;
  message_type: 'clap' | 'celebrate' | 'lightning' | 'muscle' | 'star';
  created_at: string;
}

export interface CheersReceived {
  cheers: Cheer[];
  today_count: number;
  max_daily: number;
}

export interface PerChildRecap {
  child_id: number;
  display_name: string;
  level: number;
  avatar_config?: string;
  tasks_completed: number;
  tasks_total: number;
  completion_rate: number;
  points_earned: number;
  achievements_unlocked: string[];
  streak_days: number;
  longest_streak: number;
  stars_change: number;
  gems_change: number;
}

export interface WeeklyRecap {
  week_start: string;
  week_end: string;
  family_completion_rate: number;
  total_tasks_completed: number;
  total_points_earned: number;
  children_recap: PerChildRecap[];
  highlights: {
    top_performer_name: string;
    top_performer_id: number;
    top_performer_rate: number;
    most_improved_name?: string;
    most_improved_id?: number;
    most_improved_change: number;
    longest_streak_name?: string;
    longest_streak_value: number;
  };
  tips: string[];
}

export interface KidRecap {
  week_start: string;
  week_end: string;
  display_name: string;
  tasks_completed: number;
  tasks_total: number;
  completion_rate: number;
  points_earned: number;
  stars: number;
  streak_days: number;
  family_rank: number;
  total_siblings: number;
  achievements_unlocked: string[];
  siblings: Array<{ display_name: string; stars: number }>;
}

export interface EnhancedLeaderboardEntry {
  child_id: number;
  display_name: string;
  level: number;
  stars: number;
  adjusted_stars: number;
  gems: number;
  current_streak: number;
  completion_rate: number;
  xp_this_week: number;
  age_tier?: number;
  avatar_config?: string;
  handicap_multiplier: number;
  rank: number;
  rank_change: number;
}

export interface EnhancedLeaderboard {
  leaderboard: EnhancedLeaderboardEntry[];
  most_improved?: EnhancedLeaderboardEntry;
  longest_streak_entry?: EnhancedLeaderboardEntry;
  leaderboard_period: string;
}

export interface TipCard {
  tip_type: string;
  message: string;
  child_id?: number;
  child_name?: string;
  severity: 'info' | 'warning' | 'success';
}

export interface InsightStats {
  family_completion_rate: number;
  total_tasks_completed: number;
  total_tasks_assigned: number;
  per_child: Record<string, {
    child_id: number;
    display_name: string;
    tasks_completed: number;
    tasks_total: number;
    completion_rate: number;
    points_earned: number;
  }>;
  daily_completion: Array<{
    date: string;
    completion_rate: number;
    completed: number;
    total: number;
  }>;
  best_day?: { date: string; rate: number };
  worst_day?: { date: string; rate: number };
  most_consistent_child_id?: number;
  most_consistent_child_name?: string;
}

export interface InsightsResponse {
  tips: TipCard[];
  stats: InsightStats;
}
