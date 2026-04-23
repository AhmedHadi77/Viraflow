# ViraFlow AI Setup

## What is implemented

- Text AI tools for captions, scripts, and product copy
- Image generation flow
- Video generation job flow with async polling
- Viral AI content engine that returns script, captions, AI voice, video job, and viral score insights
- Trend Hijacker AI feed that lets premium users pick a trend and generate a similar video direction, matching music vibe, and optimized captions
- AI Avatar Creator that turns one uploaded photo into anime, cartoon, influencer-style portraits and a talking avatar video job
- Why Did This Fail? audit that accepts a real uploaded video, generates frame thumbnails on-device, creates an auto-transcript, and returns an AI retention graph plus hook/caption feedback
- Demo fallback when the backend or OpenAI key is not configured

## Backend environment

Copy `backend/.env.example` to `backend/.env` and set:

- `OPENAI_API_KEY`
- `OPENAI_MODERATION_MODEL`
- `OPENAI_TEXT_MODEL`
- `OPENAI_IMAGE_MODEL`
- `OPENAI_VIDEO_MODEL`
- `OPENAI_VOICE_MODEL`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_DEFAULT_VOICE`

Suggested defaults already included:

- `OPENAI_MODERATION_MODEL=omni-moderation-latest`
- `OPENAI_TEXT_MODEL=gpt-5.4`
- `OPENAI_IMAGE_MODEL=gpt-image-1.5`
- `OPENAI_VIDEO_MODEL=sora-2`
- `OPENAI_VOICE_MODEL=gpt-4o-mini-tts`
- `OPENAI_TRANSCRIPTION_MODEL=whisper-1`
- `OPENAI_DEFAULT_VOICE=coral`

## Mobile environment

Copy `mobile/.env.example` to `mobile/.env` and set:

- `EXPO_PUBLIC_API_BASE_URL=http://YOUR-PC-IP:4000/api`

Use your computer's LAN IP address so Expo Go on your phone can reach the backend.

Example:

- `http://192.168.0.38:4000/api`

## Start the backend

```powershell
cd D:\Viraflow1
npm.cmd --workspace backend run dev
```

## Start the mobile app

```powershell
cd D:\Viraflow1
npm.cmd start -- --clear
```

## AI endpoints

- `GET /api/ai/status`
- `POST /api/ai/text`
- `POST /api/ai/image`
- `POST /api/ai/video`
- `GET /api/ai/video/:id`
- `GET /api/ai/video/:id/content`
- `POST /api/ai/failure-audit`
- `GET /api/ai/trends`
- `POST /api/ai/trends/hijack`
- `POST /api/ai/avatars/create`
- `POST /api/ai/viral-engine`
- `GET /api/ai/viral-engine/:id/voice`

## Notes

- If the backend is unreachable, the mobile app automatically falls back to demo mode.
- Demo mode still lets you test the UI, image preview flow, and video-job polling behavior.
- Live AI voice uses OpenAI's text-to-speech API. The app should disclose to users that the narration is AI-generated before publishing.
- Trend Hijacker AI is gated in the mobile app to monthly premium and yearly plans.
- Avatar Creator uses photo upload from Expo Image Picker on mobile and supports pay-per-avatar or premium-plan monetization in the UI.
- The failure-audit endpoint expects `multipart/form-data` with a `video` file plus the reel metadata fields.
- The retention graph is AI-estimated from the uploaded video transcript and the creator metadata you provide. It is not the same as a platform-native analytics graph from TikTok or Instagram.
- Server-side media moderation now scans avatar source images, uploaded audit videos, reel videos, reel thumbnails, profile images, and marketplace images when `OPENAI_API_KEY` is configured.
- Video moderation works by sampling multiple frames on the server and running image moderation against those frames.
- According to OpenAI's video generation guide, the Sora 2 Videos API and `sora-2`/`sora-2-pro` are deprecated and scheduled to shut down on September 24, 2026, so treat the video path as a currently available but time-sensitive integration.
