import type { Credentials, Notification } from '../types/greenApi'

function endpoint(credentials: Credentials, method: string): string {
  const base = new URL(credentials.apiUrl)
  return `${base.origin}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`
}

async function request<T>(url: string, init?: RequestInit, emptyValue?: T): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Не удалось связаться с GREEN-API. Проверьте сеть и адрес API.')
  }

  if (!response.ok) {
    const details = await response.json().catch(() => null) as { message?: string; reason?: string } | null
    throw new Error(details?.message || details?.reason || `GREEN-API вернул ошибку ${response.status}`)
  }
  const body = await response.text()
  if (!body.trim()) {
    if (emptyValue !== undefined) return emptyValue
    throw new Error('GREEN-API вернул пустой ответ')
  }
  return JSON.parse(body) as T
}

export async function checkAccount(credentials: Credentials, phoneNumber: string) {
  return request<{ exist?: boolean; chatId?: string; status?: boolean; reason?: string }>(
    endpoint(credentials, 'checkAccount'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
    },
  )
}

export async function sendMessage(credentials: Credentials, chatId: string, message: string) {
  return request<{ idMessage: string }>(endpoint(credentials, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })
}

export async function receiveNotification(credentials: Credentials, signal: AbortSignal) {
  const url = `${endpoint(credentials, 'receiveNotification')}?receiveTimeout=5`
  return request<Notification | null>(url, { signal }, null)
}

export async function deleteNotification(credentials: Credentials, receiptId: number, signal: AbortSignal) {
  const result = await request<{ result: boolean; reason?: string }>(
    `${endpoint(credentials, 'deleteNotification')}/${receiptId}`,
    { method: 'DELETE', signal },
  )
  if (!result.result) throw new Error(result.reason || 'Не удалось подтвердить уведомление')
}
