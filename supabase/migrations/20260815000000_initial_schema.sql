-- Invite MVP schema
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  handle text not null unique check (handle ~ '^[a-z0-9_]{2,30}$'),
  headline text not null default 'Ready for a few good plans' check (char_length(headline) <= 80),
  bio text not null default 'I joined Invite to meet kind people through small, comfortable activities.' check (char_length(bio) <= 320),
  city text not null default '',
  initials text not null default '?',
  avatar_color text not null default '#315C4C',
  interests text[] not null default '{}',
  availability text[] not null default '{}',
  connection_goals text[] not null default '{}',
  joined_at timestamptz not null default now(),
  completed_activities integer not null default 0 check (completed_activities >= 0),
  reliability_score integer not null default 100 check (reliability_score between 0 and 100),
  is_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.activities (
  id text primary key,
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 70),
  description text not null check (char_length(description) between 20 and 500),
  category text not null check (category in ('Coffee', 'Food', 'Outdoors', 'Sports', 'Arts', 'Games', 'Learning', 'Wellness')),
  start_at timestamptz not null,
  end_at timestamptz,
  location text not null,
  city text not null,
  capacity integer not null check (capacity between 2 and 30),
  visibility text not null check (visibility in ('community', 'invite-only')),
  vibe text not null check (vibe in ('Easygoing', 'Active', 'Focused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_activity_times check (end_at is null or end_at > start_at)
);

create table public.activity_attendees (
  activity_id text not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table public.invitations (
  id text primary key,
  activity_id text not null references public.activities(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text not null default '' check (char_length(message) <= 180),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint cannot_invite_self check (sender_id <> receiver_id),
  constraint one_active_invitation unique (activity_id, receiver_id)
);

create table public.saved_activities (
  activity_id text not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index activities_start_at_idx on public.activities(start_at);
create index activities_city_category_idx on public.activities(city, category);
create index activities_host_id_idx on public.activities(host_id);
create index invitations_receiver_status_idx on public.invitations(receiver_id, status);
create index invitations_sender_idx on public.invitations(sender_id);
create index attendees_user_idx on public.activity_attendees(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger activities_set_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  base_handle text;
  initial_letters text;
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'New member');
  base_handle := lower(regexp_replace(display_name, '[^a-zA-Z0-9]+', '', 'g'));
  if char_length(base_handle) < 2 then base_handle := 'member'; end if;
  initial_letters := upper(left(split_part(display_name, ' ', 1), 1) || left(split_part(display_name, ' ', 2), 1));

  insert into public.profiles (
    id,
    name,
    handle,
    city,
    initials,
    interests,
    availability,
    connection_goals
  ) values (
    new.id,
    display_name,
    left(base_handle, 22) || '_' || left(replace(new.id::text, '-', ''), 6),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(nullif(initial_letters, ''), '?'),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'interests')), '{}'),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'availability')), '{}'),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'connection_goals')), '{}')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Serialize joins on the activity row so concurrent requests cannot overbook.
create or replace function public.enforce_activity_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_capacity integer;
  current_attendees integer;
begin
  select activity.capacity
    into max_capacity
    from public.activities activity
   where activity.id = new.activity_id
   for update;

  select count(*)
    into current_attendees
    from public.activity_attendees attendee
   where attendee.activity_id = new.activity_id;

  if current_attendees >= max_capacity then
    raise exception 'This activity is full.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger activity_capacity_guard
before insert on public.activity_attendees
for each row execute function public.enforce_activity_capacity();

create or replace function public.add_activity_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_attendees (activity_id, user_id)
  values (new.id, new.host_id);
  return new;
end;
$$;

create trigger new_activity_adds_host
after insert on public.activities
for each row execute function public.add_activity_host();

-- Accepting an invitation and joining are one database transaction.
create or replace function public.add_accepted_invitee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    if not exists (
      select 1 from public.activity_attendees attendee
      where attendee.activity_id = new.activity_id and attendee.user_id = new.receiver_id
    ) then
      insert into public.activity_attendees (activity_id, user_id)
      values (new.activity_id, new.receiver_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger accepted_invitation_adds_attendee
after update of status on public.invitations
for each row execute function public.add_accepted_invitee();

alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_attendees enable row level security;
alter table public.invitations enable row level security;
alter table public.saved_activities enable row level security;

create policy "authenticated members can discover profiles"
on public.profiles for select
to authenticated
using (true);

create policy "members update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "members see relevant activities"
on public.activities for select
to authenticated
using (
  visibility = 'community'
  or host_id = auth.uid()
  or exists (
    select 1 from public.invitations invitation
    where invitation.activity_id = activities.id
      and invitation.receiver_id = auth.uid()
  )
);

create policy "members create their own activities"
on public.activities for insert
to authenticated
with check (host_id = auth.uid());

create policy "hosts update their activities"
on public.activities for update
to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

create policy "hosts delete their activities"
on public.activities for delete
to authenticated
using (host_id = auth.uid());

create policy "members see attendees on visible activities"
on public.activity_attendees for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.activities activity
    where activity.id = activity_attendees.activity_id
      and (
        activity.visibility = 'community'
        or activity.host_id = auth.uid()
        or exists (
          select 1 from public.invitations invitation
          where invitation.activity_id = activity.id
            and invitation.receiver_id = auth.uid()
        )
      )
  )
);

create policy "members join eligible activities"
on public.activity_attendees for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.activities activity
    where activity.id = activity_attendees.activity_id
      and (
        activity.host_id = auth.uid()
        or activity.visibility = 'community'
        or exists (
          select 1 from public.invitations invitation
          where invitation.activity_id = activity.id
            and invitation.receiver_id = auth.uid()
            and invitation.status = 'accepted'
        )
      )
  )
);

create policy "members leave activities"
on public.activity_attendees for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.activities activity
    where activity.id = activity_attendees.activity_id and activity.host_id = auth.uid()
  )
);

create policy "participants see their invitations"
on public.invitations for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "hosts send invitations"
on public.invitations for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.activities activity
    where activity.id = invitations.activity_id and activity.host_id = auth.uid()
  )
);

create policy "participants respond or cancel"
on public.invitations for update
to authenticated
using (status = 'pending' and (sender_id = auth.uid() or receiver_id = auth.uid()))
with check (
  (sender_id = auth.uid() and status = 'cancelled')
  or (receiver_id = auth.uid() and status in ('accepted', 'declined'))
);

create policy "members see their saved activities"
on public.saved_activities for select
to authenticated
using (user_id = auth.uid());

create policy "members save activities"
on public.saved_activities for insert
to authenticated
with check (user_id = auth.uid());

create policy "members remove saved activities"
on public.saved_activities for delete
to authenticated
using (user_id = auth.uid());

-- Limit client-side invitation updates to status/timestamp fields.
revoke update on public.invitations from authenticated;
grant update (status, responded_at) on public.invitations to authenticated;
