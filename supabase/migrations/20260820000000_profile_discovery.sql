-- Compatibility-backend fields for profile photos and privacy-first area maps.

alter table public.profiles
  add column if not exists avatar_url text
    check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url like 'https://%')),
  add column if not exists approximate_area text
    check (approximate_area is null or char_length(approximate_area) <= 100),
  add column if not exists approximate_longitude double precision
    check (approximate_longitude is null or approximate_longitude between -180 and 180),
  add column if not exists approximate_latitude double precision
    check (approximate_latitude is null or approximate_latitude between -90 and 90);

comment on column public.profiles.approximate_longitude is
  'Broad shared-area centroid only. Never store a home address or live device position.';
comment on column public.profiles.approximate_latitude is
  'Broad shared-area centroid only. Never store a home address or live device position.';
