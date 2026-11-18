import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase, type Contact, type Settings } from './lib/supabase'
import { formatPhoneNumber } from './lib/sms'
import type { Session } from '@supabase/supabase-js'

type Page = 'home' | 'contacts' | 'send' | 'history' | 'settings'

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <Screen><p className="text-gray-400 text-lg">Loading…</p></Screen>
  if (!session) return <LoginPage />
  return <MainApp userId={session.user.id} email={session.user.email!} />
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function Screen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">{children}</div>
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErr(error.message); setBusy(false) }
  }

  return (
    <Screen>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" /></svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BlastSend</h1>
          <p className="text-gray-500 mt-1">Send texts to everyone at once</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            {err && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 transition disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </Screen>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────
function MainApp({ userId, email }: { userId: string; email: string }) {
  const [page, setPage] = useState<Page>('home')

  const nav: { id: Page; label: string; emoji: string }[] = [
    { id: 'home', label: 'Home', emoji: '🏠' },
    { id: 'contacts', label: 'Contacts', emoji: '👥' },
    { id: 'send', label: 'Send Text', emoji: '📤' },
    { id: 'history', label: 'History', emoji: '📋' },
    { id: 'settings', label: 'Settings', emoji: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💬</span>
            </div>
            <span className="font-bold text-gray-900">BlastSend</span>
          </div>
          <div className="flex items-center gap-1">
            {nav.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${page === n.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                <span className="mr-1">{n.emoji}</span>{n.label}
              </button>
            ))}
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-400 hover:text-gray-700 transition">
            Sign out
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {page === 'home'     && <HomePage userId={userId} setPage={setPage} />}
        {page === 'contacts' && <ContactsPage userId={userId} />}
        {page === 'send'     && <SendPage userId={userId} />}
        {page === 'history'  && <HistoryPage userId={userId} />}
        {page === 'settings' && <SettingsPage userId={userId} />}
      </div>
    </div>
  )
}

// ─── Home Page ───────────────────────────────────────────────────────────────
function HomePage({ userId, setPage }: { userId: string; setPage: (p: Page) => void }) {
  const [stats, setStats] = useState({ contacts: 0, sent: 0, spent: 0 })
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', userId).eq('opted_out', false)
      .then(({ count }) => setStats(s => ({ ...s, contacts: count || 0 })))
    supabase.from('blasts').select('recipient_count, cost').eq('user_id', userId).eq('status', 'sent')
      .then(({ data }) => {
        const d = data || []
        setStats(s => ({
          ...s,
          sent: d.reduce((a, b) => a + b.recipient_count, 0),
          spent: d.reduce((a, b) => a + b.cost, 0),
        }))
      })
    supabase.from('settings').select('twilio_account_sid, twilio_auth_token').eq('user_id', userId).single()
      .then(async ({ data }) => {
        if (!data?.twilio_account_sid || !data?.twilio_auth_token) return
        try {
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${data.twilio_account_sid}/Balance.json`, {
            headers: { 'Authorization': 'Basic ' + btoa(`${data.twilio_account_sid}:${data.twilio_auth_token}`) }
          })
          const json = await res.json()
          if (json.balance) setBalance(parseFloat(json.balance).toFixed(2))
        } catch {}
      })
  }, [userId])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back! 👋</h1>
        <p className="text-gray-500 mt-1">Ready to send some texts?</p>
      </div>

      {/* Big Action Button */}
      <button onClick={() => setPage('send')}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-8 text-left transition shadow-md hover:shadow-lg">
        <div className="text-4xl mb-3">📤</div>
        <div className="text-2xl font-bold">Send a Text Blast</div>
        <div className="text-indigo-200 mt-1">Type a message and send it to all your contacts at once</div>
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard emoji="👥" label="Contacts" value={stats.contacts.toLocaleString()} color="bg-blue-50 border-blue-100" />
        <StatCard emoji="✉️" label="Texts Sent" value={stats.sent.toLocaleString()} color="bg-green-50 border-green-100" />
        <StatCard emoji="💰" label="Total Spent" value={`$${stats.spent.toFixed(2)}`} color="bg-purple-50 border-purple-100" />
      </div>

      {/* Twilio Balance */}
      {balance !== null && (
        <div className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${parseFloat(balance) < 80 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">Twilio Balance</p>
              <p className="text-xs text-gray-400">Used to send your text blasts</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${parseFloat(balance) < 80 ? 'text-red-600' : 'text-green-700'}`}>${balance}</p>
            {parseFloat(balance) < 80 && <p className="text-xs text-red-400 font-medium">Low — top up soon</p>}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <QuickAction emoji="👥" title="Upload Contacts" desc="Add contacts from an Excel or CSV file" onClick={() => setPage('contacts')} />
        <QuickAction emoji="📋" title="View History" desc="See all your past text blasts" onClick={() => setPage('history')} />
        <QuickAction emoji="⚙️" title="Settings" desc="Connect your AWS account" onClick={() => setPage('settings')} />
        <QuickAction emoji="📤" title="Send Now" desc="Write and send a message right now" onClick={() => setPage('send')} />
      </div>
    </div>
  )
}

function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <div className={`${color} border rounded-2xl p-5`}>
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function QuickAction({ emoji, title, desc, onClick }: { emoji: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-indigo-300 hover:shadow-sm transition">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-500 mt-0.5">{desc}</div>
    </button>
  )
}

// ─── Contacts Page ────────────────────────────────────────────────────────────
function ContactsPage({ userId }: { userId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [listName, setListName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [pendingRows, setPendingRows] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const { data } = await supabase.from('contacts').select('*').eq('user_id', userId).order('name').range(0, 49999)
    setContacts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const groups = ['All', ...Array.from(new Set(contacts.map(c => c.group_name).filter(Boolean)))]

  const processRows = async (rows: any[], groupName: string) => {
    let added = 0, skipped = 0
    for (const row of rows) {
      let rawPhone = '', name = 'Contact'
      if (Array.isArray(row)) {
        const phoneCol = row.find((v: any) => /^\+?[\d\s\-().]{7,}$/.test(String(v ?? '').trim()) || (typeof v === 'number' && String(v).replace(/\D/g,'').length >= 7))
        if (!phoneCol) { skipped++; continue }
        rawPhone = String(phoneCol).trim()
        name = row.filter((v: any) => v && String(v).trim() !== rawPhone).map((v: any) => String(v).trim()).join(' ').trim() || 'Contact'
      } else {
        rawPhone = (row.phone || row.Phone || row.PHONE || row['Phone Number'] || row['Cell'] || row['Mobile'] || '').toString().trim()
        const first = (row['First Name'] || row.first_name || row.firstname || '').toString().trim()
        const last = (row['Last Name'] || row.last_name || row.lastname || '').toString().trim()
        name = (first && last ? `${first} ${last}` : row.name || row.Name || row.NAME || first || last || 'Contact').toString().trim()
      }
      if (!rawPhone) { skipped++; continue }
      const phone = formatPhoneNumber(rawPhone)
      const { error } = await supabase.from('contacts').upsert({ user_id: userId, name, phone, group_name: groupName, opted_out: false }, { onConflict: 'user_id,phone' })
      if (!error) added++
    }
    showToast(`✅ Added ${added} contacts to "${groupName}"${skipped ? ` (${skipped} skipped)` : ''}`)
    setUploading(false)
    load()
    if (fileRef.current) fileRef.current.value = ''
  }

  const parseFile = (file: File, callback: (rows: any[]) => void) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        if (!rows.length) { setUploading(false); return }
        const firstRow = rows[0]
        const isHeader = firstRow.some((v: any) => /name|phone|mobile|cell|first|last/i.test(String(v ?? '')))
        callback(isHeader ? XLSX.utils.sheet_to_json(sheet) : rows)
      }
      reader.readAsArrayBuffer(file)
    } else {
      Papa.parse(file, {
        header: false,
        complete: (results) => {
          const raw = results.data as any[]
          if (!raw.length) { setUploading(false); return }
          const isHeader = (raw[0] as any[]).some((v: any) => /name|phone|mobile|cell|first|last/i.test(String(v ?? '')))
          if (isHeader) {
            Papa.parse(file, { header: true, complete: (r2) => callback(r2.data as any[]) })
          } else {
            callback(raw)
          }
        }
      })
    }
  }

  const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    showToast('Reading file…')
    const defaultName = file.name.replace(/\.[^/.]+$/, '')
    parseFile(file, (rows) => {
      setPendingRows(rows)
      setListName(defaultName)
      setShowNamePrompt(true)
      setUploading(false)
    })
  }

  const confirmUpload = async () => {
    const name = listName.trim() || 'General'
    setShowNamePrompt(false)
    setUploading(true)
    await processRows(pendingRows, name)
    setPendingRows([])
  }

  const removeSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} contacts?`)) return
    await supabase.from('contacts').delete().in('id', Array.from(selected))
    setContacts(c => c.filter(x => !selected.has(x.id)))
    setSelected(new Set())
    showToast(`🗑️ Deleted ${selected.size} contacts`)
  }

  const deleteList = async (groupName: string) => {
    if (!confirm(`Delete all contacts in "${groupName}"?`)) return
    await supabase.from('contacts').delete().eq('user_id', userId).eq('group_name', groupName)
    load()
    setSelectedGroup('All')
    showToast(`🗑️ Deleted list "${groupName}"`)
  }

  const lastSelectedRef = useRef<string | null>(null)

  const toggleSelect = (id: string, shiftHeld: boolean) => {
    if (shiftHeld && lastSelectedRef.current) {
      const ids = filtered.map(c => c.id)
      const a = ids.indexOf(lastSelectedRef.current)
      const b = ids.indexOf(id)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      const rangeIds = ids.slice(lo, hi + 1)
      setSelected(s => { const n = new Set(s); rangeIds.forEach(rid => n.add(rid)); return n })
    } else {
      setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
    }
    lastSelectedRef.current = id
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  const filtered = contacts.filter(c => {
    const matchGroup = selectedGroup === 'All' || c.group_name === selectedGroup
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
    return matchGroup && matchSearch
  })
  const active = contacts.filter(c => !c.opted_out).length

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast} />}

      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="font-bold text-lg text-gray-900">Name this list</h2>
            <input value={listName} onChange={e => setListName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Rosh Hashana List" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setShowNamePrompt(false); setUploading(false) }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmUpload}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold">Upload</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Contacts</h1>
          <p className="text-gray-500 mt-1">{active} active contacts ready to receive texts</p>
        </div>
        <div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-50 shadow-sm">
            {uploading ? '⏳ Uploading…' : '📂 Upload Excel / CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={uploadFile} />
        </div>
      </div>

      {/* Lists / Groups */}
      {groups.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2">
          <p className="font-semibold text-gray-900 text-sm mb-3">📋 Your Lists</p>
          <div className="flex flex-wrap gap-2">
            {groups.map(g => (
              <div key={g} className="flex items-center gap-1">
                <button onClick={() => setSelectedGroup(g)}
                  className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${selectedGroup === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {g} {g !== 'All' && `(${contacts.filter(c => c.group_name === g).length})`}
                </button>
                {g !== 'All' && (
                  <button onClick={() => deleteList(g)} className="text-gray-300 hover:text-red-400 transition text-sm px-1">🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by name or phone…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {selected.size > 0 && (
            <button onClick={removeSelected}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl px-4 py-2 transition">
              🗑️ Delete {selected.size}
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading contacts…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 font-medium">{search ? 'No contacts match your search' : 'No contacts yet'}</p>
            <p className="text-gray-400 text-sm mt-1">Upload a CSV or Excel file to get started</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-3">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleAll} className="w-4 h-4 accent-indigo-600" />
              <span className="text-xs text-gray-500">{selected.size > 0 ? `${selected.size} selected` : `Select all ${filtered.length}`}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(c => (
                <div key={c.id} className={`px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition ${selected.has(c.id) ? 'bg-indigo-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={(e) => toggleSelect(c.id, e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey)}
                      className="w-4 h-4 accent-indigo-600" />
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}{c.group_name ? ` · ${c.group_name}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.opted_out && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Opted out</span>}
                    <button onClick={() => { supabase.from('contacts').delete().eq('id', c.id).then(() => setContacts(x => x.filter(y => y.id !== c.id))) }}
                      className="text-gray-300 hover:text-red-400 transition text-lg">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Send Page ────────────────────────────────────────────────────────────────
function SendPage({ userId }: { userId: string }) {
  const [message, setMessage] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'both'>('sms')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [selectedList, setSelectedList] = useState('All')

  useEffect(() => {
    supabase.from('contacts').select('*').eq('user_id', userId).eq('opted_out', false).range(0, 49999)
      .then(({ data }) => setContacts(data || []))
    supabase.from('settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => setSettings(data))
  }, [userId])

  const lists = ['All', ...Array.from(new Set(contacts.map(c => c.group_name).filter(Boolean)))]

  const listContacts = selectedList === 'All' ? contacts : contacts.filter(c => c.group_name === selectedList)

  const selectedContacts = (() => {
    const from = parseInt(rangeFrom) || 1
    const to = parseInt(rangeTo) || listContacts.length
    return listContacts.slice(from - 1, to)
  })()

  const chars = message.length
  const segments = Math.max(1, Math.ceil(chars / 160))
  const cost = (selectedContacts.length * 0.00645 * segments).toFixed(2)

  const send = async () => {
    if (!message.trim()) { setResult({ ok: false, msg: 'Please type a message first.' }); return }
    if (contacts.length === 0) { setResult({ ok: false, msg: 'You have no contacts. Upload some first.' }); return }
    const provider = settings?.sms_provider || 'aws'
    if (provider === 'twilio' && !settings?.twilio_account_sid) { setResult({ ok: false, msg: 'Add your Twilio credentials in Settings first.' }); return }
    if (provider === 'aws' && !settings?.aws_access_key_id) { setResult({ ok: false, msg: 'Add your AWS keys in Settings first.' }); return }

    if (scheduleMode && scheduleDate) {
      await supabase.from('blasts').insert({
        user_id: userId,
        message,
        recipient_count: selectedContacts.length,
        cost: parseFloat(cost),
        status: 'scheduled',
        scheduled_at: new Date(scheduleDate).toISOString(),
        sent_at: null,
      })
      setResult({ ok: true, msg: `✅ Scheduled! Will send to ${selectedContacts.length} contacts on ${new Date(scheduleDate).toLocaleString()}` })
      setMessage('')
      return
    }

    setSending(true)
    setResult(null)
    try {
      const phones = selectedContacts.map(c => c.phone)
      const BATCH = 500
      let totalOk = 0

      for (let i = 0; i < phones.length; i += BATCH) {
        const chunk = phones.slice(i, i + BATCH)
        setResult({ ok: true, msg: `Sending… ${Math.min(i + BATCH, phones.length)} of ${phones.length}` })
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message,
            recipients: chunk,
            provider: settings!.sms_provider || 'aws',
            twilio_account_sid: settings!.twilio_account_sid,
            twilio_auth_token: settings!.twilio_auth_token,
            twilio_from_number: settings!.twilio_from_number,
            aws_access_key_id: settings!.aws_access_key_id,
            aws_secret_access_key: settings!.aws_secret_access_key,
            aws_region: settings!.aws_region || 'us-east-1',
            sender_label: settings!.sender_label,
          }),
        })
        const data = await res.json()
        totalOk += data.results?.filter((r: any) => r.success).length || 0
      }

      const failed = selectedContacts.length - totalOk
      const realCost = (totalOk * 0.00645 * segments).toFixed(2)

      await supabase.from('blasts').insert({
        user_id: userId,
        message,
        recipient_count: totalOk,
        cost: parseFloat(realCost),
        status: totalOk > 0 ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        scheduled_at: null,
      })

      setResult({ ok: totalOk > 0, msg: totalOk > 0
        ? `✅ Sent to ${totalOk} people for $${realCost}!${failed > 0 ? ` (${failed} failed)` : ''}`
        : `❌ All messages failed. Check your Twilio credentials in Settings.`
      })
      if (totalOk > 0) setMessage('')
    } catch (err: any) {
      setResult({ ok: false, msg: `Error: ${err.message}` })
    }
    setSending(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📤 Send a Text Blast</h1>
        <p className="text-gray-500 mt-1">Your message will go to all {contacts.length} active contacts</p>
      </div>

      {/* Message Box */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <label className="block font-semibold text-gray-900">Your Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={6}
          placeholder="Type your message here…&#10;&#10;Example: Hi! Just a reminder that our event is this Saturday at 2pm. Hope to see you there! 🎉"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{chars} characters</span>
          <span>{segments > 1 ? `⚠️ ${segments} segments (counts as ${segments}x cost)` : '✓ 1 segment'}</span>
        </div>
      </div>

      {/* List Picker */}
      {lists.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="font-semibold text-gray-900">📋 Send to which list?</p>
          <div className="flex flex-wrap gap-2">
            {lists.map(l => (
              <button key={l} onClick={() => { setSelectedList(l); setRangeFrom(''); setRangeTo('') }}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${selectedList === l ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {l} ({l === 'All' ? contacts.length : contacts.filter(c => c.group_name === l).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact Range */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        <p className="font-semibold text-gray-900">👥 Contact Range <span className="text-gray-400 font-normal text-sm">(optional — leave blank to send to all {listContacts.length})</span></p>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">From contact #</label>
            <input type="number" min={1} max={contacts.length} value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
              placeholder="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="text-gray-400 mt-5">→</div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">To contact #</label>
            <input type="number" min={1} max={contacts.length} value={rangeTo} onChange={e => setRangeTo(e.target.value)}
              placeholder={String(contacts.length)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <p className="text-sm text-indigo-600 font-medium">Sending to {selectedContacts.length} contacts</p>
      </div>

      {/* Channel Selector */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="font-semibold text-gray-900 mb-3">📡 Send via</p>
        <div className="grid grid-cols-3 gap-3">
          {([['sms','📱 SMS','$0.0079/text'],['whatsapp','💬 WhatsApp','$0.025/msg'],['both','📱+💬 Both','charges twice']] as [typeof channel, string, string][]).map(([val, label, sub]) => (
            <button key={val} onClick={() => setChannel(val)}
              className={`rounded-xl p-3 border-2 text-center transition ${channel === val ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'} ${val !== 'sms' && !settings?.twilio_whatsapp_number ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={val !== 'sms' && !settings?.twilio_whatsapp_number}>
              <div className="font-semibold text-sm text-gray-900">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{val !== 'sms' && !settings?.twilio_whatsapp_number ? 'Pending Meta approval' : sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cost Preview */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-indigo-900">Ready to send</p>
            <p className="text-indigo-600 text-sm mt-0.5">{selectedContacts.length} contacts × $0.00645 per text</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-700">${cost}</p>
            <p className="text-xs text-indigo-400">estimated cost</p>
          </div>
        </div>
      </div>

      {/* Schedule Toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">⏰ Schedule for later</p>
            <p className="text-sm text-gray-500">Send at a specific date and time instead of now</p>
          </div>
          <button onClick={() => setScheduleMode(m => !m)}
            className={`relative w-12 h-6 rounded-full transition-colors ${scheduleMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${scheduleMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {scheduleMode && (
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={e => setScheduleDate(e.target.value)}
            className="mt-4 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-4 text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.msg}
        </div>
      )}

      {/* Send Button */}
      <button onClick={send} disabled={sending || !message.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl py-4 text-lg transition shadow-md hover:shadow-lg disabled:opacity-50">
        {sending ? '⏳ Sending…' : scheduleMode ? `⏰ Schedule for ${selectedContacts.length} people` : `📤 Send to ${selectedContacts.length} people`}
      </button>
    </div>
  )
}

async function removeNonWorking(blast: any, userId: string, setBlasts: (fn: any) => void) {
  const sid = blast.settings_twilio_account_sid || null
  if (!confirm(`This will remove opted-out, landline, and invalid numbers from your contacts. Continue?`)) return

  const { data: settings } = await supabase.from('settings').select('twilio_account_sid, twilio_auth_token').eq('user_id', userId).single()
  if (!settings?.twilio_account_sid) return

  const sentAt = new Date(blast.sent_at || blast.created_at)
  const dateStr = sentAt.toISOString().split('T')[0]
  const auth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`)

  const badCodes = new Set([21610, 30006, 21211, 21614])
  let badPhones: string[] = []
  let url: string | null = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json?DateSent=${dateStr}&PageSize=1000`

  while (url) {
    const res: Response = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } })
    const data: any = await res.json()
    for (const m of data.messages || []) {
      if (m.direction === 'inbound') continue
      if (badCodes.has(m.error_code)) badPhones.push(m.to)
    }
    url = data.next_page_uri ? `https://api.twilio.com${data.next_page_uri}` : null
  }

  if (badPhones.length === 0) { alert('No non-working numbers found.'); return }

  for (let i = 0; i < badPhones.length; i += 100) {
    await supabase.from('contacts').delete().eq('user_id', userId).in('phone', badPhones.slice(i, i + 100))
  }

  setBlasts((bs: any[]) => bs.map(b => b.id === blast.id ? {
    ...b, opted_out_count: 0, landline_count: 0, invalid_count: 0
  } : b))

  alert(`✅ Removed ${badPhones.length} non-working numbers from your contacts.`)
}

