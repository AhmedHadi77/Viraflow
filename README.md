# ViraFlow

ViraFlow is an MVP social commerce app built around one promise:

Create + Go Viral + Make Money

This starter repo is organized as a monorepo with:

- `mobile`: Expo React Native app with the MVP user flow and mock state
- `backend`: Express API with starter routes, Firebase-ready auth support, and Cloudinary upload signing
- `docs`: roadmap and product notes

## MVP Included

- Splash screen
- Multi-language choice screen
- Login and register flow
- Protected app shell
- Bottom tabs: Home, Reels, Create, Marketplace, Profile
- Reels feed with like, comment, repost, follow
- Marketplace browsing and product publishing
- Profile view and edit flow
- Subscription UI for weekly, monthly premium, and yearly plans
- AI tools workspace for text, image, video, viral engine, Trend Hijacker, and Avatar Creator flows
- Real-time chat polish including typing indicators, read receipts, delivery states, unread badges, and last-seen presence
- Notifications inbox

## Project Structure

```text
viraflow1/
  mobile/
  backend/
  docs/
```

## Mobile Stack

- Expo + React Native + TypeScript
- React Navigation
- AsyncStorage for local language and session persistence
- Firebase client bootstrap for the free-tier Auth/Firestore migration
- Cloudinary direct-upload helper for images and videos

## Backend Stack

- Node.js + Express + TypeScript
- In-memory mock data for fast MVP development
- Optional Firebase Admin token verification for the free-tier Auth/Firestore migration
- Cloudinary signed upload endpoint so API secrets never ship to the phone

## Key Screens

- Splash
- Choose Language
- Login
- Register
- Home
- Reels Feed
- Create Post
- Marketplace
- Profile
- Reel Details
- Product Details
- Edit Profile
- Subscription
- AI Tools Workspace
- Notifications Placeholder

## API Endpoints

- `GET /api/meta/health`
- `GET /api/meta/languages`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/profiles/me`
- `PATCH /api/profiles/me`
- `GET /api/profiles/users/:id`
- `POST /api/profiles/users/:id/follow`
- `GET /api/reels`
- `GET /api/reels/:id`
- `POST /api/reels`
- `POST /api/reels/:id/like`
- `POST /api/reels/:id/comments`
- `POST /api/reels/:id/repost`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `GET /api/media/status`
- `POST /api/media/cloudinary/signature`
- `GET /api/ai/status`
- `POST /api/ai/text`
- `POST /api/ai/image`
- `POST /api/ai/video`
- `GET /api/ai/video/:id`
- `GET /api/ai/video/:id/content`
- `GET /api/ai/trends`
- `POST /api/ai/trends/hijack`
- `POST /api/ai/avatars/create`
- `POST /api/ai/viral-engine`
- `GET /api/ai/viral-engine/:id/voice`
- `GET /api/subscriptions/plans`
- `GET /api/subscriptions/me`
- `POST /api/subscriptions/checkout-session`

## Local Setup

1. Install dependencies at the repo root:

```bash
npm install
```

2. Start the backend:

```bash
npm run backend:dev
```

3. Start the mobile app:

```bash
npm run mobile:start
```

## AI Setup

- Backend AI env values are documented in `backend/.env.example`.
- Mobile Expo env values are documented in `mobile/.env.example`.
- Full AI setup notes live in `docs/ai-setup.md`.
- If those env values are not configured, the app falls back to demo mode automatically.

## Free-Tier Launch Setup

- The free Firebase + Cloudinary migration plan lives in `docs/free-tier-launch.md`.
- Firebase Spark Plan is the target for Auth, Firestore data, and realtime records.
- Cloudinary Free Tier is the target for profile photos, stories, reels, product images, and adaptive video delivery.
- The backend signs Cloudinary uploads at `POST /api/media/cloudinary/signature`; the mobile app uploads files directly to Cloudinary.

## Notes

- The mobile app currently uses mock data and local state so the flow is easy to iterate on.
- The backend uses mock persistence to define contracts before real database wiring.
- Stripe and production storage still need a later pass, but Cloudinary upload signing is now scaffolded for the free-tier storage path.
- AI text, image, video, and viral engine flows are now scaffolded, but live results require backend env setup.
- The viral engine generates script, captions, AI voice preview, video job, viral score, best posting time, and target audience guidance from one prompt.
- Trend Hijacker AI lets premium users browse trend cards, tap `Use this trend`, and get a similar video direction, matching music vibe, and optimized captions.
- Avatar Creator lets users upload a photo and generate anime, cartoon, influencer-style portraits plus a talking avatar render job.
- Server-side media moderation blocks sexual images and sampled video frames for avatar uploads, failure-audit uploads, reel media, profile images, and marketplace images when the backend is configured with `OPENAI_API_KEY`.
- The mobile `Create`, `Marketplace`, and `Edit Profile` flows now use the Express API when `EXPO_PUBLIC_API_BASE_URL` is configured, so backend moderation is visible in the normal app flow instead of only inside AI tools.

## Suggested Next Moves

1. Create Firebase and Cloudinary free accounts and fill the env files.
2. Migrate Firebase Auth register/login and Firestore user profiles.
3. Wire Cloudinary profile photo upload into the profile screens.
4. Migrate stories, reels, marketplace posts, comments, likes, follows, and chat to Firestore.
5. Add native video compression before Cloudinary upload.
6. Persist AI generations so creators can publish them directly into reels or marketplace posts.
