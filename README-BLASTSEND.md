# BlastSend — Nonprofit SMS Blasting for $0.006 per Text

A complete, beautiful web app for nonprofits to send SMS blasts to thousands of contacts using Amazon SNS. No monthly fees. No contracts. Just pay Amazon directly.

**Built with:** React + Vite + Supabase + Amazon SNS
**Cost:** $0.00645 per text in the US
**Deploy:** Free on Netlify, Vercel, or Bolt.new

---

## ✨ Features

- **Contacts:** Upload CSV or paste numbers, organize into groups
- **Send & Schedule:** Send now or schedule once/daily/weekly/monthly
- **Real-time cost calculator:** See exact price before sending
- **STOP handling:** Automatic opt-out compliance
- **Dashboard:** Track sends, spend, and scheduled blasts
- **Navy/white/gold design:** Clean, professional, mobile-friendly

---

## 🚀 Setup Guide (Beginner-Friendly)

Follow these steps exactly. Takes about 15 minutes total.

### PART 1: Get Your Free Supabase Database (5 min)

1. **Go to supabase.com** and click "Start your project" — sign up with GitHub
2. **Create a new project:**
   - Name: `blastsend`
   - Database password: Create a strong one (save it!)
   - Region: Pick closest to you
   - Click "Create new project" (takes 2 minutes)
3. **Run the database setup:**
   - In left sidebar, click "SQL Editor"
   - Click "New query"
   - Open the file `public/supabase-schema.sql` in this project
   - Copy ALL the text and paste into Supabase
   - Click "RUN" — you should see "Success"
4. **Get your API keys:**
   - Go to Settings → API
   - Copy "Project URL" → this is your `VITE_SUPABASE_URL`
   - Copy "anon public" key → this is your `VITE_SUPABASE_ANON_KEY`
   - Save both somewhere safe

### PART 2: Create AWS Account for SMS (5 min)

1. **Go to aws.amazon.com** → "Create an AWS Account"
2. **Sign up:** You'll need email, credit card (they give $100 free credits)
3. **Get your access keys:**
   - Once logged in, click your name (top right) → "Security credentials"
   - Scroll to "Access keys" → "Create access key"
   - Choose "Application running outside AWS"
   - Click through → **Copy both keys immediately**
   - Access Key ID looks like: `AKIAIOSFODNN7EXAMPLE`
   - Secret looks like: `wJalrXUtnFEMI/K7MDENG...`
4. **Request SMS production access (IMPORTANT):**
   - Go to AWS Console → search "SNS"
   - Left sidebar → "Text messaging (SMS)"
   - Click "Request production access"
   - Fill form: "Nonprofit donor communications", estimate monthly volume
   - AWS usually approves in a few hours (you can send to verified numbers immediately)

### PART 3: Deploy the Edge Functions (3 min)

These handle the actual SMS sending.

1. **Install Supabase CLI** (one-time):
   ```bash
   npm install -g supabase
   ```

2. **Login and link:**
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_ID
   ```
   (Find PROJECT_ID in Supabase URL: `https://xyzcompany.supabase.co` → `xyzcompany`)

3. **Create functions:**
   ```bash
   supabase functions new send-sms
   supabase functions new check-scheduled-blasts
   ```

4. **Deploy the code:**
   - Open `supabase/functions/send-sms/index.ts`
   - Copy everything from `public/supabase-edge-function.ts` and paste
   - Open `supabase/functions/check-scheduled-blasts/index.ts`
   - Copy everything from `public/scheduler-function.ts` and paste
   
   Then deploy:
   ```bash
   supabase functions deploy send-sms
   supabase functions deploy check-scheduled-blasts
   ```

5. **Set up the scheduler (for automatic sends):**
   - In Supabase: Database → Cron Jobs
   - Click "Create a new cron job"
   - Name: `check-scheduled`
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - Command: `select net.http_post(url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-scheduled-blasts', headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb);`

### PART 4: Deploy Your Website (2 min)

