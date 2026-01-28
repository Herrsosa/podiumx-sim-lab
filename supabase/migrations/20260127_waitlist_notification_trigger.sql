-- Database trigger to send email notifications when someone joins the waitlist
-- This trigger calls the notify-waitlist-signup Edge Function via pg_net

-- Function to invoke the Edge Function
CREATE OR REPLACE FUNCTION notify_on_waitlist_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the Edge Function via pg_net
    PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-waitlist-signup',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'email', NEW.email,
            'created_at', NEW.created_at
        )
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the insert if notification fails
        RAISE WARNING 'Waitlist notification failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (only fires for new rows, not updates)
DROP TRIGGER IF EXISTS trigger_notify_waitlist_signup ON waitlist;
CREATE TRIGGER trigger_notify_waitlist_signup
    AFTER INSERT ON waitlist
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_waitlist_signup();

-- Note: This trigger uses the pg_net extension which needs to be enabled in Supabase.
-- To enable pg_net, go to Database > Extensions and enable "pg_net"
