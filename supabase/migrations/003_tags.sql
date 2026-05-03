-- Add per-brew tag assignments and custom tag names to the decks table.
-- tags:        { [tagName: string]: oracle_id[] }
-- custom_tags: string[]  (user-defined tag names, ordered)
alter table public.decks
  add column if not exists tags        jsonb not null default '{}'::jsonb,
  add column if not exists custom_tags jsonb not null default '[]'::jsonb;
