import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

interface Props {
  instanceId: number;
  onPhotoUploaded?: (photoUrl: string) => void;
  existingPhoto?: string;
}

export function PhotoUploader({ instanceId, onPhotoUploaded, existingPhoto }: Props) {
  const { t } = useTranslation();
  const [photoUrl, setPhotoUrl] = useState<string | null>(existingPhoto || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError(t('photo.invalidType'));
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('photo.tooLarge'));
      return;
    }

    setUploading(true);
    setError('');
    try {
      const result = await api.uploadTaskPhoto(instanceId, file);
      setPhotoUrl(result.photo_url);
      onPhotoUploaded?.(result.photo_url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const photoSrc = photoUrl ? api.getTaskPhotoUrl(instanceId) : null;

  return (
    <div className="mt-3">
      <label className="block text-sm font-bold mb-2">📸 {t('photo.proof')}</label>

      {photoSrc && (
        <div className="mb-3 relative">
          <img
            src={photoSrc}
            alt="Task proof"
            className="w-full max-h-48 object-cover rounded-xl border-2 border-quest-blue/30"
          />
          <button
            onClick={() => {
              setPhotoUrl(null);
              onPhotoUploaded?.('');
            }}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {!photoSrc && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {uploading ? '⏳' : '📷'} {uploading ? t('photo.uploading') : t('photo.takePhoto')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
