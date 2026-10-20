import type { MediaEditFilters, MediaStudioData, StudioPlaybackRate } from "../../types/models";

export type EditorMode = "story" | "reel" | "post";

export interface EditorMedia {
  uri: string;
  type: "image" | "video";
  durationSeconds?: number;
  posterUri?: string;
  mimeType?: string;
  fileName?: string;
}

/** Everything the editor produces for one photo or video. */
export interface EditorResult {
  filterId: string;
  filters: Required<MediaEditFilters>;
  trimStartRatio: number;
  trimEndRatio: number;
  speed: StudioPlaybackRate;
  studio: MediaStudioData;
  /** Chosen cover frame for a video (local image file). */
  posterUri?: string;
}

export interface EditorSession {
  mode: EditorMode;
  media: EditorMedia;
  initial?: EditorResult;
  /** Label of the finish button, e.g. "Next" or "Share to story". */
  doneLabel?: string;
  onDone: (result: EditorResult) => void | Promise<void>;
  onCancel?: () => void;
}

const sessions = new Map<string, EditorSession>();
let counter = 0;

/** Opens the full-screen editor; the result comes back through onDone (functions can't travel in route params). */
export function openMediaEditor(navigation: { navigate: (name: string, params?: object) => void }, session: EditorSession) {
  counter += 1;
  const sessionId = `editor-${Date.now()}-${counter}`;
  sessions.set(sessionId, session);
  navigation.navigate("MediaEditor", { sessionId });
  return sessionId;
}

export function getEditorSession(sessionId: string) {
  return sessions.get(sessionId);
}

export function closeEditorSession(sessionId: string) {
  sessions.delete(sessionId);
}

export function emptyEditorResult(): EditorResult {
  return {
    filterId: "normal",
    filters: { brightness: 0, contrast: 0, saturation: 0, grayscale: 0, vignette: 0, grain: 0, sharpen: 0 },
    trimStartRatio: 0,
    trimEndRatio: 1,
    speed: 1,
    studio: {},
  };
}

export function hasFilterChanges(filters: MediaEditFilters) {
  return Object.values(filters).some((value) => typeof value === "number" && Math.abs(value) > 0.001);
}
