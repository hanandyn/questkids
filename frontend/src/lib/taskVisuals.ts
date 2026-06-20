export const DEFAULT_TASK_IMAGES = [
  { label: 'Brush Teeth', keywords: ['brush', 'teeth', 'tooth'], icon: '🪥', imageUrl: '/task-images/brush-teeth.svg' },
  { label: 'Empty Trash', keywords: ['trash', 'garbage', 'bin'], icon: '🗑️', imageUrl: '/task-images/empty-trash.svg' },
  { label: 'Clean Room', keywords: ['clean room', 'tidy', 'room'], icon: '🧹', imageUrl: '/task-images/clean-room.svg' },
  { label: 'Homework', keywords: ['homework', 'study', 'math', 'school'], icon: '📚', imageUrl: '/task-images/homework.svg' },
  { label: 'Shower', keywords: ['shower', 'bath'], icon: '🚿', imageUrl: '/task-images/shower.svg' },
  { label: 'Make Bed', keywords: ['bed', 'sleep'], icon: '🛏️', imageUrl: '/task-images/make-bed.svg' },
  { label: 'Dishes', keywords: ['dishes', 'dishwasher', 'plates'], icon: '🍽️', imageUrl: '/task-images/dishes.svg' },
  { label: 'Laundry', keywords: ['laundry', 'clothes'], icon: '🧺', imageUrl: '/task-images/laundry.svg' },
  { label: 'Read Book', keywords: ['read', 'book'], icon: '📖', imageUrl: '/task-images/read-book.svg' },
  { label: 'Get Dressed', keywords: ['dress', 'clothes'], icon: '👕', imageUrl: '/task-images/get-dressed.svg' },
  { label: 'Feed Pet', keywords: ['pet', 'feed dog', 'feed cat'], icon: '🐾', imageUrl: '/task-images/feed-pet.svg' },
  { label: 'Set Table', keywords: ['table', 'dinner'], icon: '🍽️', imageUrl: '/task-images/set-table.svg' },
];

const CATEGORY_VISUALS: Record<string, { icon: string; imageUrl: string }> = {
  hygiene: { icon: '🪥', imageUrl: '/task-images/brush-teeth.svg' },
  chores: { icon: '🧹', imageUrl: '/task-images/clean-room.svg' },
  homework: { icon: '📚', imageUrl: '/task-images/homework.svg' },
  school: { icon: '📚', imageUrl: '/task-images/homework.svg' },
  learning: { icon: '📖', imageUrl: '/task-images/read-book.svg' },
  reading: { icon: '📖', imageUrl: '/task-images/read-book.svg' },
  exercise: { icon: '🏃', imageUrl: '/task-images/exercise.svg' },
  health: { icon: '🏃', imageUrl: '/task-images/exercise.svg' },
  'self-care': { icon: '👕', imageUrl: '/task-images/get-dressed.svg' },
  food: { icon: '🍽️', imageUrl: '/task-images/set-table.svg' },
  pets: { icon: '🐾', imageUrl: '/task-images/feed-pet.svg' },
};

export function inferTaskVisual(name?: string, category?: string) {
  const haystack = `${name || ''} ${category || ''}`.toLowerCase();
  const match = DEFAULT_TASK_IMAGES.find(item => item.keywords.some(keyword => haystack.includes(keyword)));
  if (match) return { icon: match.icon, imageUrl: match.imageUrl };
  if (category && CATEGORY_VISUALS[category]) return CATEGORY_VISUALS[category];
  return { icon: '⭐', imageUrl: '/task-images/default-task.svg' };
}
