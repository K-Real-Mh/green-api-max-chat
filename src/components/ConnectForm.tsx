import { useState, type FormEvent } from 'react'
import { readCredentials } from '../api/validation'
import type { Credentials } from '../types/greenApi'

type Props = { onConnect: (credentials: Credentials) => void }

export function ConnectForm({ onConnect }: Props) {
  const [apiUrl, setApiUrl] = useState('')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      onConnect(readCredentials(apiUrl, idInstance, apiTokenInstance))
      setApiTokenInstance('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось прочитать данные инстанса')
    }
  }

  return <main className="connect-layout">
    <section className="connect-card">
      <div className="brand-mark" aria-hidden="true">M</div>
      <div className="eyebrow">GREEN-API × MAX</div>
      <h1>Чат для MAX</h1>
      <p className="intro">Подключите свой инстанс GREEN-API, чтобы отправлять и получать текстовые сообщения.</p>
      <form onSubmit={submit} className="connect-form">
        <label>Адрес API <input type="url" required placeholder="https://..." value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} /></label>
        <label>idInstance <input inputMode="numeric" required placeholder="Например, 3100000000" value={idInstance} onChange={(event) => setIdInstance(event.target.value)} /></label>
        <label>apiTokenInstance <input type="password" required autoComplete="off" placeholder="Токен инстанса" value={apiTokenInstance} onChange={(event) => setApiTokenInstance(event.target.value)} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary-button" type="submit">Открыть чат</button>
      </form>
      <p className="hint">Данные находятся в <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">кабинете GREEN-API</a>. Токен остается только в памяти этой вкладки.</p>
    </section>
  </main>
}
