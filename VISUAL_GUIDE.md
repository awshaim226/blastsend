# VISUAL GUIDE - What Each Step Looks Like

## STEP 1: Supabase (with pictures in words)

**Go to supabase.com**
→ You'll see a big website with "Start your project" button (it's green)
→ Click it

**Sign in**
→ Click "Continue with GitHub" (it's a black button)
→ It will ask permission, click "Authorize"

**Create project**
→ Click "New Project" (green button)
→ You'll see a form:
   - Name: type "my-texts"
   - Password: make one up, write it down
   - Region: leave as is
→ Click "Create new project"
→ Wait — you'll see a spinning circle for 2 minutes

**Run the code**
→ On left side, find "SQL Editor" (it has a >_ icon) — click it
→ Click "New query" (top right)
→ A big white box appears
→ Open the file `public/supabase-schema.sql` on your computer
→ Select all text (Ctrl+A), copy (Ctrl+C)
→ Paste into the white box (Ctrl+V)
→ Click green "RUN" button (bottom right)
→ You should see "Success. No rows returned" in green

**Get your codes**
→ On left, click "Settings" (gear at bottom)
→ Click "API"
→ You'll see:
   - "Project URL" — copy the whole thing (starts with https://)
   - "Project API keys" → "anon" "public" — copy the long text
→ Paste both somewhere safe

---

## STEP 2: AWS (with pictures in words)

**Go to aws.amazon.com**
→ Top right, click "Create an AWS Account" (orange button)
→ Enter email, password, click "Continue"
→ Enter your info, credit card
→ Verify phone (they text you)
→ Choose "Basic support - Free"
→ Click "Complete sign up"

**Get your keys**
→ You're now logged in. Top right, click your name
→ Click "Security credentials"
→ Scroll down, find "Access keys" section
→ Click blue "Create access key" button
→ Select "Application running outside AWS"
→ Check the box "I understand"
→ Click "Next" then "Create access key"
→ **STOP** — you'll see two codes. COPY BOTH NOW:
   - Access key ID (starts AKIA...)
   - Secret access key (long random)
→ Click "Download .csv file" to save them

**Request text permission**
→ Top search bar, type "SNS", click the first result
→ Left sidebar, click "Text messaging (SMS)"
→ Click "Edit" or "Request production access"
→ Fill form:
   - Use case: select "Transactional"
   - Description: "Nonprofit donor communications"
   - Website: your website or leave blank
   - Volume: "5000"
→ Click "Submit"
→ Check your email in a few hours for approval

---

## STEP 3: Connect (with pictures in words)

**If using Vercel:**
→ Go to vercel.com, log in
→ Click your project
→ Click "Settings" (top)
→ Click "Environment Variables" (left)
→ You'll see boxes to add:
   - Name: VITE_SUPABASE_URL, Value: [paste]
   - Name: VITE_SUPABASE_ANON_KEY, Value: [paste]
   - Name: AWS_ACCESS_KEY_ID, Value: [paste]
   - Name: AWS_SECRET_ACCESS_KEY, Value: [paste]
→ Click "Save"
→ Go to "Deployments" tab
→ Click three dots → "Redeploy"

**Test it**
→ Open your website
→ Sign up
→ Click "Settings" in top menu
→ Fill in your nonprofit name
→ Paste AWS keys again
→ Enter your phone number
→ Click "Send test"
→ Check your phone!

---

## WHAT SUCCESS LOOKS LIKE

**After Step 1:** You have 2 codes from Supabase
**After Step 2:** You have 2 codes from AWS + an email from Amazon
**After Step 3:** You get a text message on your phone that says "Test from..."

If you get the text, everything works. You can now upload contacts and send real blasts.
