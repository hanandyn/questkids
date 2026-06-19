import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

export function CalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [children, setChildren] = useState<Array<{ id: number; display_name: string }>>([]);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === 'parent') {
      api.getChildren().then(data => {
        setChildren(data as unknown as Array<{ id: number; display_name: string }>);
      }).catch(() => {});
    }
  }, [user]);

  const getFeedUrl = (childId: number) => {
    const token = localStorage.getItem('token');
    // iCal feeds use a different auth — we embed the token as a query param for simplicity
    return `${window.location.origin}/api/v1/calendar/${childId}/feed.ics?token=${token}`;
  };

  const copyUrl = (childId: number) => {
    const url = getFeedUrl(childId);
    void navigator.clipboard.writeText(url);
    setCopied(childId);
    setTimeout(() => setCopied(null), 3000);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📅 {t('calendar.title', 'Calendar Integration')}
      </h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800">{t('calendar.howTo', 'How to subscribe')}</h3>
        <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
          <li>{t('calendar.step1', 'Copy the calendar feed URL below')}</li>
          <li>{t('calendar.step2', 'Open your calendar app (Google Calendar, Apple Calendar, Outlook)')}</li>
          <li>{t('calendar.step3', 'Find "Add Calendar" → "From URL" or "Subscribe"')}</li>
          <li>{t('calendar.step4', 'Paste the URL and save')}</li>
        </ol>
        <p className="text-sm text-blue-600 mt-2">
          💡 {t('calendar.tip', 'The calendar will auto-update with new quests and milestones!')}
        </p>
      </div>

      {children.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-5xl">📅</div>
          <p className="mt-2">{t('calendar.noChildren', 'Add children to enable calendar feeds')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map(child => (
            <div key={child.id} className="bg-white rounded-lg shadow p-4 border">
              <h3 className="font-bold text-lg mb-2">
                🧒 {child.display_name}
              </h3>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-gray-50 rounded text-xs break-all font-mono border">
                  {getFeedUrl(child.id)}
                </code>
                <button
                  onClick={() => copyUrl(child.id)}
                  className="px-3 py-2 bg-quest-blue text-white rounded text-sm font-semibold hover:bg-blue-600 transition"
                >
                  {copied === child.id ? '✅' : '📋'}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(getFeedUrl(child.id))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  {t('calendar.addToGoogle', 'Add to Google Calendar')}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
