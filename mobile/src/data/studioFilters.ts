import type { MediaEditFilters } from "../types/models";

export interface StudioFilterPreset {
  id: string;
  /** Copy key for the filter's name. */
  labelKey:
    | "sfNormal"
    | "sfVivid"
    | "sfBright"
    | "sfPop"
    | "sfMoody"
    | "sfFade"
    | "sfVintage"
    | "sfDrama"
    | "sfMono"
    | "sfNoir";
  filters: Required<MediaEditFilters>;
}

const base: Required<MediaEditFilters> = { brightness: 0, contrast: 0, saturation: 0, grayscale: 0, vignette: 0, grain: 0, sharpen: 0 };

/**
 * Looks applied for real to the uploaded photo or video (brightness, contrast, saturation, black and
 * white, vignette, grain and sharpness are processed by the media service when the post is shared).
 */
export const STUDIO_FILTERS: StudioFilterPreset[] = [
  { id: "normal", labelKey: "sfNormal", filters: { ...base } },
  { id: "vivid", labelKey: "sfVivid", filters: { ...base, contrast: 0.6, saturation: 1.4, sharpen: 30 } },
  { id: "bright", labelKey: "sfBright", filters: { ...base, brightness: 0.8, contrast: 0.2, saturation: 0.4 } },
  { id: "pop", labelKey: "sfPop", filters: { ...base, brightness: 0.2, contrast: 0.8, saturation: 2 } },
  { id: "moody", labelKey: "sfMoody", filters: { ...base, brightness: -0.4, contrast: 0.8, saturation: -0.6, vignette: 45 } },
  { id: "fade", labelKey: "sfFade", filters: { ...base, brightness: 0.4, contrast: -1, saturation: -0.6, grain: 12 } },
  { id: "vintage", labelKey: "sfVintage", filters: { ...base, brightness: 0.2, contrast: -0.4, saturation: -0.8, vignette: 35, grain: 25 } },
  { id: "drama", labelKey: "sfDrama", filters: { ...base, contrast: 1.4, saturation: 0.4, vignette: 50, sharpen: 40 } },
  { id: "mono", labelKey: "sfMono", filters: { ...base, contrast: 0.6, grayscale: 100 } },
  { id: "noir", labelKey: "sfNoir", filters: { ...base, brightness: -0.3, contrast: 1.6, grayscale: 100, vignette: 55, grain: 18 } },
];

export function getStudioFilter(id: string | undefined | null) {
  return STUDIO_FILTERS.find((item) => item.id === id) ?? STUDIO_FILTERS[0];
}
