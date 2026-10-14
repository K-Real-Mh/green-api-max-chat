export type Message = {
  id: string
  text: string
  direction: 'incoming' | 'outgoing'
  time: number
}

export type Chat = {
  chatId: string
  phone: string
  messages: Message[]
}
