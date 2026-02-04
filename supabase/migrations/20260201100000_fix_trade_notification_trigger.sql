-- Fix notify_token_trade trigger to handle athletes without auth.users entries
-- This prevents FK constraint violation on notifications.user_id when trading
-- tokens for test/founding athletes that don't have real auth accounts

CREATE OR REPLACE FUNCTION notify_token_trade() RETURNS TRIGGER AS $$
DECLARE
  v_user_exists boolean;
BEGIN
  -- Only notify if athlete is a different user AND exists in auth.users
  IF NEW.athlete_id != NEW.user_id THEN
    -- Check if the athlete_id exists in auth.users before inserting notification
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.athlete_id) INTO v_user_exists;

    IF v_user_exists THEN
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
