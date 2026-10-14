import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  checkAccount,
  deleteNotification,
  readCredentials,
  readPhoneNumber,
  receiveNotification,
  sendMessage,
  type Credentials,
} from './api'

type Message = {
  id: string
  text: string
  direction: 'incoming' | 'outgoing'
  time: number
}

type Chat = {
  chatId: string
  phone: string
  messages: Message[]
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Произошла неизвестная ошибка'
}

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function App() {
  const [apiUrl, setApiUrl] = useState('')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [draft, setDraft] = useState('')
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [busy, setBusy] = useState<'chat' | 'send' | null>(null)
  const [formError, setFormError] = useState('')
  const [chatError, setChatError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const seenMessageIds = useRef(new Set<string>())
  const sessionId = useRef(0)
  const messageEnd = useRef<HTMLDivElement>(null)

  const activeChat = chats.find((chat) => chat.chatId === activeChatId)

  useEffect(() => {
    if (!credentials) return
    const connectedCredentials = credentials
    const controller = new AbortController()
    const { signal } = controller

    async function poll() {
      while (!signal.aborted) {
        try {
          const notification = await receiveNotification(connectedCredentials, signal)
          if (signal.aborted) break
          setConnectionError('')
          if (!notification) continue

          const { body, receiptId } = notification
          const chatId = body.senderData?.chatId
          const messageId = body.idMessage
          const text = body.messageData?.textMessageData?.textMessage
          if (
            body.typeWebhook === 'incomingMessageReceived' &&
            body.messageData?.typeMessage === 'textMessage' &&
            chatId && messageId && typeof text === 'string' &&
            !seenMessageIds.current.has(messageId)
          ) {
            seenMessageIds.current.add(messageId)
            setChats((current) => current.map((chat) => chat.chatId === chatId
              ? { ...chat, messages: [...chat.messages, {
                  id: messageId,
                  text,
                  direction: 'incoming',
                  time: body.timestamp ? body.timestamp * 1000 : Date.now(),
                }] }
              : chat,
            ))
          }
          await deleteNotification(connectedCredentials, receiptId, signal)
        } catch (error) {
          if (signal.aborted) break
          setConnectionError(errorText(error))
          await wait(3000, signal)
        }
      }
    }

    void poll()
    return () => controller.abort()
  }, [credentials])

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChatId, activeChat?.messages.length])

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      sessionId.current += 1
      setCredentials(readCredentials(apiUrl, idInstance, apiTokenInstance))
      setApiTokenInstance('')
    } catch (error) {
      setFormError(errorText(error))
    }
  }

  function disconnect() {
    sessionId.current += 1
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
    setDraft('')
    setConnectionError('')
    setChatError('')
    setBusy(null)
    seenMessageIds.current.clear()
  }

  async function createChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!credentials || busy) return
    setChatError('')
    let phone: string
    try {
      phone = readPhoneNumber(phoneInput)
    } catch (error) {
      setChatError(errorText(error))
      return
    }
    const existing = chats.find((chat) => chat.phone === phone)
    if (existing) {
      setActiveChatId(existing.chatId)
      setPhoneInput('')
      return
    }
    setBusy('chat')
    const requestSession = sessionId.current
    try {
      const result = await checkAccount(credentials, phone)
      if (requestSession !== sessionId.current) return
      if (result.status === false) throw new Error(result.reason || 'Инстанс не авторизован')
      if (!result.exist || !result.chatId) throw new Error('На этом номере нет аккаунта MAX')
      setChats((current) => [...current, { chatId: result.chatId!, phone, messages: [] }])
      setActiveChatId(result.chatId)
      setPhoneInput('')
    } catch (error) {
      if (requestSession === sessionId.current) setChatError(errorText(error))
    } finally {
      if (requestSession === sessionId.current) setBusy(null)
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!credentials || !activeChatId || busy) return
    const text = draft.trim()
    if (!text) return
    if (text.length > 4000) {
      setChatError('Сообщение не должно превышать 4000 символов')
      return
    }
    setChatError('')
    setBusy('send')
    const requestSession = sessionId.current
    try {
      const result = await sendMessage(credentials, activeChatId, text)
      if (requestSession !== sessionId.current) return
      setChats((current) => current.map((chat) => chat.chatId === activeChatId
        ? { ...chat, messages: [...chat.messages, {
            id: result.idMessage,
            text,
            direction: 'outgoing',
            time: Date.now(),
          }] }
        : chat,
      ))
      setDraft('')
    } catch (error) {
      if (requestSession === sessionId.current) setChatError(errorText(error))
    } finally {
      if (requestSession === sessionId.current) setBusy(null)
    }
  }

  if (!credentials) {
    return <main className="connect-layout">
      <section className="connect-card">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div className="eyebrow">GREEN-API × MAX</div>
        <h1>Чат для MAX</h1>
        <p className="intro">Подключите свой инстанс GREEN-API, чтобы отправлять и получать текстовые сообщения.</p>
        <form onSubmit={connect} className="connect-form">
          <label>Адрес API <input type="url" required placeholder="https://..." value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} /></label>
          <label>idInstance <input inputMode="numeric" required placeholder="Например, 3100000000" value={idInstance} onChange={(event) => setIdInstance(event.target.value)} /></label>
          <label>apiTokenInstance <input type="password" required autoComplete="off" placeholder="Токен инстанса" value={apiTokenInstance} onChange={(event) => setApiTokenInstance(event.target.value)} /></label>
          {formError && <p className="error" role="alert">{formError}</p>}
          <button className="primary-button" type="submit">Открыть чат</button>
        </form>
        <p className="hint">Данные находятся в <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">кабинете GREEN-API</a>. Токен остается только в памяти этой вкладки.</p>
      </section>
    </main>
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="brand"><span className="small-brand" aria-hidden="true">M</span><span>Чаты</span></div>
        <button className="text-button" type="button" onClick={disconnect}>Отключить</button>
      </header>
      <form className="new-chat" onSubmit={createChat}>
        <label htmlFor="phone">Новый чат по номеру</label>
        <div className="new-chat-row">
          <input id="phone" type="tel" placeholder="+7 999 123-45-67" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} />
          <button type="submit" disabled={busy === 'chat'} aria-label="Создать чат">{busy === 'chat' ? '…' : '+'}</button>
        </div>
      </form>
      {chatError && !activeChat && <p className="sidebar-error error" role="alert">{chatError}</p>}
      <div className="chat-list" aria-label="Список чатов">
        {chats.length === 0
          ? <p className="list-empty">Введите номер, чтобы начать переписку</p>
          : chats.map((chat) => <button
              className={`chat-item ${chat.chatId === activeChatId ? 'active' : ''}`}
              type="button"
              key={chat.chatId}
              onClick={() => { setActiveChatId(chat.chatId); setChatError('') }}
            >
              <span className="avatar" aria-hidden="true">{chat.phone.slice(-2)}</span>
              <span className="chat-item-content"><strong>+{chat.phone}</strong><small>{chat.messages.at(-1)?.text || 'Новый чат'}</small></span>
              {chat.messages.length > 0 && <time>{timeLabel(chat.messages.at(-1)!.time)}</time>}
            </button>)}
      </div>
      <footer className="sidebar-footer">Инстанс {credentials.idInstance}</footer>
    </aside>

    <section className="conversation">
      {activeChat
        ? <>
            <header className="conversation-header">
              <span className="avatar" aria-hidden="true">{activeChat.phone.slice(-2)}</span>
              <div><strong>+{activeChat.phone}</strong><small>Личный чат MAX</small></div>
            </header>
            {connectionError && <p className="connection-error error" role="alert">Ошибка получения: {connectionError}</p>}
            <div className="message-list" aria-label="Сообщения">
              {activeChat.messages.length === 0 && <div className="message-empty">Здесь появятся ваши сообщения</div>}
              {activeChat.messages.map((message) => <div className={`message ${message.direction}`} key={message.id}>
                <span>{message.text}</span><time>{timeLabel(message.time)}</time>
              </div>)}
              <div ref={messageEnd} />
            </div>
            <div className="composer-wrap">
              {chatError && <p className="error" role="alert">{chatError}</p>}
              <form className="composer" onSubmit={send}>
                <input aria-label="Сообщение" placeholder="Написать сообщение" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} />
                <button type="submit" disabled={!draft.trim() || busy === 'send'}>{busy === 'send' ? 'Отправка…' : 'Отправить'}</button>
              </form>
            </div>
          </>
        : <div className="welcome"><div className="welcome-icon" aria-hidden="true">✦</div><h2>Выберите или создайте чат</h2><p>Для нового чата введите номер телефона слева.</p>{connectionError && <p className="error" role="alert">Ошибка получения: {connectionError}</p>}</div>}
    </section>
  </main>
}

export default App