**Option A: Netlify (easiest)**
1. Push this code to GitHub
2. Go to netlify.com → "Add new site"
3. Connect GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables (Site settings → Environment):
   ```
   VITE_SUPABASE_URL=https://xyz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
6. Deploy!

**Option B: Vercel**
1. Go to vercel.com → "New Project"
2. Import GitHub repo
3. Add same environment variables
4. Deploy

**Option C: Bolt.new**
1. Go to bolt.new
2. Upload this project folder
3. Add environment variables in settings
4. Click deploy

### PART 5: First-Time Setup in App

1. **Open your deployed site** → Sign up with your email
2. **Go to Setup page** (top navigation)
3. **Enter:**
   - Nonprofit name
   - Sender ID (11 characters, shows as sender)
   - AWS Access Key ID
   - AWS Secret Access Key
   - Your phone for testing
4. **Click "Send test"** → You should get a text in 5 seconds!

---

## 📋 Using the App

### Adding Contacts
1. Go to Contacts page
2. Click "Upload CSV" → file must have columns: `name`, `phone`
   - Example: `John Doe,5551234567`
3. Or click "Add manually" → paste numbers one per line

### Sending a Blast
1. Go to "Send Message"
2. Type your message (watch character count — over 160 costs double)
3. Choose group or "All contacts"
4. See exact cost: $0.00645 × number of people
5. Click "Send now" or schedule for later
6. Confirm → messages send in seconds

### Scheduling
- **Once:** Pick date/time
- **Daily:** Sends every day at that time
- **Weekly:** Pick day of week
- **Monthly:** Pick date (e.g., 1st of month)

### STOP Compliance
- Anyone who replies "STOP" is automatically removed
- They appear in Contacts with "opted out" status
- You cannot message them again (required by law)

---

## 💰 Real Costs

Amazon SNS pricing (US):
- $0.00645 per SMS segment (160 characters)
- 1,000 texts = $6.45
- 10,000 texts = $64.50
- No monthly fee, no minimum

Your $100 AWS free credit = ~15,500 free texts to start.

---

## 🔧 Environment Variables

Create `.env` file in project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Never commit this file to GitHub!

---

## 📁 Project Structure

```
src/
  App.tsx              # Main app (all pages)
  lib/
    supabase.ts        # Database client
    sms.ts             # SMS helpers
public/
  supabase-schema.sql  # Run this in Supabase
  supabase-edge-function.ts  # SMS sender
  scheduler-function.ts      # Checks scheduled blasts
```

---

## 🆘 Troubleshooting

**"Failed to send" error:**
- Check AWS keys are correct in Settings
- Verify you requested SNS production access
- Check AWS region matches (us-east-1 is default)

**Test message not received:**
- Phone must be in E.164 format: +15551234567
- Check AWS SNS console → Text messaging → Phone numbers → Verify
- In sandbox mode, you can only text verified numbers

**Scheduled messages not sending:**
- Check cron job is active in Supabase
- Verify Edge Function deployed successfully
- Check function logs: Supabase → Edge Functions → Logs

**Contacts not uploading:**
- CSV must have headers: `name` and `phone`
- Phone numbers should be 10 digits (US)
- Check browser console for errors

---

## 🔒 Security Notes

- AWS keys are stored encrypted in Supabase
- Never share your AWS secret key
- Enable 2FA on both AWS and Supabase
- Regularly rotate AWS access keys
- This app never stores message content after sending

---

## 📜 Legal Compliance

You must:
- Get consent before texting (opt-in required)
- Include "Reply STOP to opt out" in first message
- Honor STOP requests immediately (app does this automatically)
- Don't text before 8am or after 9pm recipient's time

This app handles STOP automatically, but you're responsible for obtaining consent.

---

## 🎨 Customization

Colors are defined in `src/index.css`:
- Navy: `#0f1f3d`
- Gold: `#f59e0b`
- Change these to match your nonprofit's brand

---

## Support

Built for nonprofits who need simple, affordable SMS. No support team — but the code is yours to modify!

If you're stuck:
1. Check Supabase logs
2. Check AWS CloudWatch logs
3. Verify all environment variables are set
4. Test with your own number first

Good luck with your outreach! 🚀