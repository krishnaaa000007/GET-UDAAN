-- Security: turn on Row Level Security for every table, with NO policies.
-- Result: Supabase's public "anon"/"authenticated" API keys can read/write NOTHING.
-- Our server connects as the table owner (postgres), which bypasses RLS,
-- so all access goes through the app's own authorization checks.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