// ─── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ userId }: { userId: string }) {
  const [blasts, setBlasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('blasts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => {
        setBlasts(data || [])
        setLoading(false)
        const toFetch = (data || []).filter(b =>
          b.status === 'sent' && !b.stats_fetched_at &&
          new Date(b.sent_at || b.created_at) < new Date(Date.now() - 10 * 60 * 1000)
        )
        toFetch.forEach(b => fetchStats(b.id))
      })
  }, [userId])

  const fetchStats = async (blastId: string) => {
    setFetching(f => new Set(f).add(blastId))
    try {
      const blast = blasts.find(b => b.id === blastId)
      if (!blast) return
      const { data: settings } = await supabase.from('settings').select('twilio_account_sid, twilio_auth_token, twilio_from_number').eq('user_id', userId).single()
      if (!settings?.twilio_account_sid) return

      const sentAt = new Date(blast.sent_at || blast.created_at)
      const dateStr = sentAt.toISOString().split('T')[0]
      const auth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`)

      let allMessages: any[] = []
      let url: string | null = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json?DateSent=${dateStr}&PageSize=1000&From=${encodeURIComponent(settings.twilio_from_number)}`
      while (url) {
        const res: Response = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } })
        const data: any = await res.json()
        allMessages = allMessages.concat(data.messages || [])
        url = data.next_page_uri ? `https://api.twilio.com${data.next_page_uri}` : null
      }

      let delivered = 0, failed = 0, opted_out = 0, landline = 0, invalid = 0
      for (const m of allMessages) {
        if (m.direction === 'inbound') continue
        if (m.status === 'delivered' || m.status === 'sent') delivered++
        else if (m.error_code === 21610) opted_out++
        else if (m.error_code === 30006) landline++
        else if (m.error_code === 21211 || m.error_code === 21614) invalid++
        else if (m.status === 'undelivered' || m.status === 'failed') failed++
      }

      await supabase.from('blasts').update({ delivered_count: delivered, failed_count: failed, opted_out_count: opted_out, landline_count: landline, invalid_count: invalid, stats_fetched_at: new Date().toISOString() }).eq('id', blastId)

      setBlasts(bs => bs.map(b => b.id === blastId ? { ...b, delivered_count: delivered, failed_count: failed, opted_out_count: opted_out, landline_count: landline, invalid_count: invalid, stats_fetched_at: new Date().toISOString() } : b))
    } finally {
      setFetching(f => { const n = new Set(f); n.delete(blastId); return n })
    }
  }

  const cancelScheduled = async (id: string) => {
    await supabase.from('blasts').update({ status: 'cancelled' }).eq('id', id)
    setBlasts(b => b.map(x => x.id === id ? { ...x, status: 'cancelled' } : x))
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      sent: 'bg-green-100 text-green-700',
      scheduled: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
    }
    return map[status] || 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📋 Message History</h1>
        <p className="text-gray-500 mt-1">All your past and scheduled text blasts</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : blasts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 font-medium">No messages sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {blasts.map(b => (
              <div key={b.id} className="px-5 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2">{b.message}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {b.status === 'scheduled'
                          ? `Scheduled for ${new Date(b.scheduled_at).toLocaleString()}`
                          : b.sent_at ? new Date(b.sent_at).toLocaleString() : ''}
                      </span>
                      {b.recipient_count > 0 && (
                        <span className="text-xs text-gray-400">{b.recipient_count} people · ${b.cost?.toFixed(2)}</span>
                      )}
                    </div>

                    {b.status === 'sent' && (
                      <div className="mt-3">
                        {fetching.has(b.id) ? (
                          <p className="text-xs text-gray-400">Fetching delivery stats…</p>
                        ) : b.stats_fetched_at ? (
                          <>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-1">
                              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-green-600 font-medium">Delivered</p>
                                <p className="text-lg font-semibold text-green-700">{(b.delivered_count || 0).toLocaleString()}</p>
                              </div>
                              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-red-500 font-medium">Failed</p>
                                <p className="text-lg font-semibold text-red-600">{(b.failed_count || 0).toLocaleString()}</p>
                              </div>
                              <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-yellow-600 font-medium">Opted out</p>
                                <p className="text-lg font-semibold text-yellow-700">{(b.opted_out_count || 0).toLocaleString()}</p>
                              </div>
                              <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-gray-500 font-medium">Landline / Invalid</p>
                                <p className="text-lg font-semibold text-gray-600">{((b.landline_count || 0) + (b.invalid_count || 0)).toLocaleString()}</p>
                              </div>
                            </div>
                            {((b.opted_out_count || 0) + (b.landline_count || 0) + (b.invalid_count || 0)) > 0 && (
                              <button onClick={() => removeNonWorking(b, userId, setBlasts)}
                                className="mt-2 text-xs text-red-400 hover:text-red-600 font-medium transition">
                                🗑️ Remove {(b.opted_out_count || 0) + (b.landline_count || 0) + (b.invalid_count || 0)} non-working numbers from contacts
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => fetchStats(b.id)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition">
                            Check delivery stats →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {b.status === 'scheduled' && (
                    <button onClick={() => cancelScheduled(b.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ userId }: { userId: string }) {
  const [form, setForm] = useState({
    nonprofit_name: '',
    sender_label: '',
    sms_provider: 'twilio' as 'twilio' | 'aws',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_from_number: '',
    twilio_whatsapp_number: '',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_region: 'us-east-1',
    test_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.from('settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (data) setForm(f => ({ ...f, ...data })) })
  }, [userId])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('settings').upsert({ ...form, user_id: userId }, { onConflict: 'user_id' })
    showToast(error ? `❌ ${error.message}` : '✅ Settings saved!')
    setSaving(false)
  }

  const test = async () => {
    if (!form.test_phone) { showToast('Enter your phone number first'); return }
    if (form.sms_provider === 'twilio' && !form.twilio_account_sid) { showToast('Enter your Twilio credentials first'); return }
    if (form.sms_provider === 'aws' && !form.aws_access_key_id) { showToast('Enter your AWS keys first'); return }
    setTesting(true)
    showToast('📱 Sending test message…')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: '✅ BlastSend is working! Your SMS setup is complete.',
          recipients: [formatPhoneNumber(form.test_phone)],
          provider: form.sms_provider,
          twilio_account_sid: form.twilio_account_sid,
          twilio_auth_token: form.twilio_auth_token,
          twilio_from_number: form.twilio_from_number,
          aws_access_key_id: form.aws_access_key_id,
          aws_secret_access_key: form.aws_secret_access_key,
          aws_region: form.aws_region || 'us-east-1',
        }),
      })
      const data = await res.json()
      const ok = data.results?.[0]?.success
      showToast(ok ? '🎉 Test message sent! Check your phone.' : `❌ Failed — check your credentials. Status: ${data.results?.[0]?.status}`)
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`)
    }
    setTesting(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      {toast && <Toast msg={toast} />}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Settings</h1>
        <p className="text-gray-500 mt-1">Connect your AWS account to enable texting</p>
      </div>

      <Section title="🏢 Your Organization">
        <Field label="Organization Name" value={form.nonprofit_name} onChange={v => setForm(f => ({ ...f, nonprofit_name: v }))} placeholder="My Organization" />
        <Field label="Sender Label (shows on texts, 11 chars max)" value={form.sender_label} onChange={v => setForm(f => ({ ...f, sender_label: v.slice(0, 11) }))} placeholder="MYORG" />
      </Section>

      <Section title="📡 SMS Provider">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setForm(f => ({ ...f, sms_provider: 'twilio' }))}
            className={`rounded-xl p-4 border-2 text-left transition ${form.sms_provider === 'twilio' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="font-bold text-gray-900">Twilio</div>
            <div className="text-xs text-gray-500 mt-0.5">Active now · $0.0079/text</div>
          </button>
          <button onClick={() => setForm(f => ({ ...f, sms_provider: 'aws' }))}
            className={`rounded-xl p-4 border-2 text-left transition ${form.sms_provider === 'aws' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="font-bold text-gray-900">AWS SNS</div>
            <div className="text-xs text-gray-500 mt-0.5">In 2 weeks · $0.00645/text</div>
          </button>
        </div>
      </Section>

      {form.sms_provider === 'twilio' && (
        <Section title="🔑 Twilio Credentials">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-2">
            💡 Find these at twilio.com → Console Dashboard
          </div>
          <Field label="Account SID" value={form.twilio_account_sid} onChange={v => setForm(f => ({ ...f, twilio_account_sid: v }))} placeholder="ACxxxxxxxxxxxxxxxx" />
          <Field label="Auth Token" type="password" value={form.twilio_auth_token} onChange={v => setForm(f => ({ ...f, twilio_auth_token: v }))} placeholder="••••••••" />
          <Field label="SMS Phone Number" value={form.twilio_from_number} onChange={v => setForm(f => ({ ...f, twilio_from_number: v }))} placeholder="+15551234567" />
        </Section>
      )}

      {form.sms_provider === 'twilio' && (
        <Section title="💬 WhatsApp (Optional — activate after Meta approval)">
          <div className={`rounded-xl p-3 text-sm mb-2 ${form.twilio_whatsapp_number ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-yellow-50 border border-yellow-100 text-yellow-700'}`}>
            {form.twilio_whatsapp_number ? '✅ WhatsApp is connected and ready' : '⏳ Waiting for Meta business verification — enter your WhatsApp number below once approved'}
          </div>
          <Field label="WhatsApp Business Number" value={form.twilio_whatsapp_number} onChange={v => setForm(f => ({ ...f, twilio_whatsapp_number: v }))} placeholder="+15551234567 (after Meta approval)" />
        </Section>
      )}

      {form.sms_provider === 'aws' && (
        <Section title="🔑 AWS Keys">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-2">
            💡 Get these from AWS → IAM → Users → blastsenduser → Security credentials
          </div>
          <Field label="Access Key ID" value={form.aws_access_key_id} onChange={v => setForm(f => ({ ...f, aws_access_key_id: v }))} placeholder="AKIA..." />
          <Field label="Secret Access Key" type="password" value={form.aws_secret_access_key} onChange={v => setForm(f => ({ ...f, aws_secret_access_key: v }))} placeholder="••••••••" />
          <Field label="Region" value={form.aws_region} onChange={v => setForm(f => ({ ...f, aws_region: v }))} placeholder="us-east-1" />
        </Section>
      )}

      <Section title="📱 Test Your Setup">
        <Field label="Your Phone Number" type="tel" value={form.test_phone} onChange={v => setForm(f => ({ ...f, test_phone: v }))} placeholder="+1 555 123 4567" />
        <button onClick={test} disabled={testing}
          className="w-full border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-xl py-2.5 transition disabled:opacity-50">
          {testing ? '⏳ Sending…' : '📱 Send Test Message to My Phone'}
        </button>
      </Section>

      <button onClick={save} disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl py-4 text-lg transition shadow-md disabled:opacity-50">
        {saving ? 'Saving…' : '💾 Save Settings'}
      </button>

      <ChangePasswordSection />
    </div>
  )
}

function ChangePasswordSection() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const changePassword = async () => {
    setMsg(''); setErr('')
    if (!newPassword || newPassword.length < 6) return setErr('Password must be at least 6 characters.')
    if (newPassword !== confirm) return setErr('Passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)
    if (error) setErr(error.message)
    else { setMsg('Password updated successfully!'); setNewPassword(''); setConfirm('') }
  }

  return (
    <Section title="🔒 Change Password">
      <Field label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
      <Field label="Confirm New Password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
      {err && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      {msg && <p className="text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
      <button onClick={changePassword} disabled={busy}
        className="w-full border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-xl py-2.5 transition disabled:opacity-50">
        {busy ? 'Updating…' : '🔒 Update Password'}
      </button>
    </Section>
  )
}

// ─── Shared Components ────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h2 className="font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
      />
    </div>
  )
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-pulse">
      {msg}
    </div>
  )
}
