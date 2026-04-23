import { AIVoiceOption } from "../types/ai";

interface VoiceAssetRecord {
  id: string;
  voice: AIVoiceOption;
  contentType: string;
  createdAt: string;
  buffer: Buffer;
}

const voiceAssets = new Map<string, VoiceAssetRecord>();

export function saveVoiceAsset(input: { id: string; voice: AIVoiceOption; contentType: string; buffer: Buffer }) {
  voiceAssets.set(input.id, {
    id: input.id,
    voice: input.voice,
    contentType: input.contentType,
    createdAt: new Date().toISOString(),
    buffer: input.buffer,
  });
}

export function getVoiceAsset(id: string) {
  return voiceAssets.get(id);
}
