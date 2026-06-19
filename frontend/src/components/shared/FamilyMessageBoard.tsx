/**
 * FamilyMessageBoard.tsx — Family communication feed on dashboards.
 * Phase 8: Family Communication System.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { FamilyMessage } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

export function FamilyMessageBoard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getFamilyMessages(30) as unknown as FamilyMessage[];
      setMessages(data);
    } catch { /* no messages yet */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getFamilyMessages(30) as unknown as FamilyMessage[];
        setMessages(data);
      } catch { /* no messages yet */ }
    })();
    const interval = setInterval(() => { loadMessages(); }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const msgType = user?.role === 'parent' ? 'announcement' : 'cheer';
      await api.sendFamilyMessage({ message: newMessage.trim(), type: msgType });
      setNewMessage('');
      await loadMessages();
    } catch (e) {
      console.error('Send failed:', e);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typeEmoji: Record<string, string> = {
    announcement: '📢',
    cheer: '🎉',
    reminder: '⏰',
    system: '🤖',
  };

  const typeColor: Record<string, string> = {
    announcement: 'bg-amber-50 border-amber-200',
    cheer: 'bg-green-50 border-green-200',
    reminder: 'bg-blue-50 border-blue-200',
    system: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-3">💬 Family Board</h3>

      <AnimatePresence>
        <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No messages yet. Say hello! 👋</p>
          )}
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-2 rounded-lg border text-sm ${typeColor[msg.type] || 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span>{typeEmoji[msg.type] || '💬'}</span>
                <span className="font-medium text-xs text-gray-600">{msg.sender_name || 'System'}</span>
                {msg.pinned && <span className="text-xs text-amber-500">📌</span>}
                <span className="text-xs text-gray-400 ml-auto">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p className="text-gray-700">{msg.message}</p>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={user?.role === 'parent' ? 'Post an announcement... 📢' : 'Send a cheer... 🎉'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
