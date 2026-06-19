import { useState, useEffect, useCallback } from "react";
/**
 * FulfillmentQueue.tsx — Parent's pending reward fulfillment tracker.
 * Phase 8: Reward Fulfillment Tracking.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { Redemption } from '../../lib/types';

export function FulfillmentQueue() {
  const [pending, setPending] = useState<Redemption[]>([]);
  const [actionId, setActionId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.getPendingRedemptions() as unknown as Redemption[];
      setPending(data);
    } catch {
      setPending([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFulfill = async (id: number) => {
    setActionId(id);
    try {
      await api.fulfillRedemption(id, notes[id] || undefined);
      setPending(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Fulfill failed:', e);
    }
    setActionId(null);
  };

  if (pending.length === 0) return null;

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-amber-200">
      <h3 className="text-lg font-semibold mb-3">🎁 Pending Fulfillments ({pending.length})</h3>
      <p className="text-sm text-gray-500 mb-3">
        These rewards have been redeemed and need to be delivered!
      </p>

      <AnimatePresence>
        <div className="space-y-3">
          {pending.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 100 }}
              className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{r.reward?.name || `Reward #${r.reward_id}`}</p>
                  <p className="text-sm text-gray-500">
                    Status: <span className="font-medium">{r.status}</span>
                  </p>
                  {r.redeemed_at && (
                    <p className="text-xs text-gray-400">
                      Redeemed {new Date(r.redeemed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-2xl">🎁</span>
              </div>
              <input
                type="text"
                placeholder="Add a note (optional)..."
                value={notes[r.id] || ''}
                onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                className="mt-2 w-full px-2 py-1 text-sm border rounded"
              />
              <button
                onClick={() => handleFulfill(r.id)}
                disabled={actionId === r.id}
                className="mt-2 w-full py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {actionId === r.id ? 'Marking...' : '✅ Mark as Delivered'}
              </button>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
