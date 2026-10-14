import { useRef, useState } from 'react'
import { checkAccount, sendMessage } from '../api/client'
import { readPhoneNumber } from '../api/validation'
import type { Chat } from '../types/chat'
import type { Credentials } from '../types/greenApi'
import { useNotifications } from './useNotifications'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Произошла неизвестная ошибка'
}

export function useChat() {
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [busy, setBusy] = useState<'chat' | 'send' | null>(null)
  const [chatError, setChatError] = useState('')
  const sessionId = useRef(0)
  const connectionError = useNotifications(credentials, setChats)
  const activeChat = chats.find((chat) => chat.chatId === activeChatId)

  function connect(nextCredentials: Credentials) {
    sessionId.current += 1
    setCredentials(nextCredentials)
  }

  function disconnect() {
    sessionId.current += 1
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
    setChatError('')
    setBusy(null)
  }

  async function createChat(input: string): Promise<boolean> {
    if (!credentials || busy) return false
    setChatError('')
    let phone: string
    try {
      phone = readPhoneNumber(input)
    } catch (error) {
      setChatError(errorText(error))
      return false
    }
    const existing = chats.find((chat) => chat.phone === phone)
    if (existing) {
      setActiveChatId(existing.chatId)
      return true
    }

    setBusy('chat')
    const requestSession = sessionId.current
    try {
      const result = await checkAccount(credentials, phone)
      if (requestSession !== sessionId.current) return false
      if (result.status === false) throw new Error(result.reason || 'Инстанс не авторизован')
      if (!result.exist || !result.chatId) throw new Error('На этом номере нет аккаунта MAX')
      setChats((current) => [...current, { chatId: result.chatId!, phone, messages: [] }])
      setActiveChatId(result.chatId)
      return true
    } catch (error) {
      if (requestSession === sessionId.current) setChatError(errorText(error))
      return false
    } finally {
      if (requestSession === sessionId.current) setBusy(null)
    }
  }

  async function send(textInput: string): Promise<boolean> {
    if (!credentials || !activeChatId || busy) return false
    const text = textInput.trim()
    if (!text) return false
    if (text.length > 4000) {
      setChatError('Сообщение не должно превышать 4000 символов')
      return false
    }
    setChatError('')
    setBusy('send')
    const requestSession = sessionId.current
    try {
      const result = await sendMessage(credentials, activeChatId, text)
      if (requestSession !== sessionId.current) return false
      setChats((current) => current.map((chat) => chat.chatId === activeChatId
        ? { ...chat, messages: [...chat.messages, {
            id: result.idMessage,
            text,
            direction: 'outgoing',
            time: Date.now(),
          }] }
        : chat,
      ))
      return true
    } catch (error) {
      if (requestSession === sessionId.current) setChatError(errorText(error))
      return false
    } finally {
      if (requestSession === sessionId.current) setBusy(null)
    }
  }

  function selectChat(chatId: string) {
    setActiveChatId(chatId)
    setChatError('')
  }

  return {
    credentials,
    chats,
    activeChat,
    busy,
    chatError,
    connectionError,
    connect,
    disconnect,
    createChat,
    selectChat,
    send,
  }
}
