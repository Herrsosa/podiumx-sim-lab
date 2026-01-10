-- Database trigger to send push notifications when new notifications are created
-- This trigger calls the send-push-notification Edge Function

-- Function to invoke the Edge Function
CREATE OR REPLACE FUNCTION notify_push_on_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_body TEXT;
    notification_url TEXT;
BEGIN
    -- Build notification content based on type
    CASE NEW.type
        WHEN 'token_trade' THEN
            notification_title := 'New Trade';
            notification_body := 'Someone traded your token!';
            notification_url := '/my-athlete/overview';
        WHEN 'prop_received' THEN
            notification_title := 'New Prop';
            notification_body := 'You received a prop on your workout!';
            notification_url := '/my-athlete/locker/workouts';
        WHEN 'dm_received' THEN
            notification_title := 'New Message';
            notification_body := 'You have a new direct message';
            notification_url := '/my-athlete/locker/messages';
        ELSE
            notification_title := 'Athlyst';
            notification_body := 'You have a new notification';
            notification_url := '/notifications';
    END CASE;

    -- Call the Edge Function via pg_net (if available) or http extension
    -- This is a simplified version - in production you'd use pg_net or Supabase webhooks
    PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'user_id', NEW.user_id,
            'title', notification_title,
            'body', notification_body,
            'data', jsonb_build_object('url', notification_url)
        )
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the insert if push fails
        RAISE WARNING 'Push notification failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (only fires for new rows, not updates)
DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications;
CREATE TRIGGER trigger_send_push_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION notify_push_on_notification();

-- Note: This trigger uses the pg_net extension which needs to be enabled in Supabase.
-- If pg_net is not available, you can use Supabase webhooks instead.
-- To enable pg_net, go to Database > Extensions and enable "pg_net"
