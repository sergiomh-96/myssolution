'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { NotificationType } from '@/lib/types/database'

interface SendNotificationProps {
  userId: string
  type: NotificationType
  title: string
  message: string | null
  link: string | null
}

export async function sendNotification({ userId, type, title, message, link }: SendNotificationProps) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      read: false
    })

    if (error) {
      console.error('Error sending notification from server action:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in sendNotification action:', error)
    return { success: false, error }
  }
}

export async function sendMultipleNotifications(notifications: SendNotificationProps[]) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('notifications').insert(
      notifications.map(n => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: false
      }))
    )

    if (error) {
      console.error('Error sending multiple notifications from server action:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in sendMultipleNotifications action:', error)
    return { success: false, error }
  }
}
