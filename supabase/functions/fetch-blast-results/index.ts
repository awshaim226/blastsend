import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { blast_id } = await req.json()
    if (!blast_id) throw new Error('blast_id required')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: blast } = await supabase.from('blasts').select('*').eq('id', blast_id).single()
    if (!blast) throw new Error('Blast not found')

    const { data: settings } = await supabase.from('settings').select('*').eq('user_id', blast.user_id).single()
    if (!settings?.twilio_account_sid || !settings?.twilio_auth_token) throw new Error('No Twilio credentials')

    const sentAt = new Date(blast.sent_at || blast.created_at)
    const dateStr = sentAt.toISOString().split('T')[0]

    const auth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`)

    let allMessages: any[] = []
    let url = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json?DateSent=${dateStr}&PageSize=1000&From=${encodeURIComponent(settings.twilio_from_number)}`

    while (url) {
      const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } })
      const data = await res.json()
      allMessages = allMessages.concat(data.messages || [])
      url = data.next_page_uri ? `https://api.twilio.com${data.next_page_uri}` : null
    }

    let delivered = 0, undelivered = 0, failed = 0, opted_out = 0, landline = 0, invalid = 0

    for (const m of allMessages) {
      if (m.direction === 'inbound') continue
      const status = m.status
      const error = m.error_code

      if (status === 'delivered' || status === 'sent') {
        delivered++
      } else if (error === 21610) {
        opted_out++
      } else if (error === 30006) {
        landline++
      } else if (error === 21211 || error === 21614) {
        invalid++
      } else if (status === 'undelivered' || status === 'failed') {
        undelivered++
      }
    }

    failed = undelivered

    await supabase.from('blasts').update({
      delivered_count: delivered,
      failed_count: failed,
      opted_out_count: opted_out,
      landline_count: landline,
      invalid_count: invalid,
      stats_fetched_at: new Date().toISOString(),
    }).eq('id', blast_id)

    return new Response(JSON.stringify({ delivered, failed, opted_out, landline, invalid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
