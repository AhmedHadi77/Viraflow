// Checks that every photo/video effect the Sohba editor uses is accepted by Cloudinary,
// using a real uploaded reel video and post photo from the project.
const path = require("path");
const fs = require("fs");
const { JWT } = require("google-auth-library");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, "backend", ".env") });
const projectId = process.env.FIREBASE_PROJECT_ID;
const client = new JWT({
  email: process.env.FIREBASE_CLIENT_EMAIL,
  key: process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function firstUrls(collection, field) {
  const res = await client.request({
    url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=40`,
  });
  const urls = [];
  for (const doc of res.data.documents || []) {
    const f = doc.fields || {};
    if (field === "media") {
      for (const item of f.media?.arrayValue?.values || []) {
        const url = item.mapValue?.fields?.url?.stringValue;
        if (url && url.includes("/image/upload/")) urls.push(url);
      }
    } else if (f[field]?.stringValue) {
      urls.push(f[field].stringValue);
    }
  }
  return urls;
}

function original(url) {
  const [prefix, rest] = url.split("/upload/");
  const parts = rest.split("?")[0].split("/");
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
  return `${prefix}/upload/${parts.slice(versionIndex).join("/")}`;
}

function withTransform(url, transform) {
  return url.replace("/upload/", `/upload/${transform}/`);
}

async function probe(label, url) {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-2047" } });
    return `${res.ok ? "OK " : "BAD"} ${res.status} ${res.headers.get("content-type")} ${res.headers.get("x-cld-error") || ""}  [${label}]`;
  } catch (error) {
    return `ERR ${error.message} [${label}]`;
  }
}

async function main() {
  const lines = [];
  const videos = (await firstUrls("reels", "videoUrl")).filter((url) => url.includes("/video/upload/"));
  const images = await firstUrls("posts", "media");
  const storyImages = (await firstUrls("stories", "imageUrl")).filter((url) => url.includes("/image/upload/"));
  const video = videos[0] && original(videos[0]);
  const image = (images[0] || storyImages[0]) && original(images[0] || storyImages[0]);
  lines.push(`video: ${video}`);
  lines.push(`image: ${image}`);
  const videoChains = {
    base: "q_auto:good,f_mp4,vc_auto,ac_aac",
    brightness: "e_brightness:20/q_auto:good,f_mp4,vc_auto,ac_aac",
    saturationGray: "e_saturation:-100/q_auto:good,f_mp4,vc_auto,ac_aac",
    sharpen: "e_sharpen:60/q_auto:good,f_mp4,vc_auto,ac_aac",
    vignette: "e_vignette:45/q_auto:good,f_mp4,vc_auto,ac_aac",
    noise: "e_noise:20/q_auto:good,f_mp4,vc_auto,ac_aac",
    full: "so_0.5,eo_3/e_accelerate:50/e_brightness:-7/e_contrast:13/e_saturation:-11/e_sharpen:80/e_vignette:45/e_noise:12/q_auto:good,f_mp4,vc_auto,ac_aac",
  };
  const imageChains = {
    base: "q_auto,f_auto",
    sharpen: "e_sharpen:60/q_auto:good,f_auto",
    vignette: "e_vignette:45/q_auto:good,f_auto",
    noise: "e_noise:20/q_auto:good,f_auto",
    full: "e_brightness:14/e_contrast:-16/e_saturation:-11/e_vignette:35/e_noise:25/q_auto:good,f_auto",
  };
  if (video) {
    for (const [name, chain] of Object.entries(videoChains)) lines.push(await probe(`video ${name}`, withTransform(video, chain)));
    const thumb = video.replace(/\.[a-z0-9]+$/i, ".jpg");
    lines.push(await probe("video thumb", withTransform(thumb, "so_1/e_vignette:45/e_noise:12/w_900,h_1600,c_fill,q_auto,f_jpg")));
  }
  if (image) {
    for (const [name, chain] of Object.entries(imageChains)) lines.push(await probe(`image ${name}`, withTransform(image, chain)));
  }
  const out = lines.join("\n");
  console.log(out);
  fs.writeFileSync(path.join(rootDir, ".claude-sync", "effects-output.txt"), out);
}

main().catch((error) => {
  console.error("CHECK FAILED:", error?.response?.data?.error?.message || error?.message || error);
  process.exit(1);
});
