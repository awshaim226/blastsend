// Demo mode - works without Supabase or AWS
// Stores everything in browser localStorage

export const DEMO_MODE = false

export interface DemoContact {
  id: string
  name: string
  phone: string
  group_name: string
  opted_out: boolean
  created_at: string
}

export interface DemoBlast {
  id: string
  message: string
  group_name: string | null
  recipient_count: number
  cost: number
  status: 'sent' | 'scheduled' | 'cancelled'
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
}

export interface DemoSettings {
  nonprofit_name: string
  sender_label: string
  test_phone: string
}

// Initialize with sample data
const SAMPLE_CONTACTS: DemoContact[] = [
  { id: '1', name: 'Sarah Johnson', phone: '+15551234567', group_name: 'Donors', opted_out: false, created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '2', name: 'Mike Chen', phone: '+15551234568', group_name: 'Donors', opted_out: false, created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
  { id: '3', name: 'Emily Rodriguez', phone: '+15551234569', group_name: 'Volunteers', opted_out: false, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: '4', name: 'David Kim', phone: '+15551234570', group_name: 'Volunteers', opted_out: false, created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: '5', name: 'Lisa Thompson', phone: '+15551234571', group_name: 'Members', opted_out: false, created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: '6', name: 'James Wilson', phone: '+15551234572', group_name: 'Members', opted_out: false, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '7', name: 'Maria Garcia', phone: '+15551234573', group_name: 'Donors', opted_out: false, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '8', name: 'Robert Brown', phone: '+15551234574', group_name: 'Volunteers', opted_out: true, created_at: new Date(Date.now() - 86400000 * 40).toISOString() },
]

const SAMPLE_BLASTS: DemoBlast[] = [
  {
    id: '1',
    message: 'Thank you for your support! Our annual fundraiser is next Saturday at 6pm. Hope to see you there!',
    group_name: 'Donors',
    recipient_count: 127,
    cost: 0.82,
    status: 'sent',
    sent_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    scheduled_at: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    message: 'Volunteer reminder: Food bank shift tomorrow 9am-12pm. Please reply if you can make it.',
    group_name: 'Volunteers',
    recipient_count: 43,
    cost: 0.28,
    status: 'sent',
    sent_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    scheduled_at: null,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: '3',
    message: 'Monthly newsletter: We served 340 families in November. Read the full update: bit.ly/nov24',
    group_name: null,
    recipient_count: 284,
    cost: 1.83,
    status: 'sent',
    sent_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    scheduled_at: null,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
]

export function getDemoContacts(): DemoContact[] {
  const stored = localStorage.getItem('demo_contacts')
  if (stored) return JSON.parse(stored)
  localStorage.setItem('demo_contacts', JSON.stringify(SAMPLE_CONTACTS))
  return SAMPLE_CONTACTS
}

export function saveDemoContacts(contacts: DemoContact[]) {
  localStorage.setItem('demo_contacts', JSON.stringify(contacts))
}

export function getDemoBlasts(): DemoBlast[] {
  const stored = localStorage.getItem('demo_blasts')
  if (stored) return JSON.parse(stored)
  localStorage.setItem('demo_blasts', JSON.stringify(SAMPLE_BLASTS))
  return SAMPLE_BLASTS
}

export function saveDemoBlasts(blasts: DemoBlast[]) {
  localStorage.setItem('demo_blasts', JSON.stringify(blasts))
}

export function getDemoSettings(): DemoSettings {
  const stored = localStorage.getItem('demo_settings')
  if (stored) return JSON.parse(stored)
  const defaults = { nonprofit_name: 'Helping Hands Nonprofit', sender_label: 'HELPING', test_phone: '' }
  localStorage.setItem('demo_settings', JSON.stringify(defaults))
  return defaults
}

export function saveDemoSettings(settings: DemoSettings) {
  localStorage.setItem('demo_settings', JSON.stringify(settings))
}

export function addDemoContact(contact: Omit<DemoContact, 'id' | 'created_at'>) {
  const contacts = getDemoContacts()
  const newContact: DemoContact = {
    ...contact,
    id: Math.random().toString(36).slice(2),
    created_at: new Date().toISOString(),
  }
  contacts.unshift(newContact)
  saveDemoContacts(contacts)
  return newContact
}

export function addDemoBlast(blast: Omit<DemoBlast, 'id' | 'created_at'>) {
  const blasts = getDemoBlasts()
  const newBlast: DemoBlast = {
    ...blast,
    id: Math.random().toString(36).slice(2),
    created_at: new Date().toISOString(),
  }
  blasts.unshift(newBlast)
  saveDemoBlasts(blasts)
  return newBlast
}

export function deleteDemoContact(id: string) {
  const contacts = getDemoContacts().filter(c => c.id !== id)
  saveDemoContacts(contacts)
}

// Simulate sending
export async function simulateSend(message: string, count: number): Promise<{ success: boolean }> {
  // Fake delay to make it feel real
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Add to blasts
  addDemoBlast({
    message,
    group_name: null,
    recipient_count: count,
    cost: Math.round(count * 0.00645 * 100) / 100,
    status: 'sent',
    sent_at: new Date().toISOString(),
    scheduled_at: null,
  })
  
  return { success: true }
}