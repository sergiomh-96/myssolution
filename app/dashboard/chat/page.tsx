import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Get channels the user is a member of
  const { data: memberships } = await supabase
    .from('chat_members')
    .select(`
      *,
      channel:chat_channels(*)
    `)
    .eq('user_id', profile.id)
    .order('joined_at', { ascending: false })

  const channels = memberships?.map((m: any) => m.channel).filter(Boolean) || []

  // Get all users for creating DMs
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('is_active', true)
    .neq('id', profile.id)
    .order('full_name')

  return (
    <div className="h-[calc(100vh-6rem)]">
      <ChatInterface
        currentUser={profile}
        initialChannels={channels}
        availableUsers={users || []}
      />
    </div>
  )
}
