import type { Credentials } from '../types/greenApi'

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
