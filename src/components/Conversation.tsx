import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Chat } from '../types/chat'
import { formatTime } from './formatTime'

type Props = {
  chat?: Chat
  busy: boolean
  error: string
  connectionError: string
  onSend: (text: string) => Promise<boolean>
}

export function Conversation({ chat, busy, error, connectionError, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const messageEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages.length])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onSend(draft)) setDraft('')
  }

  return <section className="conversation">
    {chat
      ? <>
          <header className="conversation-header">
            <span className="avatar" aria-hidden="true">{chat.phone.slice(-2)}</span>
            <div><strong>+{chat.phone}</strong><small>Личный чат MAX</small></div>
          </header>
          {connectionError && <p className="connection-error error" role="alert">Ошибка получения: {connectionError}</p>}
          <div className="message-list" aria-label="Сообщения">
            {chat.messages.length === 0 && <div className="message-empty">Здесь появятся ваши сообщения</div>}
            {chat.messages.map((message) => <div className={`message ${message.direction}`} key={message.id}>
              <span>{message.text}</span><time>{formatTime(message.time)}</time>
            </div>)}
            <div ref={messageEnd} />
          </div>
          <div className="composer-wrap">
            {error && <p className="error" role="alert">{error}</p>}
            <form className="composer" onSubmit={submit}>
              <input aria-label="Сообщение" placeholder="Написать сообщение" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} />
              <button type="submit" disabled={!draft.trim() || busy}>{busy ? 'Отправка…' : 'Отправить'}</button>
            </form>
          </div>
        </>
      : <div className="welcome"><div className="welcome-icon" aria-hidden="true">✦</div><h2>Выберите или создайте чат</h2><p>Для нового чата введите номер телефона слева.</p>{connectionError && <p className="error" role="alert">Ошибка получения: {connectionError}</p>}</div>}
  </section>
}
