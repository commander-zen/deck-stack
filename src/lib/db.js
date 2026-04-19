import { supabase } from "./supabase.js";

export async function getOrCreateSession() {
  let id = localStorage.getItem("deckstack_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deckstack_session_id", id);
  }
  if (supabase) {
    const { error } = await supabase
      .from("sessions")
      .upsert({ id }, { onConflict: "id" });
    if (error) throw error;
  }
  return id;
}

export async function loadDecks(sessionId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("session_id", sessionId)
    .order("last_opened_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveDeck(sessionId, deck) {
  if (!supabase) return;
  const { error } = await supabase.from("decks").upsert(
    {
      id: deck.id,
      session_id: sessionId,
      name: deck.name,
      commander_name: deck.commander_name ?? null,
      commander_instance_id: deck.commander_instance_id ?? null,
      commander_card: deck.commander_card ?? null,
      pile: deck.pile ?? [],
      maybeboard: deck.maybeboard ?? [],
      swipe_cards: deck.swipe_cards ?? [],
      swipe_index: deck.swipe_index ?? 0,
      query: deck.query ?? null,
      last_opened_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function deleteDeck(sessionId, deckId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("decks")
    .delete()
    .eq("id", deckId)
    .eq("session_id", sessionId);
  if (error) throw error;
}
