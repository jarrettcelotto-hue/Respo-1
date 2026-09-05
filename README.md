# AI YouTube Auto-Poster

An app where you sign up, configure a "channel" (what the videos are about, how
long they are, how often to post), and the system automatically writes a
script, generates visuals and narration, assembles a video, and posts it to
your real YouTube channel on a schedule.

## How it's built

```
/server   Node + TypeScript + Express + Prisma (Postgres) + BullMQ (Redis)
/mobile   Expo + React Native + TypeScript
```

Posting on a recurring schedule can't live only on a phone (phone OSes kill
background tasks), so the **server** is the thing that actually generates and
posts videos, on a schedule, whether or not the app is open. The **mobile
app** is the control panel: sign up, configure your channel, connect YouTube,
and watch status/history.

### Pipeline (what happens for each video)

1. **Script** -- Claude (Anthropic API) writes a title, description, tags, and
   a scene-by-scene narration sized to your configured video length and niche.
2. **Visuals** -- each scene's `imageQuery` is used to pull a matching stock
   photo from Pexels.
3. **Narration** -- the full script is sent to ElevenLabs for text-to-speech.
4. **Assembly** -- `ffmpeg` turns the images (with a slow Ken-Burns zoom) and
   narration into an MP4.
5. **Upload** -- the video is uploaded straight to your connected YouTube
   channel via the YouTube Data API.

Every step updates the video's status so the app can show live progress, and
if a step fails the video is marked `FAILED` with the error instead of the
whole pipeline silently dying.

## Accounts/keys you need to create

I can't create third-party accounts on your behalf, so before this can post a
real video you'll need to set up:

1. **Anthropic API key** (script generation) -- [console.anthropic.com](https://console.anthropic.com)
2. **Pexels API key** (free, stock imagery) -- [pexels.com/api](https://www.pexels.com/api)
3. **ElevenLabs API key** (narration) -- [elevenlabs.io](https://elevenlabs.io). Want a
   different TTS provider instead? Swap the implementation in
   `server/src/pipeline/tts.ts` -- it's a single `synthesizeNarration()` function.
4. **Google Cloud OAuth client** (YouTube upload):
   - Create a project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable the **YouTube Data API v3**
   - Configure the OAuth consent screen (add the `youtube.upload` and
     `youtube.readonly` scopes). Google keeps new apps in **Testing** mode,
     limited to test users you explicitly add by email -- that's enough for
     you to use it yourself. Submitting for verification is only needed once
     you want other people to connect their own channels.
   - Create an OAuth **Client ID** of type **Web application**, and add an
     Authorized redirect URI matching `GOOGLE_REDIRECT_URI` below (e.g.
     `https://your-server-domain/youtube/callback`). `localhost` only works
     while you're testing from the same machine the server runs on.
5. **Postgres + Redis**, and somewhere to actually run the server long-term
   (it needs to be up 24/7 to post on schedule) -- e.g. Neon or Supabase for
   Postgres, Upstash for Redis, and Render/Railway/Fly.io/a VPS for the
   server + worker processes. All of these have free tiers big enough to try
   this out.

None of these are hardcoded anywhere -- everything above is an environment
variable (see `server/.env.example`), and `.env` files are gitignored.

## Running it locally

### Server

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY at minimum
npm install
npm run prisma:migrate  # creates the tables
npm run dev              # API on http://localhost:4000
npm run worker:dev        # in another terminal: the pipeline worker + scheduler
```

The API server will boot and serve `/health` even before you've added the
Anthropic/Pexels/ElevenLabs/Google keys -- you'll only hit an error from a
specific missing key once a pipeline step that needs it actually runs, and
the error tells you exactly which env var to set.

### Mobile app

```bash
cd mobile
cp .env.example .env   # point EXPO_PUBLIC_API_URL at your running server
npm install
npm start                # opens Expo dev tools -- scan the QR with Expo Go,
                          # or press i / a for a simulator
```

If you're testing on a physical phone, `localhost` in `EXPO_PUBLIC_API_URL`
won't reach your laptop's server -- use your machine's LAN IP (or a tunnel
like `ngrok`) instead, and make sure `GOOGLE_REDIRECT_URI` and
`CORS_ORIGIN` on the server match wherever things are actually running.

## What's intentionally out of scope for this first pass

- Multiple channels per user (the data model supports it; the app UI is
  built around one channel to keep onboarding simple)
- Burned-in captions, background music, crossfade transitions between scenes
  (`server/src/pipeline/assemble.ts` has comments marking where to add these)
- Push notifications when a video finishes/fails
- Billing/subscriptions, admin dashboard, moderation
