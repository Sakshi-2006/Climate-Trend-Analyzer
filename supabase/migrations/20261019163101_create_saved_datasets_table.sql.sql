/*
# Create saved_datasets table for Climate Trend Analyzer

1. Purpose
   Lets users persist generated climate datasets (config + summary + records) so
   they survive page reloads and can be re-opened later. Single-tenant app — no
   sign-in, no user_id, intentionally shared/public data.

2. New Tables
   - saved_datasets
     - id (uuid PK)
     - name (text, not null)
     - config (jsonb) — dataset generation parameters
     - summary (jsonb) — high-level stats (counts, means, ranges)
     - records (jsonb) — full ClimateRecord[] array
     - created_at (timestamptz, defaults to now())

3. Security
   - RLS enabled.
   - anon + authenticated can CRUD — data is intentionally public/shared
     (no auth screen in this app).
*/

CREATE TABLE IF NOT EXISTS saved_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  config jsonb NOT NULL,
  summary jsonb NOT NULL,
  records jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_saved_datasets" ON saved_datasets;
CREATE POLICY "anon_select_saved_datasets" ON saved_datasets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_saved_datasets" ON saved_datasets;
CREATE POLICY "anon_insert_saved_datasets" ON saved_datasets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_saved_datasets" ON saved_datasets;
CREATE POLICY "anon_update_saved_datasets" ON saved_datasets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_saved_datasets" ON saved_datasets;
CREATE POLICY "anon_delete_saved_datasets" ON saved_datasets FOR DELETE
  TO anon, authenticated USING (true);
