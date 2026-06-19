import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

export function EmailVerificationPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('emailVerification.missingToken'));
      return;
    }

    api.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage(t('emailVerification.success'));
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message || t('emailVerification.failed'));
      });
  }, [token, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-quest-blue via-quest-purple to-quest-pink p-4">
      <div className="card-quest w-full max-w-md text-center animate-bounce-in">
        {status === 'loading' && (
          <>
            <div className="text-6xl animate-bounce mb-4">📧</div>
            <h1 className="text-2xl font-bold mb-2">{t('emailVerification.checking')}</h1>
            <p className="text-gray-500">{t('emailVerification.pleaseWait')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2 text-green-600">{t('emailVerification.verified')}</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <a href="/" className="btn-primary inline-block">{t('emailVerification.goToApp')}</a>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2 text-red-600">{t('emailVerification.failed')}</h1>
            <p className="text-gray-500 mb-6">{message}</p>
            <a href="/" className="btn-primary inline-block">{t('emailVerification.backToLogin')}</a>
          </>
        )}
      </div>
    </div>
  );
}
