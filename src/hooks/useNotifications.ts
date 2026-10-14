import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { deleteNotification, receiveNotification } from '../api/client'
import type { Chat } from '../types/chat'
import type { Credentials } from '../types/greenApi'

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

export function useNotifications(credentials: Credentials | null, setChats: Dispatch<SetStateAction<Chat[]>>) {
  const [error, setError] = useState('')
  const seenMessageIds = useRef(new Set<string>())

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
          setError('')
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
        } catch (reason) {
          if (signal.aborted) break
          setError(reason instanceof Error ? reason.message : 'Ошибка получения уведомлений')
          await wait(3000, signal)
        }
      }
    }

    void poll()
    return () => {
      controller.abort()
      seenMessageIds.current.clear()
      setError('')
    }
  }, [credentials, setChats])

  return error
}
