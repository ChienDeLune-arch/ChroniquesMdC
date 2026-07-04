import { notFound } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { MessageThread } from '@/components/chat/MessageThread'

interface Props { params: Promise<{ id: string }> }

export default async function ChatConversationPage({ params }: Props) {
  const { id }   = await params
  const supabase  = await createClient()
  const current   = await getCurrentUser()
  if (!current) return notFound()

  const userId = current.user.id
  const isDM   = id.startsWith('dm-')
  const isGroup = id.startsWith('group-')

  if (!isDM && !isGroup) notFound()

  let messages: any[] = []
  let otherProfile: any = null
  let groupChat: any = null

  if (isDM) {
    const otherId = id.replace('dm-', '')
    // Charger le profil de l'interlocuteur
    const { data: other } = await supabase.from('profiles')
      .select('id, username, display_name, avatar_url').eq('id', otherId).single()
    if (!other) notFound()
    otherProfile = other

    // Marquer les messages comme lus
    await supabase.from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', otherId).eq('receiver_id', userId).eq('is_read', false)

    // Charger les messages
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('id, content, created_at, sender:profiles!direct_messages_sender_id_fkey(id,username,display_name,avatar_url)')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(100)
    messages = msgs ?? []

  } else {
    const groupId = id.replace('group-', '')
    const { data: group } = await supabase.from('group_chats')
      .select('id, name, avatar_url').eq('id', groupId).single()
    if (!group) notFound()
    groupChat = group

    // Vérifier membership
    const { data: mem } = await supabase.from('group_chat_members')
      .select('profile_id').eq('chat_id', groupId).eq('profile_id', userId).single()
    if (!mem) notFound()

    const { data: msgs } = await supabase
      .from('group_messages')
      .select('id, content, created_at, sender:profiles(id,username,display_name,avatar_url)')
      .eq('chat_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100)
    messages = msgs ?? []
  }

  return (
    <MessageThread
      conversationId={id}
      initialMessages={messages}
      currentUserId={userId}
      currentUserProfile={current.profile}
      otherProfile={otherProfile}
      groupChat={groupChat}
    />
  )
}
