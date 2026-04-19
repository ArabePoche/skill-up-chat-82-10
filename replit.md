# REZO - Plateforme éducative interactive

## Overview
A large-scale educational platform (migrated from Lovable) built with React/Vite and Supabase. Features include:
- School management (students, teachers, grades, payments)
- Formation/courses with lessons, exercises, and live sessions
- Marketplace and shops
- Wallet system (Soumboulah Cash, Soumboulah Bonus, Habbah currencies)
- Live streaming with Agora RTC
- Social features (conversations, posts, stories, stickers)
- CV builder and job applications
- Solidarity campaigns
- Admin dashboard with analytics

## Architecture
- **Frontend**: React 18 + TypeScript + Vite (port 5000)
- **Backend/DB**: Supabase (PostgreSQL with RLS, Edge Functions, realtime subscriptions)
- **UI**: Tailwind CSS + shadcn/ui components
- **Auth**: Supabase Auth with localStorage persistence
- **PWA**: vite-plugin-pwa with workbox service worker
- **Mobile**: Capacitor (Android)

## Key Files
- `src/integrations/supabase/client.ts` — Supabase client (uses env vars)
- `src/integrations/supabase/types.ts` — Auto-generated DB types (12k lines)
- `vite.config.ts` — Vite configuration (port 5000, PWA)
- `src/App.tsx` — Root component with routing

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous (public) key

## Running
- Dev server: `npm run dev` (starts on port 5000)
- Build: `npm run build`
- Preview: `npm run preview`

## Migration Notes
- Migrated from Lovable to Replit in April 2026
- Supabase credentials moved from hardcoded values to env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- `lovable-tagger` plugin removed from vite.config.ts and package.json
- Vite server configured for Replit (host: 0.0.0.0, port: 5000, allowedHosts: true)
- 274 Supabase migration files in `supabase/migrations/` document the full DB schema
