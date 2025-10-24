-- Add performance indexes for frequently queried fields

-- Index for athlete_tokens supply lookups (used in pricing calculations)
CREATE INDEX IF NOT EXISTS idx_athlete_tokens_supply 
ON athlete_tokens(supply);

-- Composite index for trades by athlete and time (used in price history charts)
CREATE INDEX IF NOT EXISTS idx_trades_athlete_created 
ON trades(athlete_id, created_at DESC);

-- Index for trades by user (used in portfolio views)
CREATE INDEX IF NOT EXISTS idx_trades_user_id 
ON trades(user_id);

-- Composite index for posts by author and time (used in workout feeds)
CREATE INDEX IF NOT EXISTS idx_posts_author_created 
ON posts(author_id, created_at DESC);

-- Index for posts visibility filtering
CREATE INDEX IF NOT EXISTS idx_posts_visibility 
ON posts(visibility);

-- Composite index for dm_messages conversations
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation 
ON dm_messages(conversation_id, created_at DESC);

-- Index for profiles username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles(username);

-- Index for holdings by user
CREATE INDEX IF NOT EXISTS idx_holdings_user_id
ON holdings(user_id);

-- Index for holdings by athlete
CREATE INDEX IF NOT EXISTS idx_holdings_athlete_id
ON holdings(athlete_id);

-- Analyze tables to update statistics after adding indexes
ANALYZE athlete_tokens;
ANALYZE trades;
ANALYZE posts;
ANALYZE dm_messages;
ANALYZE dm_conversations;
ANALYZE profiles;
ANALYZE holdings;