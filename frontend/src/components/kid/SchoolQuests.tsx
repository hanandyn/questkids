import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { HomeworkAssignment } from '../../lib/types';

export function SchoolQuests() {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getHomeworkAssignments()
      .then(data => setAssignments(data as unknown as HomeworkAssignment[]))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (id: number) => {
    try {
      await api.completeHomework(id);
      api.getHomeworkAssignments()
        .then(data => setAssignments(data as unknown as HomeworkAssignment[]))
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-bounce text-3xl">📚</div>
        <p className="text-gray-500 mt-1">{t('app.loading')}</p>
      </div>
    );
  }

  const pending = assignments.filter(a => a.status === 'assigned');
  const completed = assignments.filter(a => a.status === 'completed');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
        🏫 {t('school.title', 'School Quests')}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 mb-3 text-sm">{error}</div>
      )}

      {pending.length === 0 && completed.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <div className="text-4xl">📝</div>
          <p className="mt-1">{t('school.noAssignments', 'No school assignments yet')}</p>
        </div>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-orange-600 mb-2">
                📋 {t('school.pending', 'Pending')} ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map(a => (
                  <div key={a.id} className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      {a.subject && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {a.subject}
                        </span>
                      )}
                      {a.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          📅 {new Date(a.due_date).toLocaleDateString()}
                        </p>
                      )}
                      <span className="text-xs text-orange-600 mt-1 block">
                        ⭐ {a.points} pts
                      </span>
                    </div>
                    <button
                      onClick={() => handleComplete(a.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600 transition"
                    >
                      ✅ {t('quests.done', 'Done!')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 mb-2">
                ✅ {t('school.completed', 'Completed')} ({completed.length})
              </h3>
              <div className="space-y-2">
                {completed.map(a => (
                  <div key={a.id} className="bg-green-50 border border-green-200 rounded-lg p-3 opacity-75">
                    <p className="font-semibold">{a.title}</p>
                    <span className="text-xs text-green-600">⭐ {a.points} pts earned</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
