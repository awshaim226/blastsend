import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Twilio ───────────────────────────────────────────────────────────────────
async function sendTwilio(phone: string, message: string, accountSid: string, authToken: string, fromNumber: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const body = new URLSearchParams({ To: phone, From: fromNumber, Body: message })
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  return response
}

// ─── AWS SNS ──────────────────────────────────────────────────────────────────
async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function signAwsRequest(accessKey: string, secretKey: string, region: string, payload: string) {
  const encoder = new TextEncoder()
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const host = `sns.${region}.amazonaws.com`

  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`
  const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(payload))
  const payloadHashHex = Array.from(new Uint8Array(payloadHash)).map(b => b.toString(16).padStart(2, '0')).join('')
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, 'host;x-amz-date', payloadHashHex].join('\n')
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash)).map(b => b.toString(16).padStart(2, '0')).join('')
  const credentialScope = `${dateStamp}/${region}/sns/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHashHex].join('\n')

  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, 'sns')
  const kSigning = await hmacSha256(kService, 'aws4_request')
  const signature = await hmacSha256(kSigning, stringToSign)
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')

  return {
    'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signatureHex}`,
    'x-amz-date': amzDate,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
}

async function sendSNS(phone: string, message: string, accessKey: string, secretKey: string, region: string, senderId?: string) {
  const params = new URLSearchParams({ Action: 'Publish', PhoneNumber: phone, Message: message, Version: '2010-03-31' })
  if (senderId) {
    params.append('MessageAttributes.entry.1.Name', 'AWS.SNS.SMS.SenderID')
    params.append('MessageAttributes.entry.1.Value.DataType', 'String')
    params.append('MessageAttributes.entry.1.Value.StringValue', senderId.substring(0, 11))
  }
  const payload = params.toString()
  const headers = await signAwsRequest(accessKey, secretKey, region, payload)
  return await fetch(`https://sns.${region}.amazonaws.com/`, { method: 'POST', headers, body: payload })
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { message, recipients, provider,
      // Twilio
      twilio_account_sid, twilio_auth_token, twilio_from_number,
      // AWS
      aws_access_key_id, aws_secret_access_key, aws_region, sender_label
    } = body

    if (!message || !recipients?.length) {
      return new Response(JSON.stringify({ error: 'Missing message or recipients' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const results = []

    for (const phone of recipients) {
      try {
        let response: Response

        if (provider === 'twilio' || twilio_account_sid) {
          response = await sendTwilio(phone, message, twilio_account_sid, twilio_auth_token, twilio_from_number)
        } else {
          response = await sendSNS(phone, message, aws_access_key_id, aws_secret_access_key, aws_region || 'us-east-1', sender_label)
        }

        const ok = response.status >= 200 && response.status < 300
        results.push({ phone, success: ok, status: response.status })
        await new Promise(r => setTimeout(r, 50))
      } catch (err: any) {
        results.push({ phone, success: false, error: err.message })
      }
    }

    return new Response(JSON.stringify({ results, total: recipients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
