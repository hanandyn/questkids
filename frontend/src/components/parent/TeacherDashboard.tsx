import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { User, HomeworkAssignment } from '../../lib/types';

interface Props {
  onClose: () => void;
}

export function TeacherDashboard({ onClose }: Props) {
  const { t } = useTranslation();
  const [children, setChildren] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New assignment form
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [points, setPoints] = useState(20);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    Promise.all([
      api.getChildren() as unknown as User[],
      api.getHomeworkAssignments() as unknown as HomeworkAssignment[],
    ]).then(([childrenData, assignmentsData]) => {
      setChildren(childrenData);
      setAssignments(assignmentsData);
      setLoading(false);
    }).catch(e => {
      setError((e as Error).message);
      setLoading(false);
    });
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId || !title.trim()) return;
    try {
      await api.createHomeworkAssignment({
        child_id: selectedChildId,
        title: title.trim(),
        description: description || undefined,
        subject: subject || undefined,
        points,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setSuccess(`${title} assigned!`);
      setTitle('');
      setDescription('');
      setSubject('');
      setPoints(20);
      setDueDate('');
      setTimeout(() => setSuccess(''), 3000);
      api.getHomeworkAssignments()
        .then(d => setAssignments(d as unknown as HomeworkAssignment[]))
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">{t('app.loading')}</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          👩‍🏫 {t('teacher.title', 'Teacher Dashboard')}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4">{success}</div>
      )}

      {/* Assignment Form */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 border">
        <h3 className="font-bold text-lg mb-3">📝 {t('teacher.newAssignment', 'New Assignment')}</h3>
        <form onSubmit={handleAssign}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold">{t('teacher.child', 'Student')}</label>
              <select
                value={selectedChildId ?? ''}
                onChange={e => setSelectedChildId(Number(e.target.value) || null)}
                className="w-full p-2 border rounded mt-1"
                required
              >
                <option value="">{t('teacher.selectChild', 'Select student...')}</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.display_name} (Age Tier {child.age_tier})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">{t('teacher.titleLabel', 'Title')}</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-2 border rounded mt-1"
                placeholder={t('teacher.titlePlaceholder', 'e.g., Math Worksheet Ch. 5')}
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{t('teacher.description', 'Description')}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2 border rounded mt-1"
                rows={2}
                placeholder={t('teacher.descPlaceholder', 'Optional details...')}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-semibold">{t('teacher.subject', 'Subject')}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full p-2 border rounded mt-1"
                  placeholder={t('teacher.subjectPlaceholder', 'e.g., Math, English')}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold">{t('teacher.points', 'Points')}</label>
                <input
                  type="number"
                  value={points}
                  onChange={e => setPoints(Number(e.target.value))}
                  className="w-full p-2 border rounded mt-1"
                  min={5}
                  max={100}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">{t('teacher.dueDate', 'Due Date')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-quest-blue text-white rounded font-semibold hover:bg-blue-600 transition"
            >
              📨 {t('teacher.assign', 'Assign Homework')}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Assignments */}
      <h3 className="font-bold text-lg mb-3">📋 {t('teacher.recentAssignments', 'Recent Assignments')}</h3>
      {assignments.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <p>{t('teacher.noAssignments', 'No assignments yet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.slice(0, 10).map(a => (
            <div key={a.id} className={`bg-white rounded-lg shadow p-3 border ${
              a.status === 'completed' ? 'opacity-60' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <div className="flex gap-2 mt-1">
                    {a.subject && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{a.subject}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-quest-blue">⭐ {a.points} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
