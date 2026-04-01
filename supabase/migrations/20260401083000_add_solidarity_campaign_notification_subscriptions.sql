create table if not exists public.solidarity_campaign_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.solidarity_campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists solidarity_campaign_notification_subscriptions_campaign_idx
  on public.solidarity_campaign_notification_subscriptions (campaign_id);

create index if not exists solidarity_campaign_notification_subscriptions_user_idx
  on public.solidarity_campaign_notification_subscriptions (user_id);

alter table public.solidarity_campaign_notification_subscriptions enable row level security;

create policy "Users can view own solidarity notification subscriptions"
  on public.solidarity_campaign_notification_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Contributors can subscribe to solidarity campaign updates"
  on public.solidarity_campaign_notification_subscriptions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.solidarity_contributions contribution
      where contribution.campaign_id = campaign_id
        and contribution.contributor_id = auth.uid()
    )
  );

create policy "Users can unsubscribe from own solidarity updates"
  on public.solidarity_campaign_notification_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant all on public.solidarity_campaign_notification_subscriptions to authenticated;
grant all on public.solidarity_campaign_notification_subscriptions to service_role;