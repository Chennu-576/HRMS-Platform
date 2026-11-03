/*
# HRMS Seed Data

## Overview
Seeds default leave types and a set of public/company holidays for the current year.
This gives the app realistic data to display on first run.

## Changes
1. Inserts 4 leave types: Sick, Casual, Earned, Unpaid.
2. Inserts ~12 holidays for the current year (mix of public and company).

## Notes
- Uses ON CONFLICT DO NOTHING so re-running is safe.
- Holiday dates are computed relative to the current year so they're always relevant.
*/

-- ── LEAVE TYPES ─────────────────────────────────────────
INSERT INTO leave_types (name, default_balance, is_paid) VALUES
  ('Sick',   12,  true),
  ('Casual', 12,  true),
  ('Earned', 20,  true),
  ('Unpaid',  0,  false)
ON CONFLICT DO NOTHING;

-- ── HOLIDAYS (current year) ──────────────────────────────
-- Use make_date with EXTRACT(year FROM now()) so it works any year.
DO $$
DECLARE
  yr int := EXTRACT(year FROM now())::int;
BEGIN
  INSERT INTO holidays (name, date, type, description) VALUES
    ('New Year''s Day',        make_date(yr, 1, 1),  'public',  'Start of the calendar year'),
    ('Republic Day',           make_date(yr, 1, 26), 'public',  'National holiday'),
    ('Valentine''s Day',       make_date(yr, 2, 14), 'company', 'Optional celebration day'),
    ('International Women''s Day', make_date(yr, 3, 8), 'company', 'Celebrating women at work'),
    ('Good Friday',            make_date(yr, 4, 18), 'public',  'Christian holiday'),
    ('Labour Day',             make_date(yr, 5, 1),  'public',  'International workers day'),
    ('Independence Day',       make_date(yr, 8, 15), 'public',  'National holiday'),
    ('Founder''s Day',         make_date(yr, 9, 5),  'company', 'Company founding anniversary'),
    ('Gandhi Jayanti',         make_date(yr, 10, 2), 'public',  'Birth anniversary of Mahatma Gandhi'),
    ('Diwali',                 make_date(yr, 11, 1), 'public',  'Festival of lights'),
    ('Christmas',              make_date(yr, 12, 25),'public',  'Christmas Day'),
    ('Year-End Break',         make_date(yr, 12, 31),'company', 'Optional year-end reflection day')
  ON CONFLICT DO NOTHING;
END $$;
