import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export interface SavedDataset {
  id: string;
  name: string;
  config: unknown;
  summary: unknown;
  created_at: string;
}

export interface DatasetRow {
  id?: string;
  name: string;
  config: unknown;
  summary: unknown;
  records: unknown;
  created_at?: string;
}
