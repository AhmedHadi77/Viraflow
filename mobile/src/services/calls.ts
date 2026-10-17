import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { PermissionsAndroid, Platform, Vibration } from "react-native";
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";
import { getFirebaseClientFirestore } from "./firebaseClient";
import { getPublicEnv } from "./publicEnv";

// Free 1-to-1 voice and video calls. Audio/video flows peer to peer with WebRTC; Firestore only carries the
// small "signalling" messages (offer, answer, network candidates) so the two phones can find each other.

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "accepted" | "declined" | "ended" | "missed" | "cancelled" | "failed";

export interface CallRecord {
  id: string;
  callerId: string;
  calleeId: string;
  participantIds: string[];
  type: CallType;
  status: CallStatus;
  createdAt: string;
  answeredAt?: string;
  endedAt?: string;
  endedBy?: string;
  durationSeconds?: number;
  offer?: { type: string; sdp: string };
  answer?: { type: string; sdp: string };
}

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "connected" | "ended";

export interface CallState {
  callId: string | null;
  role: "caller" | "callee" | null;
  phase: CallPhase;
  type: CallType;
  peerId: string | null;
  localStreamUrl: string | null;
  remoteStreamUrl: string | null;
  micMuted: boolean;
  cameraOff: boolean;
  connectedAt: number | null;
  endReason: CallStatus | null;
  error: string | null;
}

const CALLS_COLLECTION = "calls";
const RING_TIMEOUT_MS = 45_000;
const STALE_RING_MS = 60_000;
const DISCONNECT_GRACE_MS = 12_000;

const idleState: CallState = {
  callId: null,
  role: null,
  phase: "idle",
  type: "audio",
  peerId: null,
  localStreamUrl: null,
  remoteStreamUrl: null,
  micMuted: false,
  cameraOff: false,
  connectedAt: null,
  endReason: null,
  error: null,
};

let state: CallState = idleState;
const listeners = new Set<() => void>();

let peer: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let cleanupFns: Array<() => void> = [];
// Network candidates that arrive before the other side's offer/answer is applied wait here.
let pendingCandidates: any[] = [];
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

function setState(next: Partial<CallState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function useCallState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}

export function getCallState() {
  return state;
}

function requireDb() {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Calls need an internet connection and a signed-in account.");
  }
  return db;
}

function buildIceServers() {
  const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  ];
  // Optional relay server for networks that block direct connections (set in app.json extra.publicEnv).
  const turnUrls = getPublicEnv("EXPO_PUBLIC_TURN_URLS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: getPublicEnv("EXPO_PUBLIC_TURN_USERNAME") || undefined,
      credential: getPublicEnv("EXPO_PUBLIC_TURN_CREDENTIAL") || undefined,
    });
  }
  return servers;
}

export async function ensureCallPermissions(type: CallType) {
  if (Platform.OS !== "android") {
    return true;
  }
  const wanted = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (type === "video") {
    wanted.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  }
  const result = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

function normalizeCall(id: string, data: Record<string, unknown>): CallRecord {
  return {
    id,
    callerId: String(data.callerId ?? ""),
    calleeId: String(data.calleeId ?? ""),
    participantIds: Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [],
    type: data.type === "video" ? "video" : "audio",
    status: (typeof data.status === "string" ? data.status : "ended") as CallStatus,
    createdAt: String(data.createdAt ?? new Date(0).toISOString()),
    answeredAt: typeof data.answeredAt === "string" ? data.answeredAt : undefined,
    endedAt: typeof data.endedAt === "string" ? data.endedAt : undefined,
    endedBy: typeof data.endedBy === "string" ? data.endedBy : undefined,
    durationSeconds: typeof data.durationSeconds === "number" ? data.durationSeconds : undefined,
    offer: data.offer as CallRecord["offer"],
    answer: data.answer as CallRecord["answer"],
  };
}

export async function getCall(callId: string) {
  const snapshot = await getDoc(doc(requireDb(), CALLS_COLLECTION, callId));
  return snapshot.exists() ? normalizeCall(snapshot.id, snapshot.data()) : null;
}

async function openLocalMedia(type: CallType) {
  const stream = (await mediaDevices.getUserMedia({
    audio: true,
    video: type === "video" ? { facingMode: "user", frameRate: 30, width: 1280, height: 720 } : false,
  })) as MediaStream;
  localStream = stream;
  setState({ localStreamUrl: type === "video" ? stream.toURL() : null });
  return stream;
}

function createPeer(callId: string, candidateCollection: "callerCandidates" | "calleeCandidates") {
  const db = requireDb();
  const connection = new RTCPeerConnection({ iceServers: buildIceServers() });
  peer = connection;
  const events = connection as unknown as {
    addEventListener: (name: string, handler: (event: any) => void) => void;
  };

  events.addEventListener("icecandidate", (event) => {
    if (event?.candidate) {
      void addDoc(collection(db, CALLS_COLLECTION, callId, candidateCollection), event.candidate.toJSON()).catch(
        () => undefined
      );
    }
  });

  events.addEventListener("track", (event) => {
    const stream: MediaStream | undefined = event?.streams?.[0];
    if (stream) {
      remoteStream = stream;
      setState({ remoteStreamUrl: stream.toURL() });
    }
  });

  events.addEventListener("connectionstatechange", () => {
    const connectionState = connection.connectionState;
    if (connectionState === "connected") {
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
      if (state.phase !== "connected") {
        setState({ phase: "connected", connectedAt: state.connectedAt ?? Date.now() });
      }
    } else if (connectionState === "disconnected") {
      // Brief network drops recover on their own; only give up after a grace period.
      if (!disconnectTimer) {
        disconnectTimer = setTimeout(() => void hangUp("failed"), DISCONNECT_GRACE_MS);
      }
    } else if (connectionState === "failed") {
      void hangUp("failed");
    }
  });

  return connection;
}

function listenForRemoteCandidates(callId: string, remoteCollection: "callerCandidates" | "calleeCandidates") {
  const db = requireDb();
  const unsubscribe = onSnapshot(collection(db, CALLS_COLLECTION, callId, remoteCollection), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added" || !peer) {
        return;
      }
      const candidate = change.doc.data();
      if (peer.remoteDescription == null) {
        pendingCandidates.push(candidate);
      } else {
        void peer.addIceCandidate(new RTCIceCandidate(candidate as any)).catch(() => undefined);
      }
    });
  });
  cleanupFns.push(unsubscribe);
}

