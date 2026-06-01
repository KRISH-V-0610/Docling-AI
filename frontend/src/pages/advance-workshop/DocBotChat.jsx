// Left panel — DocBot chat (presentational; all state lives in the parent).
import { Bot, RotateCcw, ChevronRight, Loader2, Send } from 'lucide-react';

export function DocBotChat({
  chatHistory, isSending, chatInput, setChatInput,
  selectedFile, chatScrollRef, onClearChat, onSendMessage,
}) {
  return (
    <div className="w-[320px] shrink-0 flex flex-col border-r border-[var(--color-surface-200)] bg-white min-h-0">
      {/* Chat Header */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shrink-0">
        <h3 className="text-[11px] font-medium opacity-90 flex items-center gap-2 tracking-wide uppercase">
          <Bot className="w-4 h-4" /> DocBot AI Assistant
        </h3>
        <button
          onClick={onClearChat}
          className="text-[10px] font-medium flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          title="Clear chat"
        >
          <RotateCcw className="w-3 h-3" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 bg-gradient-to-b from-[var(--color-surface-50)] to-white min-h-0">
        {chatHistory.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex gap-2.5 max-w-[95%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 shadow-sm ${isUser
                ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
                : 'bg-slate-100 text-slate-600'
                }`}>
                {isUser ? <ChevronRight className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              {/* Bubble */}
              <div className="flex flex-col">
                <div className={`px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${isUser
                  ? 'bg-[var(--color-primary-600)] text-white rounded-2xl rounded-tr-md'
                  : 'bg-white border border-[var(--color-surface-200)] text-[var(--color-text-main)] rounded-2xl rounded-tl-md'
                  }`}>
                  {msg.textHtml
                    ? <div dangerouslySetInnerHTML={{ __html: msg.textHtml }} />
                    : msg.text}
                </div>
                <span className={`text-[10px] text-[var(--color-text-muted)] mt-1 ${isUser ? 'text-right' : ''} px-1`}>{msg.time}</span>
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex gap-2.5 self-start max-w-[95%]">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 mt-0.5 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 bg-white border border-[var(--color-surface-200)] rounded-2xl rounded-tl-md shadow-sm flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-[var(--color-surface-200)] shrink-0">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
            placeholder={selectedFile ? `Edit ${selectedFile}…` : 'Select a file first…'}
            disabled={!selectedFile || isSending}
            className="flex-1 px-4 py-2 text-[13px] bg-[var(--color-surface-50)] border border-[var(--color-surface-200)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] focus:border-[var(--color-primary-400)] transition-all disabled:opacity-50"
          />
          <button
            onClick={onSendMessage}
            disabled={!chatInput.trim() || !selectedFile || isSending}
            className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-sm"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
