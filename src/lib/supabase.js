import { createClient } from '@supabase/supabase-js'
import { configureSupabase } from '../auth/config'

const configured = configureSupabase(
  createClient,
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
export const supabase = configured.client
export const configurationError = configured.error
