'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { aiApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function AIAssistantWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am MedShare AI Assistant. I can guide you on creating emergency blood requests, donor eligibility rules, medicine safety checks, or finding verified pharmacies. How can I help you today?',
    },
  ]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    'How to request emergency blood',
    'Donor eligibility criteria',
    'Medicine redistribution rules',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiApi.chatAssistant(newMessages, user?.role || 'GUEST');
      if (res.data?.data) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: res.data.data.response },
        ]);
        if (res.data.data.suggestedActions) {
          setSuggestedActions(res.data.data.suggestedActions);
        }
      }
    } catch (err) {
      // Local fallback in case network drops
      let fallbackText = "I'm here to help! For emergency blood requests, tap 'Emergency Blood Request' on the top bar. To donate, update your profile in the Donor Dashboard. For medicine assistance, view our verified inventory with doctor prescription upload.";
      if (textToSend.toLowerCase().includes('blood')) {
        fallbackText = "Emergency Blood Requests can be created with patient details, blood group, hospital location, and required date. Compatible donors within 5 km receive instant real-time alerts.";
      }
      setMessages([
        ...newMessages,
        { role: 'assistant', content: fallbackText },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all text-sm font-semibold"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-blue-600" />
          </div>
          <span>MedShare AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">MedShare AI Platform Assistant</h3>
                <p className="text-[10px] text-blue-100">Guidance & Platform Rules • Non-Diagnostic</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Safety Notice */}
          <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200/80 flex items-center gap-1.5 text-[10px] text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Informational only. Cannot diagnose illnesses or prescribe medication.</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          {suggestedActions.length > 0 && (
            <div className="p-2 bg-slate-100/60 border-t border-slate-200 flex flex-wrap gap-1.5">
              {suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action)}
                  className="text-[11px] bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 rounded-full px-2.5 py-1 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about blood donation or medicines..."
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
