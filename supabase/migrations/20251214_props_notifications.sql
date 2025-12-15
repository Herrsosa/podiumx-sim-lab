-- ============================================
-- Props + Notifications System
-- ============================================

-- Props table: stores "likes" on proof of sweat posts
CREATE TABLE IF NOT EXISTS props (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('proof')),
  target_id uuid NOT NULL
);

-- Unique constraint: one prop per user per target
ALTER TABLE props ADD CONSTRAINT props_unique_per_user 
  UNIQUE (actor_user_id, target_type, target_id);

-- Index for fast count queries
CREATE INDEX IF NOT EXISTS idx_props_target ON props(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_props_actor ON props(actor_user_id);

-- Cached props count on posts for performance
ALTER TABLE posts ADD COLUMN IF NOT EXISTS props_count integer NOT NULL DEFAULT 0;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz
);

-- Composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE props ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Props RLS: anyone can read, only actor can insert/delete
CREATE POLICY "Props are publicly readable" ON props 
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own props" ON props 
  FOR INSERT WITH CHECK (actor_user_id = auth.uid());

CREATE POLICY "Users can delete own props" ON props 
  FOR DELETE USING (actor_user_id = auth.uid());

-- Notifications RLS: only recipient can read/update
CREATE POLICY "Users can read own notifications" ON notifications 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications 
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Trigger Functions
-- ============================================

-- Trigger: update props_count on posts
CREATE OR REPLACE FUNCTION update_props_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'proof' THEN
    UPDATE posts SET props_count = props_count + 1 WHERE id = NEW.target_id;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'proof' THEN
    UPDATE posts SET props_count = GREATEST(0, props_count - 1) WHERE id = OLD.target_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_props_count ON props;
CREATE TRIGGER trg_update_props_count
  AFTER INSERT OR DELETE ON props
  FOR EACH ROW EXECUTE FUNCTION update_props_count();

-- Trigger: notify on prop received
CREATE OR REPLACE FUNCTION notify_prop_received() RETURNS TRIGGER AS $$
DECLARE
  proof_owner_id uuid;
BEGIN
  SELECT author_id INTO proof_owner_id FROM posts WHERE id = NEW.target_id;
  
  -- Don't notify if user props their own post
  IF proof_owner_id IS NOT NULL AND proof_owner_id != NEW.actor_user_id THEN
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      proof_owner_id,
      'prop_received',
      jsonb_build_object(
        'actor_id', NEW.actor_user_id,
        'post_id', NEW.target_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_prop_received ON props;
CREATE TRIGGER trg_notify_prop_received
  AFTER INSERT ON props
  FOR EACH ROW EXECUTE FUNCTION notify_prop_received();

-- Trigger: notify on token trade
CREATE OR REPLACE FUNCTION notify_token_trade() RETURNS TRIGGER AS $$
BEGIN
  -- Notify athlete when their token is traded (by someone else)
  IF NEW.athlete_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      NEW.athlete_id,
      'token_trade',
      jsonb_build_object(
        'actor_id', NEW.user_id,
        'side', NEW.side,
        'qty', NEW.qty,
        'trade_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_token_trade ON trades;
CREATE TRIGGER trg_notify_token_trade
  AFTER INSERT ON trades
  FOR EACH ROW EXECUTE FUNCTION notify_token_trade();

-- Trigger: notify on DM received
CREATE OR REPLACE FUNCTION notify_dm_received() RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
BEGIN
  FOR participant IN 
    SELECT user_id FROM dm_participants 
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
      participant.user_id,
      'dm_received',
      jsonb_build_object(
        'sender_id', NEW.sender_id,
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_dm_received ON dm_messages;
CREATE TRIGGER trg_notify_dm_received
  AFTER INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION notify_dm_received();

-- ============================================
-- Enable Realtime for notifications
-- ============================================

-- Add notifications to realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
