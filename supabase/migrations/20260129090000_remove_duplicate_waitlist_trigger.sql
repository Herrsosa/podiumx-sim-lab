-- Remove duplicate waitlist notification trigger
-- If you're using a Database Webhook in the Supabase Dashboard instead, run this migration
-- to remove the pg_net-based trigger and avoid duplicate emails.

DROP TRIGGER IF EXISTS trigger_notify_waitlist_signup ON waitlist;
DROP FUNCTION IF EXISTS notify_on_waitlist_signup();
