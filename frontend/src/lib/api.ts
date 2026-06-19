const API_BASE = '/api/v1';

type JSONData = Record<string, unknown>;

async function apiFetch<T = JSONData>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export const api = {
  // Auth
  registerParent: (data: JSONData) => apiFetch('/auth/register-parent', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: JSONData) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  createChild: (data: JSONData) => apiFetch('/auth/create-child', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch('/auth/me'),
  getFamily: () => apiFetch('/auth/family'),
  getChildren: () => apiFetch('/auth/children'),

  // Tasks
  createTemplate: (data: JSONData) => apiFetch('/tasks/templates', { method: 'POST', body: JSON.stringify(data) }),
  getTemplates: () => apiFetch('/tasks/templates'),
  deleteTemplate: (id: number) => apiFetch(`/tasks/templates/${id}`, { method: 'DELETE' }),
  getInstances: (childId?: number) => apiFetch(`/tasks/instances${childId ? `?child_id=${childId}` : ''}`),
  startTimer: (id: number) => apiFetch(`/tasks/instances/${id}/start-timer`, { method: 'POST' }),
  completeTask: (id: number, elapsedSeconds: number) => apiFetch(`/tasks/instances/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ task_instance_id: id, elapsed_seconds: elapsedSeconds }),
  }),
  approveTask: (id: number, approved: boolean, notes?: string) => apiFetch(`/tasks/instances/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approved, notes }),
  }),
  incrementAsk: (id: number) => apiFetch(`/tasks/instances/${id}/increment-ask`, { method: 'POST' }),

  // Rewards
  createReward: (data: JSONData) => apiFetch('/rewards', { method: 'POST', body: JSON.stringify(data) }),
  getRewards: () => apiFetch('/rewards'),
  deleteReward: (id: number) => apiFetch(`/rewards/${id}`, { method: 'DELETE' }),
  redeemReward: (id: number) => apiFetch(`/rewards/${id}/redeem`, { method: 'POST' }),
  getRedemptions: (childId?: number) => apiFetch(`/rewards/redemptions${childId ? `?child_id=${childId}` : ''}`),
  approveRedemption: (id: number) => apiFetch(`/rewards/redemptions/${id}/approve`, { method: 'POST' }),

  // Leaderboard
  getLeaderboard: () => apiFetch('/leaderboard'),
  getChildStreak: (childId: number) => apiFetch(`/leaderboard/child/${childId}/streak`),

  // Achievements
  getAchievements: () => apiFetch('/achievements'),
  getChildAchievements: (childId: number) => apiFetch(`/achievements/child/${childId}`),

  // Daily Spin
  dailySpin: () => apiFetch('/achievements/daily-spin', { method: 'POST' }),
  dailySpinStatus: () => apiFetch('/achievements/daily-spin/status'),

  // Mystery Chest
  openMysteryChest: () => apiFetch('/achievements/mystery-chest', { method: 'POST' }),
  mysteryChestStatus: () => apiFetch('/achievements/mystery-chest/status'),

  // Avatar
  updateAvatar: (avatarConfig: string) => apiFetch('/achievements/avatar', {
    method: 'POST',
    body: JSON.stringify({ avatar_config: avatarConfig }),
  }),

  // Family Goals
  createFamilyGoal: (data: JSONData) => apiFetch('/family-goals', { method: 'POST', body: JSON.stringify(data) }),
  getFamilyGoals: () => apiFetch('/family-goals'),
  getFamilyGoalStatus: () => apiFetch('/family-goals/status'),
  deleteFamilyGoal: (id: number) => apiFetch(`/family-goals/${id}`, { method: 'DELETE' }),

  // Cheers
  sendCheer: (data: JSONData) => apiFetch('/cheers', { method: 'POST', body: JSON.stringify(data) }),
  getReceivedCheers: () => apiFetch('/cheers/received'),
  getCheersSentToday: () => apiFetch('/cheers/sent-today'),

  // Enhanced Leaderboard
  getEnhancedLeaderboard: (period = 'all_time') => apiFetch(`/leaderboard/enhanced?period=${period}`),

  // Weekly Recap
  getWeeklyRecap: (date?: string) => apiFetch(`/recap/weekly${date ? `?recap_date=${date}` : ''}`),
  getKidRecap: (date?: string) => apiFetch(`/recap/weekly/kid${date ? `?recap_date=${date}` : ''}`),

  // Insights & Tips
  getInsightsTips: () => apiFetch('/insights/tips'),
  getInsightsAnalytics: (days = 30) => apiFetch(`/insights/analytics?days=${days}`),

  // Power-Ups
  getPowerUps: () => apiFetch('/powerups'),
  purchasePowerUp: (id: number) => apiFetch(`/powerups/${id}/purchase`, { method: 'POST' }),
  getActivePowerUps: () => apiFetch('/powerups/active'),

  // Shabbat Mode
  getShabbatSettings: () => apiFetch('/settings/shabbat'),
  updateShabbatSettings: (data: JSONData) => apiFetch('/settings/shabbat', { method: 'PUT', body: JSON.stringify(data) }),
  getShabbatStatus: () => apiFetch('/settings/shabbat/status'),

  // Scheduling
  schedulePreview: (templateId: number) => apiFetch('/settings/schedule/preview', { method: 'POST', body: JSON.stringify({ template_id: templateId }) }),
  generateWeekInstances: () => apiFetch('/settings/schedule/generate', { method: 'POST' }),

  // Theme Preferences
  getThemePreferences: () => apiFetch('/settings/theme'),
  updateThemePreferences: (data: JSONData) => apiFetch('/settings/theme', { method: 'PUT', body: JSON.stringify(data) }),

  // Phase 5: Organizations
  createOrganization: (data: JSONData) => apiFetch('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  joinOrganization: (code: string) => apiFetch('/organizations/join', { method: 'POST', body: JSON.stringify({ code }) }),
  getMyOrganizations: () => apiFetch('/organizations/my'),
  getOrganization: (id: number) => apiFetch(`/organizations/${id}`),
  leaveOrganization: (id: number) => apiFetch(`/organizations/${id}`, { method: 'DELETE' }),

  // Phase 5: Template Marketplace
  getMarketplace: (filters?: { age_tier?: number; category?: string; task_type?: string; search?: string; sort_by?: string }) => {
    const params = new URLSearchParams();
    if (filters?.age_tier) params.set('age_tier', String(filters.age_tier));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.task_type) params.set('task_type', filters.task_type);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.sort_by) params.set('sort_by', filters.sort_by);
    const qs = params.toString();
    return apiFetch(`/templates/marketplace${qs ? `?${qs}` : ''}`);
  },
  getMarketplaceCategories: () => apiFetch('/templates/marketplace/categories'),
  forkTemplate: (id: number) => apiFetch(`/templates/${id}/fork`, { method: 'POST' }),
  rateTemplate: (id: number, rating: number) => apiFetch(`/templates/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating }) }),

  // Phase 5: Integrations
  createApiKey: (data: JSONData) => apiFetch('/integrations/keys', { method: 'POST', body: JSON.stringify(data) }),
  getApiKeys: () => apiFetch('/integrations/keys'),
  revokeApiKey: (id: number) => apiFetch(`/integrations/keys/${id}`, { method: 'DELETE' }),

  // Phase 5: School
  createHomeworkAssignment: (data: JSONData) => apiFetch('/school/assignments', { method: 'POST', body: JSON.stringify(data) }),
  getHomeworkAssignments: () => apiFetch('/school/assignments'),
  completeHomework: (id: number, completed = true) => apiFetch(`/school/assignments/${id}/complete`, { method: 'POST', body: JSON.stringify({ completed }) }),

  // Phase 5: Calendar
  getCalendarFeedUrl: (childId: number) => `/api/v1/calendar/${childId}/feed.ics`,

  // Phase 5: Seasonal Events
  getActiveEvents: () => apiFetch('/events/active'),
};
