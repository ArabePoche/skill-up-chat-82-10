-- Galerie de medias pour les cagnottes solidaires
-- Permet au createur d'ajouter des images/videos de preuves et d'explications

create table if not exists public.solidarity_campaign_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.solidarity_campaigns(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists solidarity_campaign_media_campaign_id_idx
  on public.solidarity_campaign_media (campaign_id, position);

-- RLS
alter table public.solidarity_campaign_media enable row level security;

-- Tout le monde peut voir les medias des cagnottes approuvees
create policy "solidarity_campaign_media_select"
  on public.solidarity_campaign_media for select
  using (
    exists (
      select 1 from public.solidarity_campaigns c
      where c.id = campaign_id
        and (
          c.status = 'approved'
          or c.creator_id = auth.uid()
        )
    )
  );

-- Seul le createur de la cagnotte peut ajouter des medias
create policy "solidarity_campaign_media_insert"
  on public.solidarity_campaign_media for insert
  with check (
    uploader_id = auth.uid()
    and exists (
      select 1 from public.solidarity_campaigns c
      where c.id = campaign_id
        and c.creator_id = auth.uid()
    )
  );

-- Seul le createur peut supprimer ses medias
create policy "solidarity_campaign_media_delete"
  on public.solidarity_campaign_media for delete
  using (uploader_id = auth.uid());
