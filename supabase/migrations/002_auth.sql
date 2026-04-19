-- Add user_id to decks for cross-device sync
alter table public.decks
  add column if not exists user_id uuid references auth.users(id);

-- Enable Row Level Security
alter table public.sessions enable row level security;
alter table public.decks enable row level security;

-- Sessions: open access (anonymous sessions use UUID privacy)
create policy "sessions_open"
  on public.sessions for all
  using (true) with check (true);

-- Decks: anonymous requests (no auth) can access all rows (UUID privacy model)
create policy "decks_anon"
  on public.decks for all
  using (auth.uid() is null)
  with check (auth.uid() is null);

-- Decks: authenticated users can only access their own rows
create policy "decks_owner"
  on public.decks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RPC: claim anonymous session's decks after sign-in
-- SECURITY DEFINER so it can write user_id regardless of current RLS state
create or replace function public.migrate_anonymous_decks(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update decks
  set user_id = auth.uid()
  where session_id = p_session_id
    and user_id is null;
end;
$$;
