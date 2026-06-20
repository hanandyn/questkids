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
  total_tasks_completed?: number;
  allowance_rate?: number;
  allowance_currency?: string;
  savings_goal?: number;
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
  icon?: string;
  image_url?: string;
  audio_prompt?: string;
  is_active: boolean;
  // Phase 5: Marketplace
  public?: boolean;
  community_rating?: number;
  community_ratings_count?: number;
}

export interface TaskInstance {
  id: number;
  template_id: number;
  child_id: number;
  date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'missed' | 'skipped';
  timer_started_at?: string;
  timer_ended_at?: string;
  asks_count: number;
  points_earned: number;
  bonus_points: number;
  penalty_points: number;
  template?: TaskTemplate;
  photo_url?: string;
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

// Phase 4: Power-Ups
export interface PowerUp {
  id: number;
  name: string;
  description: string;
  icon: string;
  effect_type: 'double_points' | 'streak_shield' | 'time_freeze' | 'mystery_boost' | 'skip_pass';
  effect_value: number;
  cost_gems: number;
  max_per_week: number;
}

export interface PowerUpPurchase {
  id: number;
  powerup_id: number;
  powerup_name: string;
  powerup_icon: string;
  effect_type: string;
  effect_value: number;
  is_active: boolean;
  purchased_at: string;
  expires_at?: string | null;
}

// Phase 4: Shabbat
export interface ShabbatSettings {
  shabbat_mode: boolean;
  shabbat_start_time?: string | null;
  shabbat_end_time?: string | null;
  shabbat_auto_detect: boolean;
}

export interface ShabbatStatus {
  active: boolean;
  greeting?: string | null;
  starts_in_minutes?: number | null;
  ends_in_minutes?: number | null;
}

// Phase 4: Theme
export interface ThemePreferences {
  focus_mode: boolean;
  colorblind_theme?: string | null;
  high_contrast: boolean;
  language: string;
}

// Phase 4: Schedule Preview
export interface ScheduleDay {
  date: string;
  day: string;
  scheduled: boolean;
}

// Phase 5: Organizations
export interface Organization {
  id: number;
  name: string;
  type: 'school' | 'classroom' | 'youth_group' | 'scouts';
  code: string;
  created_by_id: number;
  created_at?: string;
  members?: OrganizationMember[];
  member_count?: number;
}

export interface OrganizationMember {
  id: number;
  org_id: number;
  family_id: number;
  role: 'admin' | 'member';
  joined_at?: string;
}

// Phase 5: Integrations
export interface ApiKeyInfo {
  id: number;
  name: string;
  scopes: string[];
  created_at?: string;
  last_used?: string | null;
  revoked: boolean;
}

export interface ApiKeyCreated {
  id: number;
  name: string;
  key: string;
  scopes: string[];
  created_at?: string;
}

// Phase 5: Seasonal Events
export interface SeasonalEvent {
  id: number;
  name: string;
  theme: string;
  description?: string;
  start_date: string;
  end_date: string;
  bonus_multiplier: number;
  special_badge_name?: string;
  is_active: boolean;
}

export interface ActiveEvents {
  events: SeasonalEvent[];
  has_active: boolean;
}

// Phase 5: School
export interface HomeworkAssignment {
  id: number;
  org_id: number;
  teacher_id: number;
  child_id: number;
  title: string;
  description?: string;
  subject?: string;
  due_date?: string;
  points: number;
  status: 'assigned' | 'completed' | 'overdue';
  completed_at?: string;
  created_at?: string;
}

// Phase 6: Notifications
export interface Notification {
  id: number;
  title: string;
  body?: string;
  type: 'streak_risk' | 'milestone' | 'leaderboard' | 'achievement' | 'system';
  read: boolean;
  link?: string;
  created_at?: string;
}

// Phase 6: Photo Verification
export interface PendingApproval {
  id: number;
  template_name: string;
  child_name: string;
  child_id: number;
  photo_url?: string;
  completed_at?: string;
  status: string;
}

// Phase 6: Admin Metrics
export interface AdminMetrics {
  user_count: number;
  parent_count: number;
  child_count: number;
  family_count: number;
  tasks_completed_today: number;
  active_streaks: number;
}

// Phase 7: Tier 1 — Little Explorers
export interface Tier1Task {
  id: number;
  template_id: number;
  icon: string;
  image_url?: string;
  audio_prompt: string;
  category: string;
  status: string;
  task_type: string;
  timer_duration?: number;
  points: number;
}

export interface Tier1TasksResponse {
  tasks: Tier1Task[];
  total_pending: number;
  child_name: string;
  stars: number;
  gems: number;
  level: number;
}

export interface PetState {
  pet: {
    stage: string;
    emoji: string;
    mood: string;
    expression: string;
  };
  stats: {
    level: number;
    stars: number;
    gems: number;
    streak: number;
    tasks_completed_today: number;
  };
  stickers: Array<{ icon: string; image_url?: string; name: string }>;
  world_brightness: number;
}

// Phase 7: Avatar Shop
export interface AvatarShopItem {
  id: number;
  item_name: string;
  item_type: 'outfit' | 'pet' | 'accessory' | 'background' | 'name_color' | 'emote';
  slot: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  emoji?: string;
  color?: string;
  cost_gems: number;
  cost_stars: number;
  owned: boolean;
}

export interface OwnedAvatarItem {
  id: number;
  item_id: number;
  item_name: string;
  item_type: string;
  slot: string;
  rarity: string;
  emoji?: string;
  color?: string;
  equipped: number;
  acquired_at?: string;
}

export interface BuyResult {
  message: string;
  item_id: number;
  item_name: string;
  gems_remaining: number;
  stars_remaining: number;
}

// Phase 7: Allowance
export interface AllowanceStatus {
  allowance_rate: number;
  currency: string;
  stars: number;
  allowance_amount: number;
  savings_goal: number;
  progress_percent: number;
  enabled: boolean;
}

// Phase 7: Notification Preferences
export interface NotificationPreferences {
  task_complete: boolean;
  level_up: boolean;
  achievement: boolean;
  streak_risk: boolean;
  leaderboard: boolean;
  cheer_received: boolean;
  family_goal: boolean;
  sounds: boolean;
  voice_narration: boolean;
  toasts: boolean;
}

// Phase 8: Sound Settings
export interface SoundSettingsData {
  master_volume: number;
  music_volume: number;
  sfx_volume: number;
  muted: boolean;
}

// Phase 8: Daily Rituals
export interface RitualData {
  ritual_type: 'morning' | 'after_school' | 'evening' | 'weekend';
  time_window_start?: string | null;
  time_window_end?: string | null;
  enabled: boolean;
}

export interface RitualStatus {
  active_ritual: string | null;
  message: string | null;
}

// Phase 8: Family Messages
export interface FamilyMessage {
  id: number;
  family_id: number;
  sender_id?: number | null;
  sender_name?: string | null;
  message: string;
  type: 'announcement' | 'cheer' | 'reminder' | 'system';
  pinned: boolean;
  created_at?: string | null;
}

// Phase 8: Task Suggestions
export interface TaskSuggestion {
  id: number;
  suggestion_type: 'timer' | 'difficulty' | 'schedule' | 'new_task' | 'pricing';
  title: string;
  description?: string | null;
  reason?: string | null;
  related_task_id?: number | null;
  suggested_change?: Record<string, unknown> | null;
  status: 'pending' | 'applied' | 'dismissed';
  created_at?: string | null;
}

// Phase 8: Analytics
export interface ChildTrends {
  child_id: number;
  period_days: number;
  total_completed: number;
  daily: Array<{
    date: string;
    total: number;
    completed: number;
    rate: number;
    points: number;
  }>;
  day_of_week_performance: Record<string, number>;
  average_completion_seconds?: number;
  category_breakdown: Record<string, number>;
  completion_rate: number;
  best_day?: string | null;
  worst_day?: string | null;
}
