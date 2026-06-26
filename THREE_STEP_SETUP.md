# BlastSend: 3-Step Setup (Explained Like You're 10)

## THE BIG PICTURE
You need 3 things (like needing flour, eggs, and sugar to bake a cake):
1. **A place to store phone numbers** (Supabase - free)
2. **A way to send texts** (Amazon - costs 0.6 cents per text)
3. **The website** (already built - just needs the other 2)

---

## STEP 1: Get Your Free Filing Cabinet (5 minutes)

This is where your contacts live. It's like Google Drive but for phone numbers.

**Do this:**
1. Go to **supabase.com** in your browser
2. Click the green button that says "Start your project"
3. Click "Continue with GitHub" (or Google) — this is just to log in
4. Click "New Project"
   - Type any name: "my-texts"
   - Create a password (write it down)
   - Click "Create new project"
5. Wait 2 minutes (it says "setting up")
6. On the left side, click "SQL Editor"
7. Click "New query"
8. Copy ALL the text from the file called `public/supabase-schema.sql`
9. Paste it in the big white box
10. Click the green "RUN" button
11. You should see "Success"

**Now get your 2 secret codes:**
1. On left, click "Settings" (gear icon) → "API"
2. You'll see two things to copy:
   - **Project URL** (looks like: https://abc123.supabase.co) → COPY THIS
   - **anon public** key (long jumbled text starting with eyJ...) → COPY THIS
3. Paste both into a Notepad or email them to yourself

**DONE WITH STEP 1** ✓

---

## STEP 2: Get Your Text Message Sender (7 minutes)

This is Amazon. They actually send the texts. You pay them directly.

**Do this:**
1. Go to **aws.amazon.com**
2. Click "Create an AWS Account" (top right)
3. Enter your email, pick a password
4. Enter your credit card (they give you $100 free - that's 15,000 free texts)
5. Verify your phone number (they'll text you a code)
6. Choose "Basic support - Free" and click through

**Now you're in Amazon. Get your keys:**
1. At the top, click your name → "Security credentials"
2. Scroll down to "Access keys"
3. Click the blue "Create access key" button
4. Click "Application running outside AWS" → Next
5. Click "Create access key"
6. **IMPORTANT:** You'll see two codes. COPY BOTH IMMEDIATELY:
   - **Access key ID** (starts with AKIA...) → COPY THIS
   - **Secret access key** (long random letters) → COPY THIS
7. You won't see the secret again, so save it now

**Ask Amazon for permission to send texts:**
1. At the top search bar, type "SNS" and click it
2. On left, click "Text messaging (SMS)"
3. Click "Request production access" or "Exit sandbox"
4. Fill out the form:
   - What are you using it for: "Nonprofit text messages to donors"
   - Website: put your nonprofit website (or leave blank)
   - How many texts: "5000 per month"
   - Click Submit
5. Amazon will email you in a few hours saying "approved" (you can still test with your own number before approval)

**DONE WITH STEP 2** ✓

---

## STEP 3: Connect Everything (3 minutes)

Now we plug your 4 codes into the website.

**Do this:**
1. Go to where your website is hosted (Vercel, Netlify, etc.)
2. Find "Environment Variables" or "Settings"
3. Add these 4 things:
   ```
   VITE_SUPABASE_URL = [paste your Project URL from Step 1]
   VITE_SUPABASE_ANON_KEY = [paste your anon key from Step 1]
   AWS_ACCESS_KEY_ID = [paste from Step 2]
   AWS_SECRET_ACCESS_KEY = [paste from Step 2]
   ```
4. Save and redeploy (usually a button that says "Redeploy")

**OR** if you want me to do it:
Just send me those 4 codes and I'll plug them in for you.

**DONE WITH STEP 3** ✓

---

## NOW TEST IT (2 minutes)

1. Open your website
2. Sign up with your email
3. Click "Settings" at the top
4. Fill in:
   - Your nonprofit name
   - AWS keys (paste them again)
   - Your cell phone number
5. Click "Send test"
6. Check your phone — you should get a text!

**If you get the text, IT WORKS!**

---

## HOW TO USE IT (After setup)

**Adding people:**
1. Click "Contacts"
2. Click "Import CSV" → choose your Excel file of phone numbers
3. Done

**Sending a text:**
1. Click "New message"
2. Type your message
3. Pick who to send to
4. Click "Send"
5. Done — texts send in seconds

**Cost:** $0.00645 per text. 1,000 texts = $6.45

---

## TROUBLESHOOTING (If something doesn't work)

**"I don't get the test text":**
- Did Amazon approve you? Check your email
- Until approved, you can only text numbers you verify in AWS
- Go to AWS → SNS → Text messaging → "Sandbox phone numbers" → add your number

**"It says error":**
- Double-check you copied the 4 codes correctly
- Make sure there are no extra spaces

**"I'm stuck":**
- Tell me which step you're on
- Tell me what you see on your screen
- I'll walk you through it

---

## SUMMARY: THE 3 STEPS

1. **Supabase** (free filing cabinet) → get 2 codes
2. **AWS** (text sender) → get 2 codes  
3. **Paste all 4 codes** into website → test

**Total time:** 15 minutes
**Total cost:** $0 to start ($100 free from Amazon)
**Ongoing cost:** $0.00645 per text only

That's it. No coding. Just copy-paste 4 things.
