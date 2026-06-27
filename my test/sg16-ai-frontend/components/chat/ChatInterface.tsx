'use client';

import { useState, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    const userMsg = input;
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat({ message: userMsg, chat_id: chatId });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.response },
      ]);
      if (res.chat_id) setChatId(res.chat_id);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, SG16 is having trouble right now.' },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-sg16-card/30 rounded-3xl border border-sg16-green/10">
        {messages.length === 0 && (
          <div className="text-center mt-20">
            <Bot className="w-20 h-20 mx-auto text-sg16-green mb-4 drop-shadow-[0_0_15px_rgba(0,255,136,0.6)]" />
            <h2 className="text-4xl font-black gradient-text mb-3">Welcome to SG16 AI</h2>
            <p className="text-sg16-cyan text-lg font-semibold">The Most Powerful AI Engine</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-5 py-3 rounded-3xl font-medium ${
                msg.role === 'user'
                  ? 'bg-sg16-green text-black glow-green'
                  : 'bg-sg16-card border-2 border-sg16-green/30 text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-sg16-green font-semibold animate-pulse">
            SG16 is thinking...
          </div>
        )}
      </div>
      <div className="p-6 border-t border-sg16-green/10 bg-sg16-card/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask SG16 anything..."
            className="flex-1 bg-sg16-card border-2 border-sg16-green/30 rounded-2xl px-5 py-3 focus:outline-none focus:border-sg16-green focus:glow-green text-white placeholder-zinc-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-sg16-green hover:bg-sg16-green-glow px-8 py-3 rounded-2xl flex items-center gap-2 font-bold text-black transition glow-green disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
