import { supabase } from "./supabase.js";

export async function signInWithGoogle() {
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
