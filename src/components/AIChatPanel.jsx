import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sendMessage, executeToolCall } from '../services/aiService';

const QUICK_COMMANDS = [
  { label: 'Analiz Et', prompt: 'Bu hisseyi teknik olarak analiz et. Destek/direnç seviyelerini belirle.' },
  { label: 'İndikatör Öner', prompt: 'Bu hisse için hangi indikatörlerin açık olması gerekir?' },
  { label: 'Haber Getir', prompt: 'Bu hisse hakkındaki son haberleri getir.' },
  { label: 'Trend Analizi', prompt: 'Mevcut trend yönünü ve gücünü değerlendir.' },
];

export default function AIChatPanel({
  isOpen,
  onClose,
  aiConfig,
  appContext,
  appActions,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;

    const userMsg = { role: 'user', content: userMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(aiConfig, newMessages, appContext);

      // Tool çağrılarını çalıştır
      let toolResults = '';
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const tc of response.toolCalls) {
          const result = executeToolCall(tc, appActions);
          toolResults += result + '\n';
        }
      }

      const assistantContent = (response.content || '') + (toolResults ? '\n\n' + toolResults : '');
      setMessages([...newMessages, { role: 'assistant', content: assistantContent || 'İşlem tamamlandı.' }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `❌ Hata: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-wallstreet-card border-l border-wallstreet-border z-[90] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-wallstreet-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-wallstreet-green" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-wallstreet-green rounded-full animate-pulse" />
          </div>
          <h2 className="font-semibold text-white">AI Asistan</h2>
          <span className="text-[10px] px-1.5 py-0.5 bg-wallstreet-dark rounded text-wallstreet-muted border border-wallstreet-border">
            {aiConfig.provider?.toUpperCase()}
          </span>
        </div>
        <button onClick={onClose} className="text-wallstreet-muted hover:text-wallstreet-red transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-wallstreet-border mb-4" />
            <p className="text-wallstreet-muted text-sm mb-4">
              Merhaba! Ben finans asistanınım.<br />
              Hisse analizi, indikatör önerileri ve daha fazlası için buradayım.
            </p>
            {!aiConfig.isConfigured && (
              <p className="text-wallstreet-red text-xs bg-wallstreet-red/10 px-3 py-2 rounded-lg">
                ⚠️ AI kullanmak için Ayarlar'dan API anahtarı girin.
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-wallstreet-green/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-wallstreet-green" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-wallstreet-green/15 text-white'
                : 'bg-wallstreet-dark text-wallstreet-text border border-wallstreet-border'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:text-wallstreet-green [&_code]:bg-wallstreet-card [&_code]:px-1 [&_code]:rounded [&_strong]:text-white">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-wallstreet-dark flex items-center justify-center shrink-0 mt-0.5 border border-wallstreet-border">
                <User className="w-4 h-4 text-wallstreet-muted" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-wallstreet-green/15 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-wallstreet-green" />
            </div>
            <div className="bg-wallstreet-dark text-wallstreet-muted rounded-xl px-4 py-3 text-sm border border-wallstreet-border flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Düşünüyor...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      {messages.length === 0 && aiConfig.isConfigured && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => handleSend(cmd.prompt)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-wallstreet-dark border border-wallstreet-border text-wallstreet-muted hover:text-wallstreet-green hover:border-wallstreet-green/30 transition-all"
            >
              <Zap className="w-3 h-3" />
              {cmd.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-wallstreet-border shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={aiConfig.isConfigured ? 'Mesaj yazın...' : 'API anahtarı gerekli'}
            disabled={!aiConfig.isConfigured || loading}
            className="w-full bg-wallstreet-dark border border-wallstreet-border rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-wallstreet-muted focus:outline-none focus:border-wallstreet-green/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || !aiConfig.isConfigured || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-wallstreet-muted hover:text-wallstreet-green disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
