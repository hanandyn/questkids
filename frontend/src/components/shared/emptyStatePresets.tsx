import { EmptyState } from './EmptyState';

/** Pre-configured empty states for common use cases */
export const EmptyStates = {
  noTasks: (action?: () => void) => (
    <EmptyState
      icon="🏰"
      title="No tasks yet!"
      description="Your quest board is empty. Ask a parent to create some tasks for you."
      action={action ? { label: 'Go to Dashboard', onClick: action } : undefined}
    />
  ),
  noRewards: () => (
    <EmptyState
      icon="🎁"
      title="No rewards in the shop"
      description="Save up your stars and gems — new rewards will appear here when parents add them."
    />
  ),
  noAchievements: () => (
    <EmptyState
      icon="🏆"
      title="No achievements yet"
      description="Complete tasks and build streaks to unlock achievements!"
    />
  ),
  noNotifications: () => (
    <EmptyState
      icon="🔔"
      title="All caught up!"
      description="You have no new notifications right now."
    />
  ),
  noResults: (query?: string) => (
    <EmptyState
      icon="🔍"
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try adjusting your search or filters."
    />
  ),
  serverError: (onRetry?: () => void) => (
    <EmptyState
      icon="⚠️"
      title="Something went wrong"
      description="We couldn't load this content. Please try again."
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  ),
};
