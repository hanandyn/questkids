import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { Notification } from '../../lib/types';

export function NotificationBell() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await api.getUnreadCount() as { unread_count: number };
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(20, 0) as unknown as Notification[];
      setNotifications(data);
    } catch { /* ignore */ }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) loadNotifications();
  };

  const handleMarkRead = async (id: number) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notifications.justNow');
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const typeIcon: Record<string, string> = {
    streak_risk: '🔥',
    milestone: '🏆',
    leaderboard: '📊',
    achievement: '⭐',
    system: 'ℹ️',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-white/20 transition-colors"
        aria-label={t('notifications.title')}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-lg">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await api.markAllNotificationsRead();
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  setUnreadCount(0);
                }}
                className="text-xs text-quest-blue hover:underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                {t('notifications.empty')}
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{typeIcon[n.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {n.title}
                        {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                      </div>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                      <span className="text-xs text-gray-400 mt-1 block">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
