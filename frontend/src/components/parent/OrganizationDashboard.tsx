import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { Organization } from '../../lib/types';

interface Props {
  onClose: () => void;
}

export function OrganizationDashboard({ onClose }: Props) {
  const { t } = useTranslation();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('school');
  const [joinCode, setJoinCode] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getMyOrganizations()
      .then(data => { setOrgs(data as unknown as Organization[]); setLoading(false); })
      .catch(e => { setError((e as Error).message); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;
    setError('');
    setSuccess('');
    try {
      await api.createOrganization({ name: newOrgName, type: newOrgType });
      setSuccess('Organization created! Share the code with families to join.');
      setShowCreate(false);
      setNewOrgName('');
      api.getMyOrganizations()
        .then(data => setOrgs(data as unknown as Organization[]))
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setError('');
    setSuccess('');
    try {
      await api.joinOrganization(joinCode.trim());
      setSuccess('Successfully joined the organization!');
      setShowJoin(false);
      setJoinCode('');
      api.getMyOrganizations()
        .then(data => setOrgs(data as unknown as Organization[]))
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleLeave = async (orgId: number) => {
    try {
      await api.leaveOrganization(orgId);
      api.getMyOrganizations()
        .then(data => setOrgs(data as unknown as Organization[]))
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-bounce text-4xl">🏫</div>
        <p className="text-gray-500 mt-2">{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🏫 {t('organizations.title', 'Organizations')}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4">{success}</div>
      )}

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
          className="flex-1 py-3 bg-quest-blue text-white rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          + {t('organizations.create', 'Create')}
        </button>
        <button
          onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
          className="flex-1 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
        >
          🔗 {t('organizations.join', 'Join')}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 border">
          <h3 className="font-semibold mb-3">{t('organizations.createNew', 'Create Organization')}</h3>
          <input
            type="text"
            placeholder={t('organizations.namePlaceholder', 'Organization Name')}
            value={newOrgName}
            onChange={e => setNewOrgName(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          />
          <select
            value={newOrgType}
            onChange={e => setNewOrgType(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="school">{t('organizations.typeSchool', 'School')}</option>
            <option value="classroom">{t('organizations.typeClassroom', 'Classroom')}</option>
            <option value="youth_group">{t('organizations.typeYouth', 'Youth Group')}</option>
            <option value="scouts">{t('organizations.typeScouts', 'Scouts')}</option>
          </select>
          <button onClick={handleCreate} className="w-full py-2 bg-quest-blue text-white rounded font-semibold">
            {t('organizations.createBtn', 'Create Organization')}
          </button>
        </div>
      )}

      {showJoin && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 border">
          <h3 className="font-semibold mb-3">{t('organizations.joinTitle', 'Join by Code')}</h3>
          <input
            type="text"
            placeholder={t('organizations.codePlaceholder', 'Enter join code')}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            className="w-full p-2 border rounded mb-3 uppercase"
            maxLength={8}
          />
          <button onClick={handleJoin} className="w-full py-2 bg-green-500 text-white rounded font-semibold">
            {t('organizations.joinBtn', 'Join Organization')}
          </button>
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-5xl">🏛️</div>
          <p className="mt-2">{t('organizations.none', 'No organizations yet. Create one or join with a code!')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map(org => (
            <div key={org.id} className="bg-white rounded-lg shadow p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{org.name}</h3>
                  <p className="text-sm text-gray-500">
                    {org.type} · {t('organizations.code', 'Code')}: <span className="font-mono font-bold">{org.code}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {org.member_count ?? org.members?.length ?? 0} {t('organizations.members', 'members')}
                  </p>
                </div>
                <button
                  onClick={() => handleLeave(org.id)}
                  className="px-3 py-1 text-sm text-red-500 border border-red-200 rounded hover:bg-red-50"
                >
                  {t('organizations.leave', 'Leave')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
