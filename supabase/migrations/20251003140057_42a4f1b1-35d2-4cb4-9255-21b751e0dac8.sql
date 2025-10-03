-- Seed example athletes - properly handle all constraints
DO $$
BEGIN
  -- Insert profiles if they don't exist
  INSERT INTO public.profiles (id, username, display_name, bio, sport, avatar_url, strava_url, instagram_url)
  SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'nils-bergstrom', 'Nils Bergström', 'Marathon specialist with 2:15 PR. Training for Berlin 2025.', 'Running', '/assets/athletes/nils.jpg', 'nils-bergstrom', '@nilsruns'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'mara-chen', 'Mara Chen', 'Elite HYROX athlete. 2x World Championships podium.', 'HYROX', '/assets/athletes/mara.jpg', NULL, '@marahyrox'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'leo-martinez', 'Leo Martinez', 'Professional cyclist. Climbing specialist, mountain lover.', 'Cycling', '/assets/athletes/leo.jpg', 'leo-martinez', '@leocycles'),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'ava-thompson', 'Ava Thompson', 'Ironman 70.3 champion. Swim-bike-run enthusiast.', 'Triathlon', '/assets/athletes/ava.jpg', 'ava-thompson', '@avatri'),
    ('00000000-0000-0000-0000-000000000005'::uuid, 'kai-anderson', 'Kai Anderson', 'CrossFit Games veteran. Strength meets conditioning.', 'CrossFit', '/assets/athletes/kai.jpg', NULL, '@kaicf'),
    ('00000000-0000-0000-0000-000000000006'::uuid, 'rio-silva', 'Rio Silva', 'Olympic swimmer. 100m freestyle specialist.', 'Swimming', '/assets/athletes/rio.jpg', NULL, '@rioswims'),
    ('00000000-0000-0000-0000-000000000007'::uuid, 'zara-williams', 'Zara Williams', 'Ultra-runner. UTMB finisher. Mountains are my playground.', 'Trail Run', '/assets/athletes/zara.jpg', 'zara-williams', '@zaratrails'),
    ('00000000-0000-0000-0000-000000000008'::uuid, 'max-jensen', 'Max Jensen', 'Competitive rower. 2k PR: 6:15. Erg life.', 'Rowing', '/assets/athletes/max.jpg', NULL, '@maxrows')
  ) AS v(id, username, display_name, bio, sport, avatar_url, strava_url, instagram_url)
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v.id);

  -- Insert athlete tokens - check both athlete_id and symbol for conflicts
  INSERT INTO public.athlete_tokens (athlete_id, symbol, supply, a, b, c, treasury_balance, athlete_earnings)
  SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'NILS1', 100, 0.0002::numeric, 0.02::numeric, 1::numeric, 2000::numeric, 150::numeric),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'MARA', 105, 0.0002::numeric, 0.02::numeric, 1::numeric, 2200::numeric, 180::numeric),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'LEO', 110, 0.0002::numeric, 0.02::numeric, 1::numeric, 2400::numeric, 200::numeric),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'AVA', 115, 0.0002::numeric, 0.02::numeric, 1::numeric, 2600::numeric, 220::numeric),
    ('00000000-0000-0000-0000-000000000005'::uuid, 'KAI', 120, 0.0002::numeric, 0.02::numeric, 1::numeric, 2800::numeric, 250::numeric),
    ('00000000-0000-0000-0000-000000000006'::uuid, 'RIO', 125, 0.0002::numeric, 0.02::numeric, 1::numeric, 3000::numeric, 280::numeric),
    ('00000000-0000-0000-0000-000000000007'::uuid, 'ZARA', 130, 0.0002::numeric, 0.02::numeric, 1::numeric, 3200::numeric, 300::numeric),
    ('00000000-0000-0000-0000-000000000008'::uuid, 'MAX', 135, 0.0002::numeric, 0.02::numeric, 1::numeric, 3400::numeric, 320::numeric)
  ) AS v(athlete_id, symbol, supply, a, b, c, treasury_balance, athlete_earnings)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.athlete_tokens at 
    WHERE at.athlete_id = v.athlete_id OR at.symbol = v.symbol
  );

  -- Insert sample posts
  INSERT INTO public.posts (author_id, text, workout_json)
  SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Morning 20k run feeling strong! 💪', '{"type": "Run", "distance": 20, "duration": 90, "pace": "4:30/km", "rpe": 7}'::jsonb),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'HYROX training session complete! New PR on ski erg.', '{"type": "HYROX", "duration": 75, "rpe": 9}'::jsonb),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'Epic climb today - 2500m elevation gain 🚴', '{"type": "Bike", "distance": 85, "duration": 240, "speed": "21.2 km/h", "rpe": 8}'::jsonb),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'Brick workout: 40k bike + 10k run. Race day prep!', '{"type": "Run", "distance": 10, "duration": 45, "pace": "4:30/km", "rpe": 8}'::jsonb),
    ('00000000-0000-0000-0000-000000000005'::uuid, 'Strength day: Snatch work + gymnastics. Feeling it!', '{"type": "Strength", "duration": 60, "rpe": 9}'::jsonb),
    ('00000000-0000-0000-0000-000000000006'::uuid, 'Pool session: 5k swim with intervals. Sub 1:10/100m!', '{"type": "Swim", "distance": 5, "duration": 70, "rpe": 8}'::jsonb),
    ('00000000-0000-0000-0000-000000000007'::uuid, 'Trail run in the Alps - 25k with 1800m vert 🏔️', '{"type": "Run", "distance": 25, "duration": 180, "pace": "7:12/km", "rpe": 8}'::jsonb),
    ('00000000-0000-0000-0000-000000000008'::uuid, 'Erg session: 3x2k @ race pace. Legs are on fire! 🔥', '{"type": "Other", "duration": 45, "rpe": 9}'::jsonb)
  ) AS v(author_id, text, workout_json)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.author_id = v.author_id 
    AND p.text = v.text
  );
END $$;