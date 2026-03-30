import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user || null
}

export async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token || ''
}
