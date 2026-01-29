-- Fix waitlist notification trigger to use proper URL
-- The previous trigger used current_setting() which requires manual configuration
-- This version hardcodes the Supabase project URL and uses vault for the key

-- Drop the old trigger first
DROP TRIGGER IF EXISTS trigger_notify_waitlist_signup ON waitlist;
DROP FUNCTION IF EXISTS notify_on_waitlist_signup();

-- Create a simpler function that uses the Supabase project ref directly
-- Note: pg_net extension must be enabled in Supabase Dashboard > Database > Extensions
CREATE OR REPLACE FUNCTION notify_on_waitlist_signup()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT := 'https://ssnehmposgsczoadycms.supabase.co';
    service_key TEXT;
BEGIN
    -- Try to get the service role key from vault
    -- If vault is not set up, the HTTP call will use anon key from request context
    BEGIN
        SELECT decrypted_secret INTO service_key
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1;
    EXCEPTION
        WHEN OTHERS THEN
            service_key := NULL;
    END;

    -- Call the Edge Function via pg_net
    -- Uses service role if available, otherwise relies on default auth
    IF service_key IS NOT NULL THEN
        PERFORM net.http_post(
            url := project_url || '/functions/v1/notify-waitlist-signup',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_key
            ),
            body := jsonb_build_object(
                'email', NEW.email,
                'created_at', NEW.created_at
            )
        );
    ELSE
        -- Fallback: use anon key (requires function to accept anon access)
        -- Get anon key from env
        PERFORM net.http_post(
            url := project_url || '/functions/v1/notify-waitlist-signup',
            headers := jsonb_build_object(
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object(
                'email', NEW.email,
                'created_at', NEW.created_at
            )
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the insert if notification fails
        RAISE WARNING 'Waitlist notification failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
CREATE TRIGGER trigger_notify_waitlist_signup
    AFTER INSERT ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_waitlist_signup();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION notify_on_waitlist_signup() TO postgres, service_role;
