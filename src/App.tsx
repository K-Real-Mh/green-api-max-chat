import { ChatSidebar } from './components/ChatSidebar'
import { ConnectForm } from './components/ConnectForm'
import { Conversation } from './components/Conversation'
import { useChat } from './hooks/useChat'

function App() {
  const chat = useChat()

  if (!chat.credentials) return <ConnectForm onConnect={chat.connect} />

  return <main className="app-shell">
    <ChatSidebar
      idInstance={chat.credentials.idInstance}
      chats={chat.chats}
      activeChatId={chat.activeChat?.chatId ?? null}
      busy={chat.busy === 'chat'}
      error={chat.chatError}
      onCreateChat={chat.createChat}
      onSelectChat={chat.selectChat}
      onDisconnect={chat.disconnect}
    />
    <Conversation
      key={chat.activeChat?.chatId ?? 'none'}
      chat={chat.activeChat}
      busy={chat.busy === 'send'}
      error={chat.chatError}
      connectionError={chat.connectionError}
      onSend={chat.send}
    />
  </main>
}

export default App
