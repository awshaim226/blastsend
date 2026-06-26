// SUPABASE EDGE FUNCTION: send-sms
// Deploy this to Supabase: supabase functions new send-sms
// Then paste this code into supabase/functions/send-sms/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AWS Signature V4 for SNS
async function signAwsRequest(
  accessKey: string,
  secretKey: string,
  region: string,
  service: string,
  method: string,
  host: string,
  path: string,
  queryString: string,
  payload: string
) {
  const algorithm = 'AWS4-HMAC-SHA256'
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  
  const encoder = new TextEncoder()
  
  // Create canonical request
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-date'
  const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(payload))
  const payloadHashHex = Array.from(new Uint8Array(payloadHash)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  const canonicalRequest = [
    method,
    path,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHashHex
  ].join('\n')
  
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHashHex
  ].join('\n')
  
  // Calculate signature
  const kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  const kSigning = await hmacSha256(kService, 'aws4_request')
  const signature = await hmacSha256(kSigning, stringToSign)
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  
  const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`
  
  return {
    'Authorization': authorizationHeader,
    'x-amz-date': amzDate,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function sendSNS(
  phoneNumber: string,
  message: string,
  accessKey: string,
  secretKey: string,
  region: string,
  senderId?: string
) {
  const host = `sns.${region}.amazonaws.com`
  const path = '/'
  
  const params = new URLSearchParams({
    Action: 'Publish',
    PhoneNumber: phoneNumber,
    Message: message,
    Version: '2010-03-31'
  })
  
  if (senderId) {
    params.append('MessageAttributes.entry.1.Name', 'AWS.SNS.SMS.SenderID')
    params.append('MessageAttributes.entry.1.Value.DataType', 'String')
    params.append('MessageAttributes.entry.1.Value.StringValue', senderId.substring(0, 11))
  }
  
  const payload = params.toString()
  const headers = await signAwsRequest(accessKey, secretKey, region, 'sns', 'POST', host, path, '', payload)
  
  const response = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers,
    body: payload
  })
  
  return response
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, recipients, aws_access_key_id, aws_secret_access_key, aws_region, sender_label } = await req.json()

    if (!message || !recipients || !aws_access_key_id || !aws_secret_access_key) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []
    
    for (const phone of recipients) {
      try {
        const response = await sendSNS(
          phone,
          message,
          aws_access_key_id,
          aws_secret_access_key,
          aws_region || 'us-east-1',
          sender_label
        )
        
        results.push({
          phone,
          success: response.ok,
          status: response.status
        })
        
        // Rate limit: SNS allows ~20 TPS, so add small delay
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        results.push({
          phone,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(JSON.stringify({ results, total: recipients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})