export type Credentials = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type Notification = {
  receiptId: number
  body: {
    typeWebhook?: string
    idMessage?: string
    timestamp?: number
    senderData?: { chatId?: string }
    messageData?: {
      typeMessage?: string
      textMessageData?: { textMessage?: string }
    }
  }
}

function endpoint(credentials: Credentials, method: string): string {
  const base = new URL(credentials.apiUrl)
  return `${base.origin}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
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
  return response.json() as Promise<T>
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
  return request<Notification | null>(url, { signal })
}

export async function deleteNotification(credentials: Credentials, receiptId: number, signal: AbortSignal) {
  const result = await request<{ result: boolean; reason?: string }>(
    `${endpoint(credentials, 'deleteNotification')}/${receiptId}`,
    { method: 'DELETE', signal },
  )
  if (!result.result) throw new Error(result.reason || 'Не удалось подтвердить уведомление')
}

export function readCredentials(apiUrl: string, idInstance: string, apiTokenInstance: string): Credentials {
  let url: URL
  try {
    url = new URL(apiUrl.trim())
  } catch {
    throw new Error('Введите полный адрес API, начиная с https://')
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Адрес API должен быть обычным HTTPS-адресом из кабинета GREEN-API')
  }
  if (url.hostname !== 'green-api.com' && !url.hostname.endsWith('.green-api.com')) {
    throw new Error('Адрес API должен принадлежать GREEN-API')
  }
  if (!/^\d+$/.test(idInstance.trim())) throw new Error('idInstance должен содержать только цифры')
  if (!apiTokenInstance.trim()) throw new Error('Введите apiTokenInstance')
  return { apiUrl: url.origin, idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() }
}

export function readPhoneNumber(value: string): string {
  const phone = value.trim().replace(/[\s()+-]/g, '')
  if (!/^(7\d{10}|375\d{9})$/.test(phone)) {
    throw new Error('Введите номер РФ или Беларуси в международном формате')
  }
  return phone
}
