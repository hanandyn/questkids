import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import * as audio from '../../lib/audio';
import type { Reward } from '../../lib/types';

interface RewardRequestData {
  id: number;
  name: string;
  description?: string;
  suggested_cost_stars: number;
  category?: string;
  status: string;
  created_at?: string;
}

/**
 * Reward Shop — kids browse and redeem rewards set by parents.
 * Also includes "Request a Reward" feature.
 */
export function RewardShop({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequestData[]>([]);
  const [redemptions, setRedemptions] = useState<Record<number, string>>({});
  const [showRequest, setShowRequest] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);
  const [view, setView] = useState<'shop' | 'mine'>('shop');

  // Request form
  const [reqName, setReqName] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqStars, setReqStars] = useState(100);
  const [reqCategory, setReqCategory] = useState('privileges');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [rews, reqs, reds] = await Promise.all([
        api.getRewards() as unknown as Reward[],
        api.getRewardRequests() as unknown as RewardRequestData[],
        api.getRedemptions() as unknown as { id: number; status: string; reward_id: number }[],
      ]);
      setRewards(rews);
      setRequests(reqs);
      const redMap: Record<number, string> = {};
      for (const r of reds) redMap[r.reward_id] = r.status;
      setRedemptions(redMap);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleRedeem = async (reward: Reward) => {
    try {
      await api.redeemReward(reward.id);
      audio.playTaskComplete();
      showToast(`🎉 ${reward.name} redeemed!`);
      setConfirmReward(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error');
      setConfirmReward(null);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqName.trim()) return;
    try {
      await api.createRewardRequest({
        name: reqName,
        description: reqDesc || undefined,
        suggested_cost_stars: reqStars,
        category: reqCategory,
      });
      showToast('✅ Request sent to parents!');
      setShowRequest(false);
      setReqName(''); setReqDesc(''); setReqStars(100);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error');
    }
  };

  const canAfford = (r: Reward) => (user?.stars ?? 0) >= r.cost_stars && (user?.gems ?? 0) >= r.cost_gems;

  const categoryEmoji: Record<string, string> = {
    digital_fun: '🎮',
    food: '🍕',
    privileges: '👑',
    experiences: '🎪',
    toys: '🧸',
    screen_time: '📱',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-purple-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
            )}
            <h1 className="text-xl font-bold text-gray-800">🎁 Reward Shop</h1>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="text-yellow-600">{user?.stars ?? 0} ⭐</span>
            <span className="text-cyan-600">{user?.gems ?? 0} 💎</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setView('shop')}
            className={`px-4 py-2 text-sm font-medium relative ${view === 'shop' ? 'text-purple-600' : 'text-gray-400'}`}
          >
            🛍️ Shop
            {view === 'shop' && <motion.div layoutId="shop-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />}
          </button>
          <button
            onClick={() => setView('mine')}
            className={`px-4 py-2 text-sm font-medium relative ${view === 'mine' ? 'text-purple-600' : 'text-gray-400'}`}
          >
            📋 My Requests
            {view === 'mine' && <motion.div layoutId="shop-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-2.5 rounded-xl bg-green-100 border border-green-300 text-green-700 text-sm text-center font-medium"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'shop' ? (
          <>
            {/* Reward grid */}
            {rewards.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🎁</div>
                <p className="text-gray-500 font-medium">No rewards yet!</p>
                <p className="text-gray-400 text-sm mt-1">Tap "Request a Reward" to ask your parents for treats!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rewards.map(reward => {
                  const affordable = canAfford(reward);
                  const redeemed = redemptions[reward.id];
                  const emoji = categoryEmoji[reward.category || ''] || '🎁';
                  return (
                    <motion.div
                      key={reward.id}
                      layout
                      whileTap={{ scale: 0.97 }}
                      className={`relative rounded-2xl p-4 border-2 transition-colors ${
                        affordable ? 'bg-white border-purple-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                    >
                      {/* Category badge */}
                      <div className="text-3xl mb-2">{emoji}</div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1">{reward.name}</h3>
                      {reward.description && (
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{reward.description}</p>
                      )}
                      {/* Cost */}
                      <div className="flex items-center gap-2 mb-3">
                        {reward.cost_stars > 0 && (
                          <span className={`text-sm font-bold ${affordable ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {reward.cost_stars} ⭐
                          </span>
                        )}
                        {reward.cost_gems > 0 && (
                          <span className={`text-sm font-bold ${affordable ? 'text-cyan-600' : 'text-gray-400'}`}>
                            {reward.cost_gems} 💎
                          </span>
                        )}
                        {reward.cost_stars === 0 && reward.cost_gems === 0 && (
                          <span className="text-sm font-bold text-green-500">FREE</span>
                        )}
                      </div>
                      {/* Action */}
                      {redeemed === 'fulfilled' ? (
                        <div className="text-xs text-green-500 font-medium text-center py-2">✓ Enjoyed!</div>
                      ) : redeemed === 'pending' ? (
                        <div className="text-xs text-amber-500 font-medium text-center py-2">⏳ Waiting for approval…</div>
                      ) : redeemed === 'approved' ? (
                        <div className="text-xs text-blue-500 font-medium text-center py-2">✅ Approved! Ask parent for it.</div>
                      ) : (
                        <button
                          onClick={() => affordable ? setConfirmReward(reward) : showToast('Not enough ⭐ or 💎')}
                          disabled={!affordable}
                          className={`w-full py-2 rounded-xl text-sm font-bold transition-colors ${
                            affordable
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {affordable ? 'Redeem!' : 'Need more ⭐'}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Request a reward button */}
            <button
              onClick={() => setShowRequest(true)}
              className="w-full mt-5 py-3 rounded-2xl bg-white border-2 border-dashed border-purple-300 text-purple-500 font-medium text-sm hover:bg-purple-50 transition-colors"
            >
              💡 Request a Reward
            </button>
          </>
        ) : (
          /* My Requests view */
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">💌</div>
                <p className="text-gray-400">No requests yet.</p>
                <button onClick={() => { setView('shop'); setShowRequest(true); }} className="text-purple-500 text-sm font-medium mt-2">
                  Request your first reward →
                </button>
              </div>
            ) : (
              requests.map(req => (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border-2 ${
                    req.status === 'approved' ? 'bg-green-50 border-green-200' :
                    req.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    'bg-white border-purple-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{req.name}</h3>
                      {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">Suggested: {req.suggested_cost_stars} ⭐</span>
                        {req.category && <span className="text-xs text-gray-400">· {req.category}</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      req.status === 'approved' ? 'bg-green-200 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-200 text-red-700' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {req.status === 'approved' ? '✅ Approved' : req.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                  {req.created_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Confirm redemption modal */}
      {confirmReward && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setConfirmReward(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center"
          >
            <div className="text-5xl mb-3">{categoryEmoji[confirmReward.category || ''] || '🎁'}</div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Redeem {confirmReward.name}?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will cost {confirmReward.cost_stars > 0 && `${confirmReward.cost_stars} ⭐`}
              {confirmReward.cost_stars > 0 && confirmReward.cost_gems > 0 && ' + '}
              {confirmReward.cost_gems > 0 && `${confirmReward.cost_gems} 💎`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleRedeem(confirmReward)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm">
                Yes, Redeem! 🎉
              </button>
              <button onClick={() => setConfirmReward(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm">
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Request a reward modal */}
      {showRequest && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowRequest(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-md w-full my-8"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">💡 Request a Reward</h3>
            <p className="text-sm text-gray-500 mb-4">Tell your parents what reward you'd like. They'll decide if to add it and how much it costs.</p>
            <form onSubmit={handleSubmitRequest} className="space-y-3">
              <input
                type="text"
                value={reqName}
                onChange={e => setReqName(e.target.value)}
                placeholder="Reward name (e.g. 30 min Minecraft)"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm"
                required
              />
              <textarea
                value={reqDesc}
                onChange={e => setReqDesc(e.target.value)}
                placeholder="Description (optional)…"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm resize-none"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Suggested cost (⭐)</label>
                  <input
                    type="number"
                    value={reqStars}
                    onChange={e => setReqStars(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select
                    value={reqCategory}
                    onChange={e => setReqCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
                  >
                    <option value="privileges">👑 Privileges</option>
                    <option value="digital_fun">🎮 Digital Fun</option>
                    <option value="food">🍕 Food</option>
                    <option value="experiences">🎪 Experiences</option>
                    <option value="toys">🧸 Toys</option>
                    <option value="screen_time">📱 Screen Time</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm">
                  Send Request 💌
                </button>
                <button type="button" onClick={() => setShowRequest(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
