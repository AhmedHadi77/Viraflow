const sexualContentPatterns = [
  /\bsex(?:ual|y)?\b/i,
  /\bnudes?\b/i,
  /\bnudity\b/i,
  /\bnaked\b/i,
  /\bnsfw\b/i,
  /\bporn(?:ography|ographic)?\b/i,
  /\bxxx\b/i,
  /\berotic\b/i,
  /\bfetish\b/i,
  /\bonlyfans\b/i,
  /\badult content\b/i,
  /\bblowjob\b/i,
  /\bhandjob\b/i,
  /\bstrip(?:per|tease)?\b/i,
];

export const blockedUserContentMessage =
  "Sexual content is not allowed on Pulseora. Please remove sexual text, images, or video references before posting.";

export const blockedAiContentMessage =
  "AI tools cannot create sexual videos, images, or sexual content on Pulseora.";

export function containsSexualContent(values: Array<string | undefined | null>) {
  return values.some((value) => {
    if (!value) {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized.startsWith("data:")) {
      return false;
    }

    return sexualContentPatterns.some((pattern) => pattern.test(normalized));
  });
}

export function assertSafeUserContent(values: Array<string | undefined | null>) {
  if (containsSexualContent(values)) {
    throw new Error(blockedUserContentMessage);
  }
}

export function assertSafeAiContent(values: Array<string | undefined | null>) {
  if (containsSexualContent(values)) {
    throw new Error(blockedAiContentMessage);
  }
}
