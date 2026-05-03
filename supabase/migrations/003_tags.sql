-- Add per-brew WREC tag assignments to the decks table.
-- wrecTags stored in `tags` column: { [category: string]: oracle_id[] }
alter table public.decks
  add column if not exists tags jsonb not null default '{}'::jsonb;
