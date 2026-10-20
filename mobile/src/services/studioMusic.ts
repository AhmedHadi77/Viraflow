import { useEffect, useRef, useState } from "react";
import { getLibrarySound } from "../data/soundLibrary";
import type { StudioMusic } from "../types/models";

type ExpoAudioModule = typeof import("expo-audio");
type Player = ReturnType<ExpoAudioModule["createAudioPlayer"]>;

let cachedAudio: ExpoAudioModule | null | undefined;
let audioModeReady = false;

function getExpoAudio() {
  if (cachedAudio !== undefined) {
    return cachedAudio;
  }
  try {
    cachedAudio = require("expo-audio") as ExpoAudioModule;
  } catch {
    cachedAudio = null;
  }
  return cachedAudio;
}

/** Where a soundtrack's audio comes from: a bundled library track or an uploaded/picked file. */
export function resolveMusicSource(music: StudioMusic | undefined | null): number | { uri: string } | null {
  if (!music) {
    return null;
  }
  const libraryTrack = getLibrarySound(music.trackId);
  if (libraryTrack) {
    return libraryTrack.source;
  }
  const uri = music.localUri || music.url;
  return uri ? { uri } : null;
}

function musicKey(music: StudioMusic | undefined | null) {
  return music ? music.trackId || music.localUri || music.url || null : null;
}

/**
 * Plays a story's or reel's soundtrack while it is on screen. Starts at the chosen point of the song,
 * loops back to that point, follows the chosen volume and stops when the item leaves the screen.
 */
export function useStudioMusic(music: StudioMusic | undefined | null, active: boolean) {
  const playerRef = useRef<Player | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const [duration, setDuration] = useState(0);
  const key = musicKey(music);
  const startSeconds = music?.startSeconds ?? 0;
  const volume = music?.volume ?? 1;
  const startRef = useRef(startSeconds);
  const activeRef = useRef(active);
  startRef.current = startSeconds;
  activeRef.current = active;

  // Release the player when the song changes or the screen goes away.
  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.pause();
        player?.remove();
      } catch {
        // Already released.
      }
      setDuration(0);
    };
  }, [key]);

  // Load the song only once it is actually needed (long feeds don't load every soundtrack at once).
  useEffect(() => {
    if (!active || playerRef.current) {
      return;
    }
    const audio = getExpoAudio();
    const source = resolveMusicSource(music);
    if (!audio || !source) {
      return;
    }
    if (!audioModeReady) {
      audioModeReady = true;
      void audio.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(() => undefined);
    }
    let player: Player;
    try {
      player = audio.createAudioPlayer(source);
    } catch {
      return;
    }
    playerRef.current = player;
    subscriptionRef.current = player.addListener("playbackStatusUpdate", (status) => {
      if (status.duration > 0) {
        setDuration((current) => (Math.abs(current - status.duration) > 0.5 ? status.duration : current));
      }
      if (status.didJustFinish && playerRef.current === player) {
        void player
          .seekTo(startRef.current)
          .catch(() => undefined)
          .then(() => {
            if (activeRef.current) {
              player.play();
            }
          });
      }
    });
  }, [active, key]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    player.volume = Math.max(0, Math.min(1, volume));
    if (active) {
      void player
        .seekTo(startSeconds)
        .catch(() => undefined)
        .then(() => {
          if (activeRef.current && playerRef.current === player) {
            player.play();
          }
        });
    } else {
      player.pause();
    }
  }, [active, key, startSeconds]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      player.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume, key]);

  return duration;
}
