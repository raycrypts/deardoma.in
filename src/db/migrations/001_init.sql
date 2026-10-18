-- donna data model (spec section 16, simplified). payments deferred with
-- the fee saas, so no payments table yet.

create table domains (
  id bigserial primary key,
  fqdn text not null unique,
  tld text not null,
  registrar text,
  created_at timestamptz,
  expires_at timestamptz,
  status_codes text[] default '{}',
  privacy boolean,
  mx_provider text,
  in_use_score int,
  reachability_score int,
  last_prechecked_at timestamptz
);

create table prechecks (
  id bigserial primary key,
  domain_id bigint not null references domains(id),
  usage_status text check (usage_status in ('unused','lightly_used','actively_used')),
  contact_routes_found int,
  estimated_success_chance numeric,
  suggested_price_low numeric,
  suggested_price_high numeric,
  flags jsonb default '[]',
  result jsonb,
  status text not null default 'queued',   -- queued | running | done | failed
  created_at timestamptz not null default now()
);

create table contact_routes (
  id bigserial primary key,
  domain_id bigint not null references domains(id),
  type text not null check (type in ('whois_email','privacy_forward','catchall','common_address','github_owner','site_email','registrar_form','site_form','buyer_handoff')),
  address_or_url text,
  confidence numeric,
  verified boolean default false,
  priority int,
  state text default 'pending'            -- pending | active | dead | exhausted
);

create table campaigns (
  id bigserial primary key,
  domain_id bigint not null references domains(id),
  opening_offer numeric,
  max_offer numeric not null,
  state text not null default 'created',
  current_route_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id bigserial primary key,
  campaign_id bigint not null references campaigns(id),
  route_id bigint,
  direction text not null check (direction in ('out','in')),
  body text,
  intent text,
  sent_at timestamptz default now()
);

create table events (
  id bigserial primary key,
  campaign_id bigint references campaigns(id),
  domain_id bigint references domains(id),
  kind text not null,
  detail jsonb default '{}',
  created_at timestamptz not null default now()
);

create table suppressions (
  id bigserial primary key,
  email_or_domain text not null unique,
  reason text not null check (reason in ('opt_out','bounce','complaint','hostile')),
  created_at timestamptz not null default now()
);

-- postgres-based job queue (spec 15: "a postgres-based queue")
create table jobs (
  id bigserial primary key,
  type text not null,                     -- precheck | outreach_sender | reply_classifier | transfer_monitor | expiry_watch
  payload jsonb not null default '{}',
  status text not null default 'queued',
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_queue_idx on jobs (status, run_at) where status = 'queued';
