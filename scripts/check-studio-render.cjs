// Second check for the new Sohba editor: joins clips and photos, adds sound layers and canvas frames on
// one real reel video and post photo, and measures each result's length. Read-only: nothing is changed.
const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const out = path.join(rootDir, ".claude-sync", "studio-render-output.txt");
const lines = [];
const log = (line) => { lines.push(line); console.log(line); fs.writeFileSync(out, lines.join("\n")); };

function parseCloudinary(url, kind) {
  const m = url.match(new RegExp(`^(https://res\\.cloudinary\\.com/[^/]+)/${kind}/upload/(.+)$`));
  if (!m) return null;
  const segments = m[2].split("?")[0].split("/");
  const v = segments.findIndex((s) => /^v\d+$/.test(s));
  const rest = v >= 0 ? segments.slice(v + 1) : segments;
  const file = rest.join("/");
  const publicId = file.replace(/\.[a-zA-Z0-9]+$/, "");
  return { base: m[1], publicId, layerId: publicId.replace(/\//g, ":"), raw: url.split("?")[0] };
}

async function firestoreList(client, projectId, collection, size) {
  const res = await client.request({ url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=${size}` });
  return res.data.documents || [];
}
const field = (doc, name) => doc.fields?.[name]?.stringValue;

// Reads the length of an mp4 (plain or fragmented) by walking its boxes: video track time = sum of
// sample durations in "trun" boxes (fragmented) or the track header's duration (plain).
function mp4Duration(buffer) {
  const tracks = {}; // trackId -> { timescale, duration, handler }
  let currentTrack = null;
  let fragTrack = null;
  let defaultDuration = 0;
  const fragSums = {};
  function walk(start, end) {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString("latin1", offset + 4, offset + 8);
      let header = 8;
      if (size === 1) { size = Number(buffer.readBigUInt64BE(offset + 8)); header = 16; }
      if (size === 0) size = end - offset;
      if (size < header || offset + size > end) break;
      const body = offset + header;
      if (["moov", "trak", "mdia", "minf", "stbl", "mvex", "moof", "traf", "edts"].includes(type)) {
        if (type === "trak") currentTrack = { timescale: 0, duration: 0, handler: "" };
        walk(body, offset + size);
        if (type === "trak" && currentTrack && currentTrack.id !== undefined) tracks[currentTrack.id] = currentTrack;
      } else if (type === "tkhd" && currentTrack) {
        const version = buffer[body];
        currentTrack.id = buffer.readUInt32BE(body + (version === 1 ? 20 : 12));
      } else if (type === "mdhd" && currentTrack) {
        const version = buffer[body];
        if (version === 1) { currentTrack.timescale = buffer.readUInt32BE(body + 20); currentTrack.duration = Number(buffer.readBigUInt64BE(body + 24)); }
        else { currentTrack.timescale = buffer.readUInt32BE(body + 12); currentTrack.duration = buffer.readUInt32BE(body + 16); }
      } else if (type === "hdlr" && currentTrack) {
        currentTrack.handler = buffer.toString("latin1", body + 8, body + 12);
      } else if (type === "tfhd") {
        const flags = buffer.readUInt32BE(body) & 0xffffff;
        fragTrack = buffer.readUInt32BE(body + 4);
        let p = body + 8;
        if (flags & 0x1) p += 8;
        if (flags & 0x2) p += 4;
        defaultDuration = flags & 0x8 ? buffer.readUInt32BE(p) : (tracks[fragTrack]?.trexDefault ?? 0);
      } else if (type === "trex") {
        const id = buffer.readUInt32BE(body + 4);
        const def = buffer.readUInt32BE(body + 12);
        tracks[id] = tracks[id] || { timescale: 0, duration: 0, handler: "" };
        tracks[id].trexDefault = def;
      } else if (type === "trun") {
        const flags = buffer.readUInt32BE(body) & 0xffffff;
        const count = buffer.readUInt32BE(body + 4);
        let p = body + 8;
        if (flags & 0x1) p += 4;
        if (flags & 0x4) p += 4;
        let sum = 0;
        for (let i = 0; i < count; i += 1) {
          let d = defaultDuration;
          if (flags & 0x100) { d = buffer.readUInt32BE(p); p += 4; }
          if (flags & 0x200) p += 4;
          if (flags & 0x400) p += 4;
          if (flags & 0x800) p += 4;
          sum += d;
        }
        fragSums[fragTrack] = (fragSums[fragTrack] || 0) + sum;
      }
      offset += size;
    }
  }
  try { walk(0, buffer.length); } catch (error) { return null; }
  let best = null;
  for (const [id, track] of Object.entries(tracks)) {
    if (!track.timescale) continue;
    const total = (fragSums[id] || 0) + (track.duration || 0);
    const value = total / track.timescale;
    if (track.handler === "vide") return value;
    best = best ?? value;
  }
  return best;
}

async function probe(label, url, wantDuration = true) {
  const started = Date.now();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(170000) });
      const error = response.headers.get("x-cld-error") || "";
      const type = response.headers.get("content-type") || "";
      const body = Buffer.from(await response.arrayBuffer().catch(() => new ArrayBuffer(0)));
      if (response.status === 423) {
        await new Promise((r) => setTimeout(r, 8000));
        continue;
      }
      const duration = wantDuration && type.startsWith("video") ? mp4Duration(body) : null;
      const peek = body.length < 4096 ? " peek=" + JSON.stringify(body.toString("latin1", 0, Math.min(200, body.length)).replace(/[^\x20-\x7e]/g, ".")) : "";
      log(`${response.ok ? "OK  " : "FAIL"} ${String(response.status).padEnd(3)} ${label.padEnd(30)} ${((Date.now() - started) / 1000).toFixed(1)}s ${type} ${(body.length / 1024).toFixed(0)}KB ${duration !== null ? "len=" + duration.toFixed(2) + "s" : ""} ${error}${peek}`);
      return;
    } catch (error) {
      log(`FAIL ERR ${label.padEnd(30)} ${error.message}`);
      return;
    }
  }
  log(`FAIL 423 ${label.padEnd(30)} still processing after retries`);
}

(async () => {
  log("Studio render check " + new Date().toISOString());
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const client = new JWT({ email: process.env.FIREBASE_CLIENT_EMAIL, key: process.env.FIREBASE_PRIVATE_KEY.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const reels = await firestoreList(client, projectId, "reels", 20);
  const posts = await firestoreList(client, projectId, "posts", 20);
  let video = null;
  for (const doc of reels) { const p = parseCloudinary(field(doc, "videoUrl") || "", "video"); if (p) { video = p; break; } }
  let image = null;
  for (const doc of posts) {
    const media = doc.fields?.media?.arrayValue?.values || [];
    for (const m of media) {
      const f = m.mapValue?.fields || {};
      if (f.type?.stringValue === "image") { const p = parseCloudinary(f.url?.stringValue || "", "image"); if (p) { image = p; break; } }
    }
    if (image) break;
  }
  log(`video: ${video ? video.publicId : "none"} | image: ${image ? image.publicId : "none"}`);
  if (!video || !image) { log("DONE (missing media)"); return; }
  const V = (t) => `${video.base}/video/upload/${t ? t + "/" : ""}${video.publicId}.mp4`;
  const IV = (t) => `${image.base}/image/upload/${t ? t + "/" : ""}${image.publicId}.mp4`;
  const I = (t, ext = "jpg") => `${image.base}/image/upload/${t ? t + "/" : ""}${image.publicId}.${ext}`;
  const S = "w_720,h_1280,c_fill,g_center";
  const vid = `l_video:${video.layerId}`;
  const img = `l_${image.layerId}`;
  const fixedCases = [
    ["base", V("")],
  ];
  for (const [label, url] of fixedCases) {
    await probe(label, url);
  }
  // URLs written by the app's own builder (studio-render-urls.json, made from the app code).
  const urlsFile = path.join(__dirname, "studio-render-urls.json");
  if (fs.existsSync(urlsFile)) {
    const cases = JSON.parse(fs.readFileSync(urlsFile, "utf8"));
    for (const item of cases) {
      const url = item.url.replace(/__VIDEO_BASE__/g, `${video.base}/video/upload`).replace(/__IMAGE_BASE__/g, `${image.base}/image/upload`).replace(/__VID__/g, video.publicId).replace(/__VIDL__/g, video.layerId).replace(/__IMG__/g, image.publicId).replace(/__IMGL__/g, image.layerId);
      await probe(`app: ${item.label}`, url);
    }
  }
  log("DONE");
})().catch((error) => log("FATAL " + (error && error.stack ? error.stack : error)));
