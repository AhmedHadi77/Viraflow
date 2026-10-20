// The Sohba sound library: original, royalty-free tracks made for Sohba (see scripts/generate-sound-library.py).
// They ship inside the app, so a story or reel that uses one only stores its id and everyone hears it instantly.

export type SoundGenre = "upbeat" | "lofi" | "acoustic" | "hiphop" | "cinematic" | "electronic" | "arabic" | "happy" | "ambient";

export interface LibrarySound {
  id: string;
  title: string;
  artist: string;
  genre: SoundGenre;
  bpm: number;
  durationSeconds: number;
  source: number;
}

export const SOUND_LIBRARY: LibrarySound[] = [
  { id: "sunrise-drive", title: "Sunrise Drive", artist: "Sohba Sounds", genre: "upbeat", bpm: 120, durationSeconds: 30, source: require("../../assets/sounds/sunrise-drive.m4a") },
  { id: "neon-pulse", title: "Neon Pulse", artist: "Sohba Sounds", genre: "electronic", bpm: 126, durationSeconds: 30, source: require("../../assets/sounds/neon-pulse.m4a") },
  { id: "city-lights", title: "City Lights", artist: "Sohba Sounds", genre: "hiphop", bpm: 88, durationSeconds: 30, source: require("../../assets/sounds/city-lights.m4a") },
  { id: "midnight-lofi", title: "Midnight Lo-fi", artist: "Sohba Sounds", genre: "lofi", bpm: 78, durationSeconds: 30, source: require("../../assets/sounds/midnight-lofi.m4a") },
  { id: "desert-wind", title: "Desert Wind", artist: "Sohba Sounds", genre: "arabic", bpm: 100, durationSeconds: 30, source: require("../../assets/sounds/desert-wind.m4a") },
  { id: "golden-hour", title: "Golden Hour", artist: "Sohba Sounds", genre: "acoustic", bpm: 96, durationSeconds: 30, source: require("../../assets/sounds/golden-hour.m4a") },
  { id: "happy-steps", title: "Happy Steps", artist: "Sohba Sounds", genre: "happy", bpm: 112, durationSeconds: 30, source: require("../../assets/sounds/happy-steps.m4a") },
  { id: "epic-rise", title: "Epic Rise", artist: "Sohba Sounds", genre: "cinematic", bpm: 72, durationSeconds: 30, source: require("../../assets/sounds/epic-rise.m4a") },
  { id: "deep-focus", title: "Deep Focus", artist: "Sohba Sounds", genre: "ambient", bpm: 64, durationSeconds: 30, source: require("../../assets/sounds/deep-focus.m4a") },
];

export function getLibrarySound(id: string | undefined | null) {
  return id ? SOUND_LIBRARY.find((sound) => sound.id === id) : undefined;
}
