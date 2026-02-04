-- Seed data for prediction markets
-- Sample markets for testing

-- Insert sample markets
INSERT INTO prediction_markets (id, event_id, event_name, event_date, event_city, division, question, type, status, closes_at, total_pool, total_trades)
VALUES
  -- London Men's Pro - Winner market
  (
    '11111111-1111-1111-1111-111111111111',
    'london-2026-03',
    'HYROX London 2026',
    '2026-03-15 09:00:00+00',
    'London',
    'Men Pro',
    'Who wins Men Pro at London Mar 15?',
    'winner',
    'open',
    '2026-03-15 08:00:00+00',
    2450,
    47
  ),
  -- London Women's Pro - Winner market
  (
    '22222222-2222-2222-2222-222222222222',
    'london-2026-03',
    'HYROX London 2026',
    '2026-03-15 09:00:00+00',
    'London',
    'Women Pro',
    'Who wins Women Pro at London Mar 15?',
    'winner',
    'open',
    '2026-03-15 08:00:00+00',
    1890,
    34
  ),
  -- Dallas - Time threshold market
  (
    '33333333-3333-3333-3333-333333333333',
    'dallas-2026-03',
    'HYROX Dallas 2026',
    '2026-03-22 09:00:00+00',
    'Dallas',
    'Men Pro',
    'Will anyone break 55:00 in Men Pro at Dallas?',
    'threshold',
    'open',
    '2026-03-22 08:00:00+00',
    3200,
    68
  ),
  -- Head to head market
  (
    '44444444-4444-4444-4444-444444444444',
    'london-2026-03',
    'HYROX London 2026',
    '2026-03-15 09:00:00+00',
    'London',
    'Men Pro',
    'Hunter McIntyre vs Tobias Schroder: Who finishes faster at London?',
    'head_to_head',
    'open',
    '2026-03-15 08:00:00+00',
    1560,
    42
  ),
  -- Manchester - Resolved market (for showing resolved state)
  (
    '55555555-5555-5555-5555-555555555555',
    'manchester-2026-02',
    'HYROX Manchester 2026',
    '2026-01-25 09:00:00+00',
    'Manchester',
    'Men Pro',
    'Who wins Men Pro at Manchester Jan 25?',
    'winner',
    'resolved',
    '2026-01-25 08:00:00+00',
    4580,
    156
  ),
  -- VIENNA - Next Weekend (Feb 8, 2026) - Men's Pro Winner
  (
    '66666666-6666-6666-6666-666666666666',
    'vienna-2026-02',
    'HYROX Vienna 2026',
    '2026-02-08 09:00:00+00',
    'Vienna',
    'Men Pro',
    'Who wins Men Pro at Vienna Feb 8?',
    'winner',
    'open',
    '2026-02-08 08:00:00+00',
    1250,
    28
  ),
  -- VIENNA - Women's Pro Winner
  (
    '77777777-7777-7777-7777-777777777777',
    'vienna-2026-02',
    'HYROX Vienna 2026',
    '2026-02-08 09:00:00+00',
    'Vienna',
    'Women Pro',
    'Who wins Women Pro at Vienna Feb 8?',
    'winner',
    'open',
    '2026-02-08 08:00:00+00',
    980,
    22
  ),
  -- VIENNA - Time Threshold
  (
    '88888888-8888-8888-8888-888888888888',
    'vienna-2026-02',
    'HYROX Vienna 2026',
    '2026-02-08 09:00:00+00',
    'Vienna',
    'Men Pro',
    'Will anyone break 56:00 in Men Pro at Vienna?',
    'threshold',
    'open',
    '2026-02-08 08:00:00+00',
    2100,
    45
  ),
  -- VIENNA - Head to Head
  (
    '99999999-9999-9999-9999-999999999999',
    'vienna-2026-02',
    'HYROX Vienna 2026',
    '2026-02-08 09:00:00+00',
    'Vienna',
    'Men Pro',
    'Tobias Schroder vs Ryan Atkins: Who finishes faster at Vienna?',
    'head_to_head',
    'open',
    '2026-02-08 08:00:00+00',
    1680,
    38
  );

-- Insert outcomes for London Men's Pro winner market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Hunter McIntyre', 'USA - World Record Holder', 350, 0.35),
  ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Tobias Schroder', 'Germany - European Champion', 280, 0.28),
  ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Ryan Atkins', 'USA - 2x HYROX Champion', 180, 0.18),
  ('a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Field', 'Any other athlete', 190, 0.19);

-- Insert outcomes for London Women's Pro winner market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Lauren Weeks', 'USA - World Champion', 320, 0.32),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Kara Webb', 'Australia - CrossFit Games athlete', 260, 0.26),
  ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Jenny Labaw', 'Germany - European Champion', 220, 0.22),
  ('b4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Field', 'Any other athlete', 200, 0.20);

-- Insert outcomes for Dallas threshold market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('c1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Yes', 'Winning time under 55:00', 620, 0.62),
  ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'No', 'Winning time 55:00 or slower', 380, 0.38);

-- Insert outcomes for Head to Head market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('d1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Hunter McIntyre', NULL, 450, 0.45),
  ('d2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Tobias Schroder', NULL, 480, 0.48),
  ('d3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'Neither starts', 'One or both DNS/DNF', 70, 0.07);

-- Insert outcomes for Manchester resolved market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('e1111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Hunter McIntyre', 'USA', 580, 0.40),
  ('e2222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Tobias Schroder', 'Germany', 420, 0.29),
  ('e3333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'Ryan Atkins', 'USA', 280, 0.19),
  ('e4444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'Field', 'Any other athlete', 170, 0.12);

-- Insert outcomes for Vienna Men's Pro winner market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('f1111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'Tobias Schroder', 'Germany - European Champion', 380, 0.38),
  ('f2222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'Ryan Atkins', 'USA - 2x HYROX Champion', 280, 0.28),
  ('f3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'Max König', 'Austria - Home favorite', 180, 0.18),
  ('f4444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'Field', 'Any other athlete', 160, 0.16);

-- Insert outcomes for Vienna Women's Pro winner market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('g1111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Jenny Labaw', 'Germany - European Champion', 340, 0.34),
  ('g2222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'Sophie Kramer', 'Austria - Home favorite', 280, 0.28),
  ('g3333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'Emma Fischer', 'Germany - Rising star', 200, 0.20),
  ('g4444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'Field', 'Any other athlete', 180, 0.18);

-- Insert outcomes for Vienna threshold market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('h1111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'Yes', 'Winning time under 56:00', 550, 0.55),
  ('h2222222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888', 'No', 'Winning time 56:00 or slower', 450, 0.45);

-- Insert outcomes for Vienna Head to Head market
INSERT INTO market_outcomes (id, market_id, label, description, shares, probability)
VALUES
  ('i1111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'Tobias Schroder', NULL, 520, 0.52),
  ('i2222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'Ryan Atkins', NULL, 420, 0.42),
  ('i3333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999', 'Neither starts', 'One or both DNS/DNF', 60, 0.06);

-- Set Manchester winner
UPDATE prediction_markets
SET winning_outcome_id = 'e1111111-1111-1111-1111-111111111111',
    resolved_at = '2026-01-25 15:00:00+00'
WHERE id = '55555555-5555-5555-5555-555555555555';

-- Add some sample activity (anonymous for seed data)
-- These would normally be created through the betting flow
