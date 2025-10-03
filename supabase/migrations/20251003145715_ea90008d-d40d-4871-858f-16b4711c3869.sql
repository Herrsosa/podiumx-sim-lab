-- Drop and recreate the foreign key constraint with proper CASCADE rules
ALTER TABLE athlete_tokens 
DROP CONSTRAINT IF EXISTS athlete_tokens_athlete_id_profiles_id_fk;

ALTER TABLE athlete_tokens
ADD CONSTRAINT athlete_tokens_athlete_id_profiles_id_fk 
FOREIGN KEY (athlete_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;