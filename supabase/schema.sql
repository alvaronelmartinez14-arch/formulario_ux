create table if not exists public.travel_packages (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    title text not null,
    destination_country text not null,
    departure_city text not null,
    departure_date date not null,
    return_date date not null,
    travelers integer not null check (travelers >= 1),
    price_per_person numeric(12, 2) not null check (price_per_person >= 0),
    transport text not null check (transport in ('avion', 'terrestre', 'ninguno')),
    accommodation text not null,
    services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
    description text not null,
    availability text not null default 'borrador' check (availability in ('borrador', 'disponible', 'agotado')),
    poster_path text,
    created_at timestamptz not null default now(),
    check (return_date >= departure_date)
);

alter table public.travel_packages enable row level security;

grant select, insert, update, delete on public.travel_packages to authenticated;
revoke all on public.travel_packages from anon;

drop policy if exists "Owners can read their travel packages" on public.travel_packages;
create policy "Owners can read their travel packages"
    on public.travel_packages for select to authenticated
    using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can create their travel packages" on public.travel_packages;
create policy "Owners can create their travel packages"
    on public.travel_packages for insert to authenticated
    with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their travel packages" on public.travel_packages;
create policy "Owners can update their travel packages"
    on public.travel_packages for update to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their travel packages" on public.travel_packages;
create policy "Owners can delete their travel packages"
    on public.travel_packages for delete to authenticated
    using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'package-posters',
    'package-posters',
    false,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "Users manage their package posters" on storage.objects;
create policy "Users manage their package posters"
    on storage.objects for all to authenticated
    using (
        bucket_id = 'package-posters'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    )
    with check (
        bucket_id = 'package-posters'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );