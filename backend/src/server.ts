import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { attachSocketServer } from "./realtime/socketServer";

const app = createApp();
const server = createServer(app);

attachSocketServer(server);

server.listen(env.port, env.host, () => {
  const hostLabel = env.host === "0.0.0.0" ? "all network interfaces" : env.host;
  console.log(`ViraFlow API listening on ${hostLabel}:${env.port}`);
  console.log(`Local access: http://localhost:${env.port}`);
});
