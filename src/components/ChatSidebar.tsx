import { useState, type FormEvent } from 'react'
import type { Chat } from '../types/chat'
import { formatTime } from './formatTime'

type Props = {
  idInstance: string
  chats: Chat[]
  activeChatId: string | null
  busy: boolean
  error: string
  onCreateChat: (phone: string) => Promise<boolean>
  onSelectChat: (chatId: string) => void
  onDisconnect: () => void
}

export function ChatSidebar({ idInstance, chats, activeChatId, busy, error, onCreateChat, onSelectChat, onDisconnect }: Props) {
  const [phoneInput, setPhoneInput] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onCreateChat(phoneInput)) setPhoneInput('')
  }

  return <aside className="sidebar">
    <header className="sidebar-header">
      <div className="brand"><span className="small-brand" aria-hidden="true">M</span><span>Чаты</span></div>
      <button className="text-button" type="button" onClick={onDisconnect}>Отключить</button>
    </header>
    <form className="new-chat" onSubmit={submit}>
      <label htmlFor="phone">Новый чат по номеру</label>
      <div className="new-chat-row">
        <input id="phone" type="tel" placeholder="+7 999 123-45-67" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} />
        <button type="submit" disabled={busy} aria-label="Создать чат">
          {busy ? '…' : <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>}
        </button>
      </div>
    </form>
    {error && !activeChatId && <p className="sidebar-error error" role="alert">{error}</p>}
    <div className="chat-list" aria-label="Список чатов">
      {chats.length === 0
        ? <p className="list-empty">Введите номер, чтобы начать переписку</p>
        : chats.map((chat) => <button
            className={`chat-item ${chat.chatId === activeChatId ? 'active' : ''}`}
            type="button"
            key={chat.chatId}
            onClick={() => onSelectChat(chat.chatId)}
          >
            <span className="avatar" aria-hidden="true">{chat.phone.slice(-2)}</span>
            <span className="chat-item-content"><strong>+{chat.phone}</strong><small>{chat.messages.at(-1)?.text || 'Новый чат'}</small></span>
            {chat.messages.length > 0 && <time>{formatTime(chat.messages.at(-1)!.time)}</time>}
          </button>)}
    </div>
    <footer className="sidebar-footer">Инстанс {idInstance}</footer>
  </aside>
}
