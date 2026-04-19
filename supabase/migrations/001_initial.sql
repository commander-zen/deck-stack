create table sessions (
  id uuid primary key,
  created_at timestamptz default now()
);

create table decks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  commander_name text,
  commander_instance_id text,
  commander_card jsonb,
  pile jsonb default '[]',
  maybeboard jsonb default '[]',
  swipe_cards jsonb default '[]',
  swipe_index int default 0,
  query text,
  last_opened_at timestamptz default now(),
  created_at timestamptz default now()
);

create index on decks(session_id, last_opened_at desc);
