import { Share } from "react-native";
import { Reel, User } from "../types/models";

export async function shareReelToApps(reel: Reel, creator: User) {
  const messageLines = [
    `Watch this reel from @${creator.username} on Sohba`,
    "",
    reel.caption.trim(),
    "",
    reel.videoUrl.trim(),
  ].filter(Boolean);

  await Share.share({
    title: `${creator.name} on Sohba`,
    message: messageLines.join("\n"),
    url: reel.videoUrl.trim(),
  });
}
