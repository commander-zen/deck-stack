import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase not configured");
  const redirectTo = window.location.hostname === "localhost"
    ? window.location.origin
    : "https://deck-stack.vercel.app";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (event === 'SIGNED_IN' && u && !u.is_anonymous) {
          const anonSessionId = localStorage.getItem('cardstock_session_id')
          if (anonSessionId) {
            await supabase.rpc('migrate_anonymous_decks', { p_session_id: anonSessionId })
            localStorage.removeItem('cardstock_session_id')
          }
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, isAnonymous: user?.is_anonymous ?? true }
}
