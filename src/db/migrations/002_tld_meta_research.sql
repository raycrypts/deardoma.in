-- tld metadata research columns (spec 12.3): every availability/restriction
-- call carries its citation, access date and verification status, plus
-- platform flags and the practical registration route (who can actually
-- buy: direct, via trustee/local-agent intermediary, via business
-- presence, personal presence only, unavailable).

alter table tld_meta
  add column if not exists flags jsonb default '[]',
  add column if not exists source_url text,
  add column if not exists accessed text,
  add column if not exists verified boolean default false,
  add column if not exists restriction_verified boolean default false,
  add column if not exists registration_route text,        -- direct | intermediary | business_presence | personal_presence_only | unavailable | unknown
  add column if not exists intermediary_note text,
  add column if not exists intermediary_fee numeric,      -- usd/yr ballpark where observed
  add column if not exists business_presence_accepted boolean,
  add column if not exists second_level_registrable boolean,   -- false: root names not offered (.il only registers co.il)
  add column if not exists third_level_namespaces jsonb;
