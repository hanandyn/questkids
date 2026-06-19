import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { TaskTemplate } from '../../lib/types';

interface Props {
  onClose: () => void;
  onFork: (template: TaskTemplate) => void;
}

export function TemplateMarketplace({ onClose, onFork }: Props) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [forkingId, setForkingId] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMarketplace({
        category: categoryFilter || undefined,
        search: search || undefined,
        sort_by: sortBy,
      }) as unknown as TaskTemplate[];
      setTemplates(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, sortBy]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getMarketplaceCategories() as unknown as Array<{ category: string; count: number }>;
      setCategories(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
    loadCategories();
  }, [loadTemplates, loadCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTemplates();
  };

  const handleFork = async (templateId: number) => {
    setForkingId(templateId);
    setError('');
    try {
      const data = await api.forkTemplate(templateId) as unknown as TaskTemplate;
      setSuccess(`${data.name} added to your templates!`);
      onFork(data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setForkingId(null);
    }
  };

  const handleRate = async (templateId: number, rating: number) => {
    setRatingId(templateId);
    try {
      await api.rateTemplate(templateId, rating);
      loadTemplates();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRatingId(null);
    }
  };

  const getRatingStars = (template: TaskTemplate) => {
    const avg = template.community_ratings_count && template.community_ratings_count > 0
      ? (template.community_rating || 0) / template.community_ratings_count
      : 0;
    return avg.toFixed(1);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          📋 {t('marketplace.title', 'Template Marketplace')}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4">{success}</div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 border">
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder={t('marketplace.search', 'Search templates...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button type="submit" className="px-4 py-2 bg-quest-blue text-white rounded font-semibold">
            🔍
          </button>
        </form>

        <div className="flex gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="p-2 border rounded text-sm"
          >
            <option value="">{t('marketplace.allCategories', 'All Categories')}</option>
            {categories.map(c => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="p-2 border rounded text-sm"
          >
            <option value="rating">{t('marketplace.sortRating', 'Top Rated')}</option>
            <option value="newest">{t('marketplace.sortNewest', 'Newest')}</option>
            <option value="popular">{t('marketplace.sortPopular', 'Most Popular')}</option>
          </select>
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-bounce text-4xl">📋</div>
          <p className="text-gray-500 mt-2">{t('app.loading')}</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-5xl">📭</div>
          <p className="mt-2">{t('marketplace.empty', 'No templates found. Try different filters!')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-white rounded-lg shadow p-4 border hover:border-quest-blue transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{tmpl.name}</h3>
                  {tmpl.description && (
                    <p className="text-sm text-gray-600 mt-1">{tmpl.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {tmpl.category && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {tmpl.category}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {tmpl.task_type}
                    </span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      {tmpl.base_points} pts
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Ages {tmpl.age_tier_min}-{tmpl.age_tier_max}
                    </span>
                    {tmpl.community_ratings_count && tmpl.community_ratings_count > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        ⭐ {getRatingStars(tmpl)} ({tmpl.community_ratings_count})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleFork(tmpl.id)}
                    disabled={forkingId === tmpl.id}
                    className="px-4 py-2 bg-quest-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 transition"
                  >
                    {forkingId === tmpl.id ? '...' : `+ ${t('marketplace.addToMy', 'Add to My Family')}`}
                  </button>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        onClick={() => handleRate(tmpl.id, r)}
                        disabled={ratingId === tmpl.id}
                        className="text-lg hover:scale-125 transition disabled:opacity-50"
                        title={`Rate ${r}`}
                      >
                        {r <= (tmpl.community_ratings_count && tmpl.community_ratings_count > 0
                          ? Math.round((tmpl.community_rating || 0) / tmpl.community_ratings_count)
                          : 0)
                          ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