function flushPendingCandidates() {
  const queued = pendingCandidates;
  pendingCandidates = [];
  queued.forEach((candidate) => {
    void peer?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
  });
}

function watchCallDoc(callId: string, onUpdate: (call: CallRecord) => void) {
  const unsubscribe = onSnapshot(doc(requireDb(), CALLS_COLLECTION, callId), (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(normalizeCall(snapshot.id, snapshot.data()));
    }
  });
  cleanupFns.push(unsubscribe);
}

function handleRemoteEnd(call: CallRecord) {
  if (call.status === "declined" || call.status === "ended" || call.status === "missed" || call.status === "cancelled" || call.status === "failed") {
    if (state.callId === call.id && state.phase !== "ended") {
      teardown(call.status);
    }
  }
}

/** Starts a call to another user and returns the new call id (navigate to the call screen with it). */
export async function startCall(input: { callerId: string; calleeId: string; type: CallType }) {
  if (state.phase !== "idle" && state.phase !== "ended") {
    throw new Error("You are already in a call.");
  }
  if (!(await ensureCallPermissions(input.type))) {
    throw new Error(input.type === "video" ? "Allow camera and microphone access to make video calls." : "Allow microphone access to make calls.");
  }

  const db = requireDb();
  const callRef = doc(collection(db, CALLS_COLLECTION));
  const callId = callRef.id;
  state = { ...idleState };
  setState({ callId, role: "caller", phase: "outgoing", type: input.type, peerId: input.calleeId });

  try {
    const stream = await openLocalMedia(input.type);
    const connection = createPeer(callId, "callerCandidates");
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));

    const offer = await connection.createOffer({});
    await connection.setLocalDescription(offer);

    const record = {
      callerId: input.callerId,
      calleeId: input.calleeId,
      participantIds: [input.callerId, input.calleeId],
      type: input.type,
      status: "ringing" as CallStatus,
      createdAt: new Date().toISOString(),
      offer: { type: offer.type, sdp: offer.sdp },
    };
    await setDoc(callRef, record);

    watchCallDoc(callId, (call) => {
      if (call.answer && connection.remoteDescription == null) {
        setState({ phase: "connecting" });
        void connection
          .setRemoteDescription(new RTCSessionDescription(call.answer))
          .then(flushPendingCandidates)
          .catch(() => void hangUp("failed"));
      }
      handleRemoteEnd(call);
    });
    listenForRemoteCandidates(callId, "calleeCandidates");

    ringTimer = setTimeout(() => {
      if (state.callId === callId && state.phase === "outgoing") {
        void hangUp("missed");
      }
    }, RING_TIMEOUT_MS);
    return callId;
  } catch (error) {
    teardown("failed");
    throw error;
  }
}

