-- domainhacks data model (scaffold): tld metadata, radar sync target,
-- availability cache, postgres-based job queue.

create table tld_meta (
  tld text primary key,
  tld_type text not null,              -- cctld | gtld_legacy | gtld_new | sponsored | brand | infrastructure | web3
  operator_country text,
  google_treats_as_generic boolean,
  registrable_publicly boolean not null,
  restriction text not null,          -- none | local_presence | residency | verification | closed
  restriction_note text not null default '',
  risk_note text,
  typical_price numeric,              -- usd, first year ballpark — verify before launch
  renewal_price numeric,
  rdap_supported boolean,
  namespace text                      -- web3 only: ens | unstoppable
);

create table tld_radar (
  -- synced read-only from thetldradar (spec 12.5); citations + dates kept exactly as published
  tld text not null,
  axis text not null,                 -- abuse_band | price_pressure | registration_barrier | platform_flag_risk | registry_risk | renewal_cost
  value numeric,
  citation text,
  verified_on date,
  raw jsonb,
  synced_at timestamptz not null default now(),
  primary key (tld, axis)
);

create table availability_cache (
  fqdn text primary key,
  status text not null,               -- available | taken | unknown
  checked_via text,                   -- rdap | whois | web3
  checked_at timestamptz not null default now()
);

create table jobs (
  id bigserial primary key,
  type text not null,                 -- tld_sync | radar_sync | availability | web3_availability
  payload jsonb not null default '{}',
  status text not null default 'queued',
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on jobs (status, run_at) where status = 'queued';
