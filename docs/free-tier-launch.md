# ViraFlow Free-Tier Launch Plan

This is the first production step for making ViraFlow real while keeping the monthly cost at $0 during MVP testing.

## Stack

- Firebase Spark Plan: Auth, Firestore, realtime user data, likes, comments, follows, notifications, and chat records.
- Cloudinary Free Tier: profile images, stories, reels, marketplace images, generated AI assets, compression, CDN delivery, and adaptive `q_auto,f_auto` URLs.
- Expo Free: local testing and free EAS limits.
- Render/Vercel/Netlify Free: backend hosting for API routes that must protect secrets.

## What Was Added

- Backend Firebase Admin bootstrap in `backend/src/services/firebaseService.ts`.
- Mobile Firebase client bootstrap in `mobile/src/services/firebaseClient.ts`.
- Backend Cloudinary signed upload endpoint at `POST /api/media/cloudinary/signature`.
- Backend uploaded media moderation endpoint at `POST /api/media/moderation/check`.
- Mobile Cloudinary upload helper in `mobile/src/services/mediaUpload.ts`.
- Mobile Firebase content service in `mobile/src/services/firebaseContent.ts`.
- Environment templates for Firebase and Cloudinary keys.

## Required Accounts

1. Create a Firebase project.
2. Enable Firebase Authentication with email/password.
3. Create a Firestore database.
4. Create a Cloudinary account.
5. Copy Cloudinary cloud name, API key, and API secret.

## Backend Environment