/** Shows an incoming call on the call screen (does not answer it yet). */
export function presentIncomingCall(call: CallRecord) {
  if (state.callId === call.id) {
    return;
  }
  if (state.phase !== "idle" && state.phase !== "ended") {
    // Busy on another call: decline politely.
    void updateDoc(doc(requireDb(), CALLS_COLLECTION, call.id), {
      status: "declined",
      endedAt: new Date().toISOString(),
    }).catch(() => undefined);
    return;
  }
  state = { ...idleState };
  setState({ callId: call.id, role: "callee", phase: "incoming", type: call.type, peerId: call.callerId });
  watchCallDoc(call.id, handleRemoteEnd);
  Vibration.vibrate([0, 900, 700], true);
  ringTimer = setTimeout(() => {
    if (state.callId === call.id && state.phase === "incoming") {
      teardown("missed");
    }
  }, RING_TIMEOUT_MS);
}

export async function acceptCall(options?: { asAudio?: boolean }) {
  const callId = state.callId;
  if (!callId || state.phase !== "incoming") {
    return;
  }
  Vibration.cancel();
  const call = await getCall(callId);
  if (!call || call.status !== "ringing" || !call.offer) {
    teardown(call?.status ?? "ended");
    return;
  }
  const type: CallType = options?.asAudio ? "audio" : call.type;
  if (!(await ensureCallPermissions(type))) {
    setState({ error: type === "video" ? "Allow camera and microphone access to answer." : "Allow microphone access to answer." });
    return;
  }

  setState({ phase: "connecting", type });
  try {
    const stream = await openLocalMedia(type);
    const connection = createPeer(callId, "calleeCandidates");
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    await connection.setRemoteDescription(new RTCSessionDescription(call.offer));
    flushPendingCandidates();
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await updateDoc(doc(requireDb(), CALLS_COLLECTION, callId), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: "accepted",
      answeredAt: new Date().toISOString(),
    });
    listenForRemoteCandidates(callId, "callerCandidates");
  } catch {
    await hangUp("failed");
  }
}

export async function declineCall() {
  await hangUp("declined");
}

/** Ends the call for both sides. */
export async function hangUp(reason?: CallStatus) {
  const callId = state.callId;
  if (!callId) {
    return;
  }
  const finalStatus: CallStatus =
    reason ??
    (state.phase === "outgoing" ? "cancelled" : state.phase === "incoming" ? "declined" : "ended");
  const connectedAt = state.connectedAt;
  teardown(finalStatus);
  try {
    await updateDoc(doc(requireDb(), CALLS_COLLECTION, callId), {
      status: finalStatus,
      endedAt: new Date().toISOString(),
      ...(connectedAt ? { durationSeconds: Math.round((Date.now() - connectedAt) / 1000) } : {}),
    });
  } catch {
    // The other side will notice the dropped connection.
  }
}

function teardown(reason: CallStatus) {
  Vibration.cancel();
  if (ringTimer) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  try {
    localStream?.getTracks().forEach((track) => track.stop());
    localStream?.release();
  } catch {
    // ignore
  }
  try {
    remoteStream?.release(false);
  } catch {
    // ignore
  }
  try {
    peer?.close();
  } catch {
    // ignore
  }
  peer = null;
  pendingCandidates = [];
  localStream = null;
  remoteStream = null;
  setState({ phase: "ended", endReason: reason, localStreamUrl: null, remoteStreamUrl: null });
}

/** Resets the store after the call screen closes. */
export function clearEndedCall() {
  if (state.phase === "ended") {
    state = { ...idleState };
    listeners.forEach((listener) => listener());
  }
}

export function toggleMute() {
  const next = !state.micMuted;
  localStream?.getAudioTracks().forEach((track) => {
    track.enabled = !next;
  });
  setState({ micMuted: next });
}

export function toggleCamera() {
  const next = !state.cameraOff;
  localStream?.getVideoTracks().forEach((track) => {
    track.enabled = !next;
  });
  setState({ cameraOff: next });
}

export function switchCamera() {
  localStream?.getVideoTracks().forEach((track) => {
    try {
      track._switchCamera();
    } catch {
      // Some devices only have one camera.
    }
  });
}

/**
 * Watches for calls ringing this user while the app is open and hands them to `onIncoming`.
 * Returns an unsubscribe function.
 */
export function subscribeToIncomingCalls(userId: string, onIncoming: (call: CallRecord) => void): Unsubscribe {
  const db = getFirebaseClientFirestore();
  if (!db) {
    return () => undefined;
  }
  return onSnapshot(
    query(collection(db, CALLS_COLLECTION), where("calleeId", "==", userId), where("status", "==", "ringing")),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") {
          return;
        }
        const call = normalizeCall(change.doc.id, change.doc.data());
        if (Date.now() - new Date(call.createdAt).getTime() < STALE_RING_MS) {
          onIncoming(call);
        }
      });
    },
    () => undefined
  );
}
