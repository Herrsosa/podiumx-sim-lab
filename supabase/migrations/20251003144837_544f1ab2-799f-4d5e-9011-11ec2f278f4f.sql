-- Add INSERT policy for athlete_tokens so users can create their own token during onboarding
CREATE POLICY "athlete_tokens_insert_self" 
ON athlete_tokens 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = athlete_id);