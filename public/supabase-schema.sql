-- BlastSend - Complete Supabase Schema
-- Copy and paste this entire file into Supabase SQL Editor and click RUN

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'General',
  opted_out BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

-- 2. BLASTS TABLE (sent and scheduled messages)
CREATE TABLE IF NOT EXISTS blasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  group_name TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'cancelled', 'failed')),
  sent_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  recurrence TEXT CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly')),
  recurrence_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nonprofit_name TEXT DEFAULT 'My Nonprofit',
  sender_label TEXT DEFAULT 'Nonprofit',
  aws_access_key_id TEXT,
  aws_secret_access_key TEXT,
  aws_region TEXT DEFAULT 'us-east-1',
  test_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STOP REPLIES TABLE
CREATE TABLE IF NOT EXISTS stop_replies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL,
  message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_group ON contacts(user_id, group_name);
CREATE INDEX IF NOT EXISTS idx_contacts_opted_out ON contacts(user_id, opted_out);
CREATE INDEX IF NOT EXISTS idx_blasts_user_id ON blasts(user_id);
CREATE INDEX IF NOT EXISTS idx_blasts_scheduled ON blasts(status, scheduled_at) WHERE status = 'scheduled';

-- ROW LEVEL SECURITY
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for contacts
CREATE POLICY "Users can view their own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Policies for blasts
CREATE POLICY "Users can view their own blasts" ON blasts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own blasts" ON blasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own blasts" ON blasts FOR UPDATE USING (auth.uid() = user_id);

-- Policies for settings
CREATE POLICY "Users can view their own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically create settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (user_id, nonprofit_name)
  VALUES (NEW.id, 'My Nonprofit');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();