import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const initSession = async (captchaToken) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await supabase.auth.signInAnonymously({ options: { captchaToken } })
  }
}

export const sendMagicLink = (email) =>
  supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })

export const signOut = () => supabase.auth.signOut()
