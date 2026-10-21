import React, { useEffect, useRef } from "react";
import { View } from "react-native";

/**
 * Browser version of the small part of react-native-webrtc that Sohba uses, so voice and video calls
 * also work in the web app (iPhone). Streams get a toURL() id like on the phone, and RTCView draws a <video>.
 */
type WebStream = MediaStream & { toURL?: () => string; release?: (keep?: boolean) => void; __sohbaLocal?: boolean };

const streams = new Map<string, WebStream>();
const remoteAudio = new Map<string, HTMLAudioElement>();

function patchMediaStream() {
  const proto = (globalThis as { MediaStream?: { prototype: WebStream } }).MediaStream?.prototype;
  if (!proto || proto.toURL) {
    return;
  }
  proto.toURL = function toURL(this: WebStream) {
    streams.set(this.id, this);
    // Remote voices need an audio element to be heard in the browser (the phone plays them by itself).
    if (!this.__sohbaLocal && this.getAudioTracks().length > 0 && !remoteAudio.has(this.id) && typeof document !== "undefined") {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.srcObject = this;
      document.body.appendChild(audio);
      void audio.play().catch(() => undefined);
      remoteAudio.set(this.id, audio);
    }
    return this.id;
  };
  proto.release = function release(this: WebStream) {
    streams.delete(this.id);
    const audio = remoteAudio.get(this.id);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      remoteAudio.delete(this.id);
    }
  };
}

function RTCView({
  streamURL,
  mirror,
  objectFit,
  style,
}: {
  streamURL?: string;
  mirror?: boolean;
  objectFit?: "cover" | "contain";
  style?: unknown;
  zOrder?: number;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const stream = streamURL ? streams.get(streamURL) : undefined;
  useEffect(() => {
    const video = ref.current;
    if (video && video.srcObject !== (stream ?? null)) {
      video.srcObject = stream ?? null;
      void video.play().catch(() => undefined);
    }
  }, [stream]);
  return (
    <View style={style as never}>
      {React.createElement("video", {
        ref,
        autoPlay: true,
        playsInline: true,
        // Our own camera never plays sound back; the other person's sound plays through an audio element.
        muted: true,
        style: {
          width: "100%",
          height: "100%",
          objectFit: objectFit ?? "cover",
          transform: mirror ? "scaleX(-1)" : undefined,
          backgroundColor: "#000",
        },
      })}
    </View>
  );
}

export function loadWebRtcEngine(): unknown {
  patchMediaStream();
  const g = globalThis as unknown as {
    RTCPeerConnection: typeof RTCPeerConnection;
    RTCIceCandidate: typeof RTCIceCandidate;
    RTCSessionDescription: typeof RTCSessionDescription;
    MediaStream: typeof MediaStream;
  };
  return {
    RTCPeerConnection: g.RTCPeerConnection,
    RTCIceCandidate: g.RTCIceCandidate,
    RTCSessionDescription: g.RTCSessionDescription,
    MediaStream: g.MediaStream,
    RTCView,
    mediaDevices: {
      async getUserMedia(constraints: MediaStreamConstraints) {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("This browser cannot use the microphone."), { code: "call/mic-permission" });
        }
        try {
          const stream = (await navigator.mediaDevices.getUserMedia(constraints)) as WebStream;
          stream.__sohbaLocal = true;
          return stream;
        } catch (error) {
          const video = Boolean(constraints.video);
          throw Object.assign(new Error(error instanceof Error ? error.message : "Permission denied"), {
            code: video ? "call/camera-permission" : "call/mic-permission",
          });
        }
      },
    },
  };
}
