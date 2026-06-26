import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Contact = {
  id: string
  user_id: string
  name: string
  phone: string
  group_name: string
  opted_out: boolean
  created_at: string
}

export type Blast = {
  id: string
  user_id: string
  message: string
  group_name: string | null
  recipient_count: number
  cost: number
  status: 'sent' | 'scheduled' | 'cancelled' | 'failed'
  sent_at: string | null
  scheduled_at: string | null
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | null
  recurrence_day: number | null
  created_at: string
}

export type Settings = {
  id: string
  user_id: string
  nonprofit_name: string
  sender_label: string
  aws_access_key_id: string
  aws_secret_access_key: string
  aws_region: string
  test_phone: string
  created_at: string
  updated_at: string
}