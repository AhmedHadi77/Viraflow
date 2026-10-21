import crypto from "crypto";
import { env } from "../config/env";

/**
 * Relay (TURN) servers let voice and video calls connect when phones are on mobile data or behind strict
 * routers, where a direct connection is impossible. Uses Cloudflare's TURN service when its key is set
 * (CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN), or a fixed TURN server (TURN_URLS/TURN_USERNAME/TURN_CREDENTIAL).
 */
type IceServer = { urls: string | string[]; username?: string; credential?: string };

let cached: { servers: IceServer[]; expiresAt: number } | null = null;
const TTL_SECONDS = 24 * 60 * 60;

export function isTurnConfigured() {
  return Boolean((env.cloudflareTurnKeyId && env.cloudflareTurnApiToken) || env.turnUrls);
}

/**
 * Free public relay (Open Relay by Metered, "static auth"). Used only when no own relay is set up, so calls
 * still connect on mobile data. Credentials follow the standard TURN REST scheme and expire after a day.
 */
function openRelayServers(): IceServer[] {
  if (process.env.OPENRELAY_DISABLED === "true") {
    return [];
  }
  const username = `${Math.floor(Date.now() / 1000) + TTL_SECONDS}:sohba`;
  const credential = crypto.createHmac("sha1", "openrelayprojectsecret").update(username).digest("base64");
  return [
    {
      urls: [
        "turn:staticauth.openrelay.metered.ca:80",
        "turn:staticauth.openrelay.metered.ca:80?transport=tcp",
        "turn:staticauth.openrelay.metered.ca:443",
        "turns:staticauth.openrelay.metered.ca:443?transport=tcp",
      ],
      username,
      credential,
    },
  ];
}

export async function getIceServers(): Promise<IceServer[]> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.servers;
  }
  const servers: IceServer[] = [];

  if (env.cloudflareTurnKeyId && env.cloudflareTurnApiToken) {
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.cloudflareTurnKeyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${env.cloudflareTurnApiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl: TTL_SECONDS }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { iceServers?: IceServer | IceServer[] };
        const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
        for (const server of list) {
          const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter((url) => !/:53(\?|$)/.test(url));
          if (urls.length > 0) {
            servers.push({ ...server, urls });
          }
        }
      } else {
        console.error("Cloudflare TURN credentials failed.", res.status, (await res.text()).slice(0, 200));
      }
    } catch (error) {
      console.error("Cloudflare TURN credentials failed.", error instanceof Error ? error.message : error);
    }
  }

  if (env.turnUrls) {
    servers.push({
      urls: env.turnUrls.split(",").map((url) => url.trim()).filter(Boolean),
      username: env.turnUsername || undefined,
      credential: env.turnCredential || undefined,
    });
  }

  if (servers.length === 0) {
    servers.push(...openRelayServers());
  }

  // Keep the credentials for most of their lifetime (they are valid for 24 hours).
  cached = { servers, expiresAt: Date.now() + (servers.length > 0 ? 12 * 60 * 60 * 1000 : 60 * 1000) };
  return servers;
}
