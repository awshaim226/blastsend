import { useState, useEffect, useRef } from 'react'
import { calculateCost, formatPhoneNumber, isValidPhone, getCharacterCount } from './lib/sms'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  MessageSquare, Users, LayoutDashboard, Settings as SettingsIcon, Send, Upload,
  Plus, Search, X, Check, Trash2, LogOut, Info, Phone, Play
} from 'lucide-react'
import {
  DEMO_MODE,
  getDemoContacts,
  saveDemoContacts,
  getDemoBlasts,
  saveDemoBlasts,
  getDemoSettings,
  saveDemoSettings,
  addDemoContact,
  addDemoBlast,
  deleteDemoContact,
  simulateSend,
  type DemoContact,
  type DemoBlast,
  type DemoSettings,
} from './lib/demo'

type Page = 'dashboard' | 'contacts' | 'compose' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [showDemoBanner, setShowDemoBanner] = useState(true)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {showDemoBanner && (
        <div className="bg-amber-500 text-black">
          <div className="mx-auto max-w-[1200px] px-6 h-9 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2">
              <Play size={14} className="fill-black" />
              <span className="font-medium">DEMO MODE</span>
              <span className="hidden sm:inline opacity-80">— This is a practice version. No real texts are sent. Everything is saved in your browser.</span>
            </div>
            <button onClick={() => setShowDemoBanner(false)} className="hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-6 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-gray-900 flex items-center justify-center">
                <MessageSquare size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-[15px] tracking-tight">BlastSend</span>
              <span className="text-[11px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium uppercase tracking-wide">Demo</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
                { id: 'contacts', label: 'Contacts', icon: Users },
                { id: 'compose', label: 'New message', icon: Send },
                { id: 'settings', label: 'Settings', icon: SettingsIcon },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id as Page)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    page === item.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={14} strokeWidth={2} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[13px] text-gray-600">demo@nonprofit.org</span>
            <button className="p-1.5 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'contacts' && <ContactsPage />}
        {page === 'compose' && <ComposePage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

function Dashboard({ setPage }: { setPage: (p: Page) => void }) {
  const contacts = getDemoContacts().filter(c => !c.opted_out)
  const blasts = getDemoBlasts()
  const sentThisMonth = blasts.filter(b => b.status === 'sent')
  const totalSent = sentThisMonth.reduce((sum, b) => sum + b.recipient_count, 0)
  const totalSpent = sentThisMonth.reduce((sum, b) => sum + b.cost, 0)
  const scheduled = blasts.filter(b => b.status === 'scheduled').slice(0, 3)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Overview</h1>
          <p className="text-[14px] text-gray-600 mt-1">Try clicking around — this is all fake data</p>
        </div>
        <button
          onClick={() => setPage('compose')}
          className="h-8 px-3 bg-gray-900 text-white rounded-md text-[13px] font-medium hover:bg-gray-800 flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={2.5} />
          New message
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active contacts', value: contacts.length.toLocaleString(), sub: 'Ready to message' },
          { label: 'Messages sent', value: totalSent.toLocaleString(), sub: 'In demo' },
          { label: 'Total spent', value: `$${totalSpent.toFixed(2)}`, sub: '@ $0.00645 each' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="text-[12px] text-gray-500 uppercase tracking-wide font-medium mb-1">{s.label}</div>
            <div className="text-[28px] font-semibold tracking-tight tabular">{s.value}</div>
            <div className="text-[12px] text-gray-500 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Recent messages</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {blasts.filter(b => b.status === 'sent').slice(0, 4).map(b => (
              <div key={b.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug line-clamp-2">{b.message}</p>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <span className="text-[11px] text-gray-500">{new Date(b.created_at).toLocaleDateString()}</span>
                      <span className="text-[11px] text-gray-300">•</span>
                      <span className="text-[11px] text-gray-500">{b.recipient_count} recipients</span>
                    </div>
                  </div>
                  <div className="text-[12px] font-medium tabular">${b.cost.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <h2 className="text-[14px] font-semibold">Try it yourself</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              '1. Click "Contacts" → add your own test contacts',
              '2. Click "New message" → write a message',
              '3. See the cost update live as you type',
              '4. Click "Send" — it will pretend to send',
            ].map((step) => (
              <div key={step} className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-medium text-gray-600">{step[0]}</span>
                </div>
                <p className="text-[13px] text-gray-700">{step.slice(3)}</p>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-100">
              <p className="text-[12px] text-gray-500">All data saves in your browser. Refresh the page — it remembers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactsPage() {
  const [contacts, setContacts] = useState<DemoContact[]>(getDemoContacts())
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const groups = Array.from(new Set(contacts.filter(c => !c.opted_out).map(c => c.group_name)))
    .map(name => ({ name, count: contacts.filter(c => c.group_name === name && !c.opted_out).length }))

  const refresh = () => setContacts(getDemoContacts())

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      complete: (results: any) => {
        results.data.slice(0, 50).forEach((r: any) => {
          if (r.phone || r.Phone) {
            addDemoContact({
              name: r.name || r.Name || 'Contact',
              phone: formatPhoneNumber(r.phone || r.Phone),
              group_name: r.group || r.Group || 'General',
              opted_out: false,
            })
          }
        })
        refresh()
      }
    })
  }

  const addManual = (text: string, group: string) => {
    text.split('\n').filter(l => l.trim()).slice(0, 20).forEach(line => {
      const [name, phone] = line.includes(',') ? line.split(',').map(s => s.trim()) : ['Contact', line.trim()]
      if (isValidPhone(phone)) {
        addDemoContact({ name, phone: formatPhoneNumber(phone), group_name: group, opted_out: false })
      }
    })
    refresh()
    setShowAdd(false)
  }

  const filtered = contacts.filter(c => {
    const matchGroup = filter === 'all' || c.group_name === filter
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
    return matchGroup && matchSearch && !c.opted_out
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Contacts</h1>
          <p className="text-[14px] text-gray-600 mt-1">{contacts.filter(c => !c.opted_out).length} active • Try adding your own</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="h-8 px-3 border border-gray-300 rounded-md text-[13px] font-medium hover:bg-gray-50 flex items-center gap-1.5">
            <Upload size={14} />
            Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="h-8 px-3 bg-gray-900 text-white rounded-md text-[13px] font-medium hover:bg-gray-800 flex items-center gap-1.5">
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="w-full h-8 pl-8 pr-3 rounded-md border border-gray-300 text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-900" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFilter('all')} className={`h-7 px-2.5 rounded-md text-[12px] font-medium ${filter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>All</button>
          {groups.map(g => (
            <button key={g.name} onClick={() => setFilter(g.name)} className={`h-7 px-2.5 rounded-md text-[12px] font-medium ${filter === g.name ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {g.name} <span className="opacity-60">{g.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">Group</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-[13px]">{c.name}</td>
                  <td className="px-4 py-2.5 text-[13px] font-mono text-gray-600">{c.phone}</td>
                  <td className="px-4 py-2.5"><span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">{c.group_name}</span></td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => { deleteDemoContact(c.id); refresh() }} className="p-1 text-gray-400 hover:text-red-600 rounded">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[480px] border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Add contacts</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
            </div>
            <div className="p-5">
              <AddForm onAdd={addManual} groups={groups.map(g => g.name)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddForm({ onAdd, groups }: { onAdd: (t: string, g: string) => void; groups: string[] }) {
  const [text, setText] = useState('Test Person, 5551234567\nAnother Person, 5559876543')
  const [group, setGroup] = useState(groups[0] || 'General')
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Phone numbers (one per line)</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-[120px] px-3 py-2 border border-gray-300 rounded-md text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-gray-900" />
        <p className="text-[11px] text-gray-500 mt-1">Format: Name, Phone or just Phone</p>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Group</label>
        <input value={group} onChange={e => setGroup(e.target.value)} className="w-full h-8 px-3 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-900" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => onAdd(text, group)} className="h-8 px-3 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800">Add contacts</button>
      </div>
    </div>
  )
}

function ComposePage() {
  const [message, setMessage] = useState('Hi! This is a test message from our nonprofit. Reply STOP to opt out.')
  const [group, setGroup] = useState('all')
  const [schedule, setSchedule] = useState('')
  const [sending, setSending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const contacts = getDemoContacts()
  const groups = Array.from(new Set(contacts.filter(c => !c.opted_out).map(c => c.group_name)))
    .map(name => ({ name, count: contacts.filter(c => c.group_name === name && !c.opted_out).length }))

  const chars = getCharacterCount(message)
  const recipients = group === 'all' ? contacts.filter(c => !c.opted_out).length : contacts.filter(c => c.group_name === group && !c.opted_out).length
  const cost = calculateCost(recipients) * chars.segments

  const send = async () => {
    setSending(true)
    await simulateSend(message, recipients)
    setSending(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
    setMessage('')
  }

  return (
    <div className="max-w-[960px]">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight">New message</h1>
        <p className="text-[14px] text-gray-600 mt-1">Type a message and watch the cost update</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full h-[140px] px-3 py-2.5 border border-gray-300 rounded-md text-[14px] leading-[1.5] focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none" />
            <div className="flex items-center justify-between mt-2.5">
              <span className={`text-[12px] ${chars.overLimit ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>{chars.count} characters • {chars.segments} message{chars.segments > 1 ? 's' : ''}</span>
              <span className="text-[11px] text-gray-500">Try typing more than 160 characters</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <label className="block text-[12px] font-medium text-gray-700 mb-2.5">Recipients</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer hover:bg-gray-50 has-[input:checked]:border-gray-900 has-[input:checked]:bg-gray-50">
                <input type="radio" name="g" checked={group === 'all'} onChange={() => setGroup('all')} className="w-3.5 h-3.5" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-[13px]">All contacts</span>
                  <span className="text-[12px] text-gray-500 tabular">{contacts.filter(c => !c.opted_out).length}</span>
                </div>
              </label>
              {groups.map(g => (
                <label key={g.name} className="flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer hover:bg-gray-50 has-[input:checked]:border-gray-900 has-[input:checked]:bg-gray-50">
                  <input type="radio" name="g" checked={group === g.name} onChange={() => setGroup(g.name)} className="w-3.5 h-3.5" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px]">{g.name}</span>
                    <span className="text-[12px] text-gray-500 tabular">{g.count}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-8">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-[13px] font-semibold mb-4">Summary</h3>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Recipients</span>
                <span className="font-medium tabular">{recipients.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost per SMS</span>
                <span className="tabular">$0.00645</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Messages each</span>
                <span className="tabular">{chars.segments}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-medium">Total</span>
                <span className="text-[18px] font-semibold tabular">${cost.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={send} disabled={!message || !recipients || sending} className="w-full h-9 mt-4 bg-gray-900 text-white rounded-md text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
              {sending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} />Send demo</>}
            </button>
            <p className="text-[11px] text-gray-500 mt-2 text-center">In demo mode, this just pretends to send</p>
          </div>

          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  <p className="text-[13px] font-medium text-green-900">Pretend sent to {recipients} people!</p>
                </div>
                <p className="text-[12px] text-green-700 mt-1">Check the Overview page to see it in history</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function SettingsPage() {
  const [settings, setSettings] = useState<DemoSettings>(getDemoSettings())
  const [saved, setSaved] = useState(false)

  const save = () => {
    saveDemoSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-[720px]">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight">Settings</h1>
        <p className="text-[14px] text-gray-600 mt-1">In demo mode, these settings don't do anything</p>
      </div>

      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-2.5">
            <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-medium text-amber-900 mb-1">Demo mode active</p>
              <p className="text-[12px] text-amber-800 leading-snug">To send real texts, you'd need to connect Amazon SNS. This costs $0.00645 per message. For now, everything is fake and free.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <h2 className="text-[14px] font-semibold">Organization</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Organization name</label>
                <input value={settings.nonprofit_name} onChange={e => setSettings({ ...settings, nonprofit_name: e.target.value })} className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Sender ID</label>
                <input value={settings.sender_label} onChange={e => setSettings({ ...settings, sender_label: e.target.value })} className="w-full h-8 px-2.5 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-900" />
              </div>
            </div>
            <button onClick={save} className="h-8 px-3 bg-gray-900 text-white rounded-md text-[13px] font-medium hover:bg-gray-800 flex items-center gap-1.5">
              {saved ? <Check size={14} /> : null}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <h2 className="text-[14px] font-semibold">Ready to go live?</h2>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-gray-700 mb-3">When you're ready to send real texts:</p>
            <ol className="space-y-2 text-[13px] text-gray-600">
              <li className="flex gap-2"><span className="font-medium">1.</span> Create free AWS account at aws.amazon.com</li>
              <li className="flex gap-2"><span className="font-medium">2.</span> Get your API keys (takes 2 minutes)</li>
              <li className="flex gap-2"><span className="font-medium">3.</span> Paste them here</li>
              <li className="flex gap-2"><span className="font-medium">4.</span> Start sending — you pay Amazon $0.00645 per text</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}