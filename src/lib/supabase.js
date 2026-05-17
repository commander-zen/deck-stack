import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function initAuth() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('[initAuth] getSession error:', sessionError.message)
      return null
    }
    if (session) return session

    const { data, error: anonError } = await supabase.auth.signInAnonymously()
    if (anonError) {
      console.error('[initAuth] signInAnonymously error:', anonError.message)
      return null
    }
    return data.session
  } catch (err) {
    console.error('[initAuth] unexpected error:', err)
    return null
  }
}