Copy `backend/.env.example` to `backend/.env` and fill:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=viraflow
```

Keep `CLOUDINARY_API_SECRET` and `FIREBASE_PRIVATE_KEY` only on the backend. Never put them in Expo/mobile env files.

## Mobile Environment

Copy `mobile/.env.example` to `mobile/.env` and fill:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IP:4000/api
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

These Firebase web config values are safe to expose. Security comes from Firebase Auth and Firestore security rules.

## Cloudinary Upload Flow

1. Mobile asks backend for a signed upload.
2. Backend signs the request using `CLOUDINARY_API_SECRET`.
3. Mobile uploads the file directly to Cloudinary.
4. Mobile asks the backend moderation endpoint to check the uploaded media.
5. Mobile stores the returned Cloudinary URL in Firestore or sends it to the backend API.

This avoids sending large video files through the Express backend and keeps the API cheap.

## Adaptive Delivery

Use Cloudinary URLs with:

```text
q_auto,f_auto
```

Examples:

```text
q_auto:eco,f_auto,w_480
q_auto:good,f_auto,w_1080
```

This gives the app an Instagram-style feel by letting Cloudinary choose a good format and quality for the user connection/device.

## Firestore MVP Collections

The current Firebase MVP slice writes:

```text
users/{uid}
stories/{storyId}
reels/{reelId}
products/{productId}
comments/{commentId}
communities/{communityId}
communityPosts/{postId}
savedPosts/{savedPostId}
notifications/{notificationId}
devicePushTokens/{tokenId}
directThreads/{threadId}
directMessages/{messageId}
marketplaceThreads/{threadId}
marketplaceMessages/{messageId}
marketplaceOrders/{orderId}
communityChatMessages/{messageId}
subscriptions/{userId}
reelBoosts/{boostId}
```

Use the tighter signed-in rules below for the current production-oriented setup. Notification records and Expo push delivery now go through the trusted backend, while the mobile app only reads its own notifications and stores its own device token:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
    }

    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    match /reels/{reelId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
    }

    match /products/{productId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    match /comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    match /communities/{communityId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }

    match /communityPosts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
      allow update: if request.auth != null && resource.data.authorId == request.auth.uid;
    }

    match /savedPosts/{savedPostId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if false;
      allow update: if request.auth != null &&
        resource.data.userId == request.auth.uid &&
        request.resource.data.userId == resource.data.userId &&
        request.resource.data.diff(resource.data).changedKeys().hasOnly(["readAt"]);
    }

    match /devicePushTokens/{tokenId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null &&
        resource.data.userId == request.auth.uid &&
        request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    match /directThreads/{threadId} {
      allow read: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
      allow create: if request.auth != null && request.resource.data.participantIds.hasAny([request.auth.uid]);
      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
    }

    match /directMessages/{messageId} {
      allow read: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
      allow create: if request.auth != null &&
        request.resource.data.senderId == request.auth.uid &&
        request.resource.data.participantIds.hasAny([request.auth.uid]);
      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
    }

    match /marketplaceThreads/{threadId} {
      allow read: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
      allow create: if request.auth != null && request.resource.data.participantIds.hasAny([request.auth.uid]);
      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
    }

    match /marketplaceMessages/{messageId} {
      allow read: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
      allow create: if request.auth != null &&
        request.resource.data.senderId == request.auth.uid &&
        request.resource.data.participantIds.hasAny([request.auth.uid]);
      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
    }

    match /marketplaceOrders/{orderId} {
      allow read: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
      allow create: if request.auth != null &&
        request.resource.data.buyerId == request.auth.uid &&
        request.resource.data.participantIds.hasAny([request.auth.uid]);
      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
    }

    match /communityChatMessages/{messageId} {
      allow read: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
      allow create: if request.auth != null &&
        request.resource.data.senderId == request.auth.uid &&
        request.resource.data.participantIds.hasAny([request.auth.uid]);
      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]);
    }

    match /subscriptions/{userId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    match /reelBoosts/{boostId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

Before production, keep notification creation and push delivery behind trusted backend or Cloud Function endpoints only. The mobile app should never read another user's push tokens or create notifications for another user directly.

## Completed Real Slices

1. Firebase Auth register/login.
2. Firestore `users` profiles.
3. Cloudinary profile photo upload.
4. Firestore profile updates.
5. Cloudinary story image upload plus Firestore `stories`.
6. Cloudinary marketplace image upload plus Firestore `products`.
7. Cloudinary reel video upload plus Firestore `reels`.
8. Firestore likes, comments, repost counts, and follows with realtime listeners.
9. Firestore saved posts and notifications with realtime listeners.
10. Firestore direct chat, marketplace chat, group chat messages, and message receipts.
11. Firestore marketplace orders plus pages, groups, channels, and community posts.
12. Expo push registration plus Firestore-backed subscriptions and reel boosts.

## Next Implementation Step

Keep hardening the Firebase launch path:

1. Production-grade security rules or trusted Cloud Function writes.
2. Push delivery moved to a trusted backend or Cloud Function.
3. Real AI API integrations.
4. Stripe checkout and paid boost payments.

## Push Notification Testing

- `expo-notifications` local notifications work in Expo Go.
- Remote push notifications on Android need a development build and a valid Expo project ID.
- Add `EXPO_PUBLIC_EXPO_PROJECT_ID` to `mobile/.env` when you are ready to test remote push.
- The Expo manifest should also carry the same EAS project ID so `Constants.expoConfig?.extra?.eas?.projectId` resolves correctly in development builds.
- Android remote push also needs Expo/EAS FCM v1 credentials uploaded for the `com.viraflow.app` application identifier.

### Android Remote Push Checklist

1. Add `EXPO_PUBLIC_EXPO_PROJECT_ID` to `mobile/.env`.
2. Sign in to Expo/EAS and link the project:

```bash
npx eas-cli@latest login
npx eas-cli@latest project:init
```

3. In Firebase Console, open the same Firebase project used by ViraFlow and create or reuse a Service Account key from:
   - `Project settings` -> `Service accounts` -> `Generate new private key`
4. Upload the JSON key to EAS for Android push:

```bash
npx eas-cli@latest credentials
```

Then choose:

- `Android`
- `production`
- `Google Service Account`
- `Manage your Google Service Account Key for Push Notifications (FCM V1)`
- `Upload a new service account key`

5. Build and install a real Android development build:

```bash
npx eas-cli@latest build --platform android --profile development
```

6. Open the development build on a real phone, sign in, and confirm the device stores an Expo push token in Firestore under `devicePushTokens`.

Expo's official setup guide confirms that Android remote push needs both a development build and FCM credentials configured through EAS. Source: https://docs.expo.dev/push-notifications/using-fcm and https://docs.expo.dev/push-notifications/fcm-credentials
