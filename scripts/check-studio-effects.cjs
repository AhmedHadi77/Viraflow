// Tries the cloud video and photo effects the new Sohba editor uses, on one real reel video and one
// post photo, and records which ones Cloudinary accepts. Read-only: nothing in the app is changed.
const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const out = path.join(rootDir, ".claude-sync", "studio-effects-output.txt");
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
  return { base: m[1], publicId, layerId: publicId.replace(/\//g, ":") };
}

async function firestoreList(client, projectId, collection, size) {
  const res = await client.request({ url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=${size}` });
  return res.data.documents || [];
}
const field = (doc, name) => doc.fields?.[name]?.stringValue;

async function probe(label, url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-2047" }, signal: AbortSignal.timeout(170000) });
    const error = response.headers.get("x-cld-error") || "";
    const type = response.headers.get("content-type") || "";
    await response.arrayBuffer().catch(() => undefined);
    log(`${response.ok ? "OK  " : "FAIL"} ${String(response.status).padEnd(3)} ${label.padEnd(26)} ${((Date.now() - started) / 1000).toFixed(1)}s ${type} ${error}`);
  } catch (error) {
    log(`FAIL ERR ${label.padEnd(26)} ${error.message}`);
  }
}

(async () => {
  log("Studio effects check " + new Date().toISOString());
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
  if (video) {
    const V = (t) => `${video.base}/video/upload/${t ? t + "/" : ""}${video.publicId}.mp4`;
    const size = "w_720,h_1280,c_fill";
    const clip = (extra, layerOpen) => `${size}/${layerOpen}l_video:${video.layerId}/${extra ? extra + "/" : ""}${size}/fl_layer_apply`;
    await probe("base", V(""));
    await probe("reverse", V("e_reverse"));
    await probe("boomerang", V("so_0,du_3/e_boomerang"));
    await probe("loop2", V("so_0,du_3/e_loop:1"));
    await probe("fade in+out", V("e_fade:800/e_fade:-800"));
    await probe("stabilize", V("e_deshake"));
    await probe("gamma", V("e_gamma:40"));
    await probe("rotate90", V("a_90"));
    await probe("mirror", V("a_hflip"));
    await probe("fit blurred 9:16", V("w_1080,h_1920,c_pad,b_blurred:400:15"));
    await probe("fit black 1:1", V("w_1080,h_1080,c_pad,b_black"));
    await probe("fill 1:1 center", V("w_1080,h_1080,c_fill,g_center"));
    await probe("fill 4:5 auto", V("w_1080,h_1350,c_fill,g_auto"));
    await probe("speed 0.75", V("e_accelerate:-25"));
    await probe("mute", V("ac_none"));
    await probe("audio mp3", `${video.base}/video/upload/${video.publicId}.mp3`);
    await probe("splice", V(clip("", "fl_splice,")));
    await probe("splice trimmed", V(clip("so_0,du_2", "fl_splice,")));
    for (const name of ["fade", "fadeblack", "fadewhite", "wipeleft", "slideleft", "slideup", "circleopen", "dissolve", "zoomin", "pixelize", "radial", "smoothleft"]) {
      await probe(`transition ${name}`, V(clip("so_0,du_3", `fl_splice:transition_(name_${name};du_1),`)));
    }
    await probe("splice then speed", V(`${clip("so_0,du_2", "fl_splice,")}/e_accelerate:50`));
    await probe("trim base + splice", V(`so_0,du_2/${clip("so_0,du_2", "fl_splice,")}`));
    if (image) {
      await probe("splice image du3 A", V(`${size}/fl_splice,l_${image.layerId}/du_3/${size}/fl_layer_apply`));
      await probe("splice image du3 B", V(`${size}/fl_splice,du_3,l_${image.layerId}/${size}/fl_layer_apply`));
      await probe("splice image du3 C", V(`${size}/l_${image.layerId},fl_splice,du_3/${size}/fl_layer_apply`));
    }
  }
  if (image) {
    const I = (t, ext = "jpg") => `${image.base}/image/upload/${t ? t + "/" : ""}${image.publicId}.${ext}`;
    await probe("img base", I(""));
    for (const [label, t] of [["enhance", "e_improve"], ["auto color", "e_auto_color"], ["cartoon", "e_cartoonify"], ["oil paint", "e_oil_paint:40"], ["sepia", "e_sepia:60"], ["art zorro", "e_art:zorro"], ["art aurora", "e_art:aurora"], ["art sonnet", "e_art:sonnet"], ["vibrance", "e_vibrance:60"], ["warm tint", "e_tint:25:orange"], ["gamma", "e_gamma:40"], ["pixelate", "e_pixelate:12"], ["blur", "e_blur:400"], ["fit blurred", "w_1080,h_1920,c_pad,b_blurred:400:15"], ["fill 1:1", "w_1080,h_1080,c_fill,g_auto"], ["rotate", "a_90"], ["mirror", "a_hflip"]]) {
      await probe(`img ${label}`, I(t));
    }
    await probe("img zoompan mp4", I("e_zoompan", "mp4"));
    await probe("img du3 mp4", I("du_3", "mp4"));
    await probe("img zoompan du3 mp4", I("e_zoompan:du_3", "mp4"));
  }
  log("DONE");
})().catch((error) => log("FATAL " + (error && error.stack ? error.stack : error)));
