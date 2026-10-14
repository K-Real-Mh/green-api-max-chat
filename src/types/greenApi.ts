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
