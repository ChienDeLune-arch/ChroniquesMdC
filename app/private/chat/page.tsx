import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { ConversationList } from '@/components/chat/ConversationList'
import { MessageSquare } from 'lucide-react'

export default async function ChatPage() {
  const supabase = await createClient()
  const current  = await getCurrentUser()
  const userId   = current!.user.id

  // DMs — derniers messages par interlocuteur
  const { data: dms } = await supabase
    .from('direct_messages')
    .select(`
      id, content, created_at, is_read,
      sender:profiles!direct_messages_sender_id_fkey(id, username, display_name, avatar_url),
      receiver:profiles!direct_messages_receiver_id_fkey(id, username, display_name, avatar_url)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100)

  // Groupes
  const { data: memberships } = await supabase
    .from('group_chat_members')
    .select(`chat:group_chats(id, name, avatar_url, updated_at)`)
    .eq('profile_id', userId)

  // Dédupliquer les DMs par interlocuteur (garder le plus récent)
  const seen = new Set<string>()
  const conversations: any[] = []
  if (!current) redirect('/auth/login')
  for (const dm of dms ?? []) {
    const other = (dm.sender as any).id === userId ? dm.receiver : dm.sender
    if (!other || seen.has((other as any).id)) continue
    seen.add((other as any).id)
    conversations.push({ type: 'dm', other, lastMessage: dm })
  }

  const groups = (memberships ?? []).map((m: any) => ({ type: 'group', chat: m.chat }))

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
        <MessageSquare size={20} />Messages
      </h1>
      <ConversationList
        conversations={conversations}
        groups={groups}
        currentUserId={userId}
      />
    </div>
  )
}
