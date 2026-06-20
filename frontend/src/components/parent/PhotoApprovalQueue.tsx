import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import * as audio from '../../lib/audio';

interface PendingApproval {
  id: number;
  template_name: string;
  child_name: string;
  child_id: number;
  photo_url: string | null;
  completed_at: string | null;
  status: string;
}

/**
 * Parent Photo Approval Queue
 *
 * Shows tasks with photos awaiting parent approval.
 * Parent can approve (confirm points) or reject (request retry with notes).
 */
export function PhotoApprovalQueue() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [toast, setToast] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const data = await api.getPendingApprovals() as unknown as PendingApproval[];
      setApprovals(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleApprove = async (id: number) => {
    try {
      await api.approveTask(id, true);
      audio.playTaskComplete();
      showToast('✓ Task approved — points confirmed');
      loadData();
    } catch {
      showToast('Error approving task');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.approveTask(id, false, rejectNotes || 'Please try again');
      showToast('↩️ Sent back for retry');
      setRejectingId(null);
      setRejectNotes('');
      loadData();
    } catch {
      showToast('Error rejecting task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-4xl animate-bounce">📸</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📸 Photo Approvals
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {approvals.length} task{approvals.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-white shadow-sm text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 rounded-xl bg-green-100 border border-green-300 text-green-700 text-center font-medium"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {approvals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-1">All caught up!</h2>
            <p className="text-gray-400">No photos pending approval.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {approvals.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Photo thumbnail */}
                  <div className="sm:w-32 h-32 sm:h-auto flex-shrink-0 bg-gray-100 flex items-center justify-center cursor-pointer"
                    onClick={() => item.photo_url && setPreviewPhoto(item.photo_url)}
                  >
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.template_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl text-gray-300">📷</span>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.template_name}</h3>
                        <p className="text-sm text-gray-500">
                          {item.child_name}
                          {item.completed_at && (
                            <span className="text-gray-400">
                              {' · '}
                              {new Date(item.completed_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Pending
                      </span>
                    </div>

                    {/* Action buttons */}
                    {rejectingId === item.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          placeholder="Notes for retry (optional)…"
                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 text-sm resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(item.id)}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                          >
                            Send back for retry
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(item.id)}
                          className="px-5 py-2 rounded-lg bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200 transition-colors"
                        >
                          ↩ Request retry
                        </button>
                        {item.photo_url && (
                          <button
                            onClick={() => setPreviewPhoto(item.photo_url)}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            🔍 View
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen photo preview modal */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewPhoto(null)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={previewPhoto}
              alt="Task photo"
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 text-white text-2xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
