import { FormEvent, useState } from 'react';
import { Minus, RotateCcw, Send, Trash2, WifiOff, X } from 'lucide-react';
import { useRobo } from './RoboProvider';
import { RoboCharacter } from './RoboCharacter';
import { cn } from '@/utils/cn';

export function RoboChatPanel() {
  const robo = useRobo();
  const [draft, setDraft] = useState('');

  if (!robo.chatOpen) return null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void robo.send(draft);
    setDraft('');
  };

  return (
    <section
      className="robo-chat card"
      role="dialog"
      aria-label="Robo AI Assistant"
      style={{ borderColor: 'var(--dhara-glass-border)' }}
    >
      <header
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--dhara-border)' }}
      >
        <RoboCharacter state={robo.state} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold">ROBO AI ASSISTANT</p>
          <p className="text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
            {robo.online ? 'Online' : 'Offline'}
          </p>
        </div>
        <button type="button" className="btn-secondary h-9 w-9 px-0" aria-label="Minimize Robo" onClick={robo.minimize}>
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" className="btn-secondary h-9 w-9 px-0" aria-label="Close Robo chat" onClick={robo.closeChat}>
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {robo.messages.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--dhara-text-secondary)' }}>
            Gujarati, Hindi, અથવા English માં પૂછો.
          </p>
        )}
        {robo.messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn('rounded-xl px-3 py-2 text-sm', message.role === 'user' ? 'ml-8' : 'mr-8')}
            style={{
              background:
                message.role === 'user'
                  ? 'color-mix(in srgb, var(--dhara-accent) 16%, transparent)'
                  : 'var(--dhara-surface-hover)',
            }}
          >
            {message.content}
          </div>
        ))}
        {robo.loading && (
          <p className="text-sm" style={{ color: 'var(--dhara-accent)' }}>
            Robo is thinking…
          </p>
        )}
        {robo.error && (
          <p className="text-sm" style={{ color: 'var(--dhara-danger)' }}>
            {robo.error}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t px-3 py-3" style={{ borderColor: 'var(--dhara-border)' }}>
        <input
          className="input-field"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask Robo…"
          aria-label="Message Robo"
          disabled={robo.loading}
        />
        <button type="submit" className="btn-primary h-11 w-11 px-0" aria-label="Send" disabled={robo.loading}>
          <Send className="h-4 w-4" />
        </button>
        <button type="button" className="btn-secondary h-11 w-11 px-0" aria-label="Retry last message" onClick={() => void robo.retry()}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" className="btn-secondary h-11 w-11 px-0" aria-label="Clear conversation" onClick={robo.clear}>
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
      {!robo.online && (
        <p className="flex items-center gap-2 px-4 pb-3 text-sm" style={{ color: 'var(--dhara-warning)' }}>
          <WifiOff className="h-4 w-4" />
          Offline
        </p>
      )}
    </section>
  );
}
