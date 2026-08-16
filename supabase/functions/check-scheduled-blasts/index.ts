import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()
    const { data: scheduledBlasts, error } = await supabase
      .from('blasts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(10)

    if (error) throw error

    const results = []

    for (const blast of scheduledBlasts || []) {
      try {
        let query = supabase
          .from('contacts')
          .select('phone')
          .eq('user_id', blast.user_id)
          .eq('opted_out', false)

        if (blast.group_name) query = query.eq('group_name', blast.group_name)

        const { data: contacts } = await query
        const recipients = contacts?.map((c: any) => c.phone) || []

        const { data: settings } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', blast.user_id)
          .single()

        if (!settings || recipients.length === 0) continue

        // Require either Twilio or AWS credentials
        const hasTwilio = settings.twilio_account_sid && settings.twilio_auth_token && settings.twilio_from_number
        const hasAws = settings.aws_access_key_id && settings.aws_secret_access_key
        if (!hasTwilio && !hasAws) continue

        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            message: blast.message,
            recipients,
            provider: settings.sms_provider || 'twilio',
            twilio_account_sid: settings.twilio_account_sid,
            twilio_auth_token: settings.twilio_auth_token,
            twilio_from_number: settings.twilio_from_number,
            aws_access_key_id: settings.aws_access_key_id,
            aws_secret_access_key: settings.aws_secret_access_key,
            aws_region: settings.aws_region || 'us-east-1',
            sender_label: settings.sender_label,
          }),
        })

        if (sendResponse.ok) {
          await supabase.from('blasts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', blast.id)

          if (blast.recurrence && blast.recurrence !== 'once') {
            const nextDate = new Date(blast.scheduled_at)
            if (blast.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1)
            else if (blast.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
            else if (blast.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)

            await supabase.from('blasts').insert({
              user_id: blast.user_id,
              message: blast.message,
              group_name: blast.group_name,
              recipient_count: blast.recipient_count,
              cost: blast.cost,
              status: 'scheduled',
              scheduled_at: nextDate.toISOString(),
              recurrence: blast.recurrence,
              recurrence_day: blast.recurrence_day,
            })
          }

          results.push({ blast_id: blast.id, status: 'sent', recipients: recipients.length })
        }
      } catch (err: any) {
        results.push({ blast_id: blast.id, status: 'failed', error: err.message })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
