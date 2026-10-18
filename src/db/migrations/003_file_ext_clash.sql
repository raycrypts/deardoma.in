-- file-extension clash flags (spec 12.5.1 #6): a tld that reads as a file
-- type (.py, .md, .zip) gets a penalty flag, never an exclusion.
-- researched in research/file-ext-clash.json (freedesktop shared-mime-info
-- + python mimetypes intersected with the iana root; classic tlds excluded).
alter table tld_meta
  add column if not exists file_ext_clash boolean default false,
  add column if not exists file_ext_severity text,   -- 'high' | 'medium'
  add column if not exists file_ext_note text;      -- e.g. '.py file (python source)'
