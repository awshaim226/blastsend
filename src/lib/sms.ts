// SMS cost constant for Amazon SNS US
const SMS_COST_PER_MESSAGE = 0.00645

export function calculateCost(recipientCount: number): number {
  return Math.round(recipientCount * SMS_COST_PER_MESSAGE * 100) / 100
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // If 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  // If 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  // If already has +, return as is
  if (phone.startsWith('+')) {
    return phone
  }
  
  // Default: assume US number
  return `+1${digits}`
}

export function isValidPhone(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  return /^\+1\d{10}$/.test(formatted)
}

export function getCharacterCount(text: string): { count: number; segments: number; overLimit: boolean } {
  const count = text.length
  const segments = Math.ceil(count / 160)
  return {
    count,
    segments,
    overLimit: count > 160
  }
}

export async function sendSMSViaEdgeFunction(
  message: string,
  recipients: string[],
  settings: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message,
        recipients: recipients.map(formatPhoneNumber),
        aws_access_key_id: settings.aws_access_key_id,
        aws_secret_access_key: settings.aws_secret_access_key,
        aws_region: settings.aws_region || 'us-east-1',
        sender_label: settings.sender_label,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}