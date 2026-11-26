import React, { useState } from 'react';
import { Sparkles, Send, Key, Check, Copy, RefreshCw, AlertCircle, Bot } from 'lucide-react';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantTabProps {
  customApiKey?: string;
  setCustomApiKey: (key: string) => void;
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  customApiKey = '',
  setCustomApiKey,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm K1ngkell AI, your digital assistant for games, SoundCloud music discovery, movies, and study tips. You can ask me anything or provide your own Gemini API key in the panel below!",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [tempKey, setTempKey] = useState(customApiKey);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiKey(tempKey.trim());
    localStorage.setItem('k1ngkell_custom_gemini_key', tempKey.trim());
    setShowKeyConfig(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: AiMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      let replyText = '';
      let usedServer = false;

      try {
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            customApiKey: customApiKey || undefined,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to communicate with AI model.');
          }
          replyText = data.text || 'No response generated.';
          usedServer = true;
        }
      } catch (serverErr: any) {
        if (serverErr?.message && !serverErr.message.includes('Unexpected token')) {
          // Only rethrow genuine JSON API errors, not 404 HTML responses from static hosts
          if (serverErr.message !== 'Failed to fetch') {
            throw serverErr;
          }
        }
      }

      if (!usedServer) {
        if (!customApiKey) {
          throw new Error(
            'Static hosting (GitHub Pages) does not have a backend server. Click "Use Own API Key" above and enter your Gemini API key to chat here.'
          );
        }

        const directRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
            customApiKey
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: text.trim() }] }],
              systemInstruction: {
                parts: [
                  {
                    text: 'You are K1ngkell AI, a friendly, knowledgeable gaming, music, streaming, and creative digital companion.',
                  },
                ],
              },
            }),
          }
        );

        const directData = await directRes.json();
        if (!directRes.ok) {
          throw new Error(directData?.error?.message || 'Gemini API request failed.');
        }
        replyText =
          directData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      }

      const assistantMsg: AiMessage = {
        role: 'assistant',
        content: replyText,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'An error occurred while calling Gemini AI.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const promptSuggestions = [
    'Recommend top unblocked math & puzzle games',
    'Explain winning strategy for 2048',
    'Suggest chill SoundCloud study playlists',
    'Give me mental arithmetic speed tricks',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-6rem)] min-h-[600px] flex flex-col space-y-4">
      {/* Top Banner & Key Toggle */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>K1ngkell AI Companion</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                Gemini 3.8 Flash
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive assistant for gaming strategies, study formulas, and multimedia.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowKeyConfig(!showKeyConfig)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
            customApiKey
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{customApiKey ? 'Custom Key Set' : 'Use Own API Key'}</span>
        </button>
      </div>

      {/* API Key Modal / Dropdown Accordion */}
      {showKeyConfig && (
        <form
          onSubmit={handleSaveKey}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-md space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-500" />
              <span>Custom Google Gemini API Key</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Saved in local secure storage
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            If provided, your private key will be used for AI queries instead of the system default.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Save Key
            </button>
          </div>
        </form>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-end">
                  <button
                    onClick={() => copyToClipboard(msg.content, idx)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 text-xs text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            <span>K1ngkell AI is thinking...</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Prompt Suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {promptSuggestions.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="px-3 py-1.5 text-xs rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask K1ngkell AI about gaming, math, music, or code..."
          className="flex-1 px-4 py-3 rounded-xl text-xs sm:text-sm bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
