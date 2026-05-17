-- Add status lifecycle column to decks.
-- Valid values: 'created', 'brewing', 'done'
-- Defaults to 'brewing' so existing rows get a sensible value on backfill.
alter table public.decks
  add column if not exists status text not null default 'brewing'
    check (status in ('created', 'brewing', 'done'));
