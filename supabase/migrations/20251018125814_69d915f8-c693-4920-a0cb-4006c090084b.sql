-- Add visibility and token requirements to posts
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'supporters', 'backers')),
  ADD COLUMN IF NOT EXISTS min_tokens_required INTEGER NOT NULL DEFAULT 0;

-- Update existing token_gated posts to use new visibility system
UPDATE posts 
SET visibility = 'supporters', min_tokens_required = 1 
WHERE token_gated = true;

-- Update RLS policy for posts to check holdings-based visibility
DROP POLICY IF EXISTS posts_select_token_gated ON posts;

CREATE POLICY posts_select_visibility ON posts
FOR SELECT USING (
  visibility = 'public'
  OR auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM holdings h
    WHERE h.user_id = auth.uid()
      AND h.athlete_id = posts.author_id
      AND h.qty >= posts.min_tokens_required
  )
);

-- Ensure chat_messages table has proper indexes
CREATE INDEX IF NOT EXISTS idx_chat_athlete_created 
  ON chat_messages (athlete_id, created_at DESC);

-- Add RPC to get user's token balance for an athlete
CREATE OR REPLACE FUNCTION get_user_balance(p_athlete_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(qty, 0)
  FROM holdings
  WHERE user_id = auth.uid() AND athlete_id = p_athlete_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_balance(UUID) TO anon, authenticated;

-- Create helper function to start/get DM conversation
CREATE OR REPLACE FUNCTION start_or_get_dm(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user UUID := auth.uid();
BEGIN
  -- Find existing conversation between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;

  -- Create new conversation if none exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (creator_id) VALUES (v_current_user)
    RETURNING id INTO v_conversation_id;
    
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conversation_id, v_current_user), (v_conversation_id, p_other_user_id);
  END IF;

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION start_or_get_dm(UUID) TO anon, authenticated;