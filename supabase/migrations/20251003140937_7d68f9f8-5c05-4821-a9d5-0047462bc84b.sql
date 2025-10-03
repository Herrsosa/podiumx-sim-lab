-- Fix wallets INSERT policy to include WITH CHECK clause
DROP POLICY IF EXISTS "wallets_insert_own" ON wallets;

CREATE POLICY "wallets_insert_own" 
ON wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);