# ViraFlow

Pulseora (ViraFlow) is a social commerce app built around one promise:

Create + Go Viral + Make Money

This starter repo is organized as a monorepo with:

- `mobile`: Expo React Native app (Firebase Auth + Firestore, Cloudinary media)
- `backend`: Express API for Stripe checkout + webhooks, Cloudinary upload signing, AI tools, and push delivery
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
- If `OPENAI_API_KEY` is not set on the backend, AI endpoints return 503 and the app shows "AI is offline". No sample output is ever generated.

## Free-Tier Launch Setup

- The free Firebase + Cloudinary migration plan lives in `docs/free-tier-launch.md`.
- Firebase Spark Plan is the target for Auth, Firestore data, and realtime records.
- Cloudinary Free Tier is the target for profile photos, stories, reels, product images, and adaptive video delivery.
- The backend signs Cloudinary uploads at `POST /api/media/cloudinary/signature`; the mobile app uploads files directly to Cloudinary.

## Production rules (no demo data)

- The app ships with **no seed or sample content**. Every user, reel, post, product, community, chat and notification comes from Firestore.
- Premium plans and reel boosts are activated **only by the backend after Stripe confirms payment** (webhook at `POST /api/payments/stripe/webhook`). Firestore rules block clients from writing `subscriptions`, `reelBoosts`, `role`, `planType` or view counters directly.
- A paid boost gives the reel priority placement in Reels and Explore until it ends (`boostedUntil` on the reel). It never adds fake views; views/reach count real viewers only.
- AI trends are computed from hashtags actually used on Pulseora in the last 14 days.

## Payments switch

Stripe is not connected yet, so `PAYMENTS_ENABLED` in `mobile/src/data/catalog.ts` is `false`: the Subscription and Boost screens are hidden and every AI tool is open to signed-in users (the backend skips the premium check while `STRIPE_SECRET_KEY` is empty). To launch paid plans later, set the Stripe values on the backend, flip the flag to `true`, and rebuild the APK.

## Release checklist

1. Deploy the Firestore rules: `npm run firebase:deploy:rules`.
2. On the Render backend set `OPENAI_API_KEY` (for AI tools) plus Firebase admin and Cloudinary values. Later, for payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PRICE_WEEKLY/MONTHLY/YEARLY`, `STRIPE_PRICE_BOOST_STARTER/GROWTH/VIRAL`, Firebase admin and Cloudinary values. Redeploy the backend.
3. (When payments are enabled) In Stripe, point a webhook at `https://<backend>/api/payments/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.deleted`.
4. Build the APK: `powershell -ExecutionPolicy Bypass -File D:\Viraflow1\build-apk.ps1` (builds `mobile/android`, signed with the release keystore).

The `android/` folder at the repo root is an older native project; the APK is built from `mobile/android`.
