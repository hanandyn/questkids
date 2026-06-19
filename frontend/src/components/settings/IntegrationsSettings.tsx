import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { ApiKeyInfo, ApiKeyCreated } from '../../lib/types';

export function IntegrationsSettings() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read:tasks']);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);

  const availableScopes = [
    { value: 'read:tasks', label: 'Read Tasks' },
    { value: 'write:tasks', label: 'Write Tasks' },
    { value: 'read:children', label: 'Read Children' },
    { value: 'read:rewards', label: 'Read Rewards' },
  ];

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getApiKeys() as unknown as ApiKeyInfo[];
      setKeys(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setError('');
    try {
      const data = await api.createApiKey({ name: newKeyName, scopes: newKeyScopes }) as unknown as ApiKeyCreated;
      setCreatedKey(data);
      setShowCreate(false);
      setNewKeyName('');
      loadKeys();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (!window.confirm(t('integrations.confirmRevoke', 'Revoke this API key? This cannot be undone.'))) return;
    try {
      await api.revokeApiKey(keyId);
      setSuccess(t('integrations.revoked', 'API key revoked'));
      loadKeys();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setSuccess(t('integrations.copied', 'Key copied! Save it now — it won\'t be shown again.'));
    setTimeout(() => setSuccess(''), 5000);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">{t('app.loading')}</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🔌 {t('integrations.title', 'Integrations & API')}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4">{success}</div>
      )}

      {/* Created Key Display */}
      {createdKey && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
          <h3 className="font-bold text-yellow-800 mb-2">🔑 {t('integrations.newKey', 'New API Key Created!')}</h3>
          <p className="text-sm text-yellow-700 mb-2">
            {t('integrations.copyWarning', 'Copy this key now. You won\'t be able to see it again.')}
          </p>
          <div className="flex gap-2">
            <code className="flex-1 p-2 bg-yellow-100 rounded text-sm break-all font-mono">
              {createdKey.key}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey.key)}
              className="px-3 py-2 bg-yellow-500 text-white rounded font-semibold text-sm"
            >
              📋
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-sm text-yellow-600 underline"
          >
            {t('integrations.dismiss', 'Dismiss')}
          </button>
        </div>
      )}

      {/* API Docs Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-800">📖 {t('integrations.docs', 'API Documentation')}</h3>
        <p className="text-sm text-blue-600 mt-1">
          {t('integrations.docsDesc', 'Full OpenAPI documentation is available at')}{' '}
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            /docs
          </a>
        </p>
        <p className="text-sm text-blue-600 mt-1">
          {t('integrations.authHeader', 'Authenticate with header:')}{' '}
          <code className="bg-blue-100 px-1 rounded">x-api-key: your_key_here</code>
        </p>
      </div>

      <button
        onClick={() => setShowCreate(!showCreate)}
        className="w-full py-3 bg-quest-blue text-white rounded-lg font-semibold mb-4 hover:bg-blue-600 transition"
      >
        + {t('integrations.createKey', 'Create API Key')}
      </button>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 border">
          <h3 className="font-semibold mb-3">{t('integrations.newKeyForm', 'New API Key')}</h3>
          <input
            type="text"
            placeholder={t('integrations.keyName', 'Key name (e.g., "Home Assistant")')}
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          />
          <p className="text-sm font-semibold mb-2">{t('integrations.scopes', 'Scopes:')}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {availableScopes.map(s => (
              <button
                key={s.value}
                onClick={() => toggleScope(s.value)}
                className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                  newKeyScopes.includes(s.value)
                    ? 'bg-quest-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={handleCreate} className="w-full py-2 bg-green-500 text-white rounded font-semibold">
            {t('integrations.generate', 'Generate Key')}
          </button>
        </div>
      )}

      {/* Existing Keys */}
      {keys.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          <p>{t('integrations.noKeys', 'No API keys yet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <div key={key.id} className="bg-white rounded-lg shadow p-3 border flex items-center justify-between">
              <div>
                <span className="font-semibold">{key.name}</span>
                <div className="flex gap-1 mt-1">
                  {key.scopes.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-gray-100 text-xs rounded-full">{s}</span>
                  ))}
                </div>
                {key.last_used && (
                  <p className="text-xs text-gray-400 mt-1">
                    {t('integrations.lastUsed', 'Last used')}: {new Date(key.last_used).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRevoke(key.id)}
                className="px-3 py-1 text-sm text-red-500 border border-red-200 rounded hover:bg-red-50"
              >
                {t('integrations.revoke', 'Revoke')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
