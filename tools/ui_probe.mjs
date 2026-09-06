// Runner for tools/ui_probe.html: serves the repo, drives headless Chromium
// over the DevTools protocol, and reports what the probe found.
//
//   node tools/ui_probe.mjs [--chrome /path/to/chromium] [--keep]
//
// CDP rather than --dump-dom because the probe needs a real clock: the draw
// loop is a requestAnimationFrame, and --virtual-time-budget starves it.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const CHROME = flag("--chrome", process.env.CHROME || "chromium");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".gif": "image/gif", ".png": "image/png",
  ".vlw": "application/octet-stream", ".rub": "text/plain",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(req.url.split("?")[0])));
  if (!path.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    if ((await stat(path)).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const profile = await import("node:fs/promises")
  .then((fs) => fs.mkdtemp("/tmp/rubicon-probe-"));
const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, "--remote-debugging-port=0", "--window-size=1000,900",
  `http://127.0.0.1:${port}/tools/ui_probe.html`,
], { stdio: ["ignore", "pipe", "pipe"] });

// Chromium prints the DevTools endpoint on stderr once it is listening.
const wsUrl = await new Promise((resolve, reject) => {
  let buf = "";
  const t = setTimeout(() => reject(new Error("chromium did not report a DevTools endpoint")), 20000);
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = /ws:\/\/[^\s]+/.exec(buf);
    if (m) { clearTimeout(t); resolve(m[0]); }
  });
  chrome.on("exit", (code) => reject(new Error(`chromium exited (${code})`)));
});

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  const p = pending.get(msg.id);
  if (p) { pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

// Attach to the page target.
const { targetInfos } = await send("Target.getTargets");
const page = targetInfos.find((t) => t.type === "page");
const { sessionId } = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });

// Surface page errors: a broken module would otherwise look like a timeout.
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    console.error("page console:", m.params.args.map((a) => a.value ?? a.description).join(" "));
  }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    console.error("page error:", d.exception?.description ?? d.text,
                  `@ ${d.url || "?"}:${d.lineNumber}:${d.columnNumber}`);
  }
});
await send("Runtime.enable", {}, sessionId);
if (process.env.PROBE_DEBUG) console.error("target:", page.url);

let result = null;
for (let i = 0; i < 240 && !result; i++) {
  const r = await send("Runtime.evaluate", {
    expression: "window.__probe ? JSON.stringify(window.__probe) : null",
    returnByValue: true,
  }, sessionId);
  if (r.result.value) result = JSON.parse(r.result.value);
  else await sleep(250);
}

ws.close();
server.close();
chrome.kill();
await new Promise((r) => chrome.on("exit", r)); // let it finish with its profile
if (!args.includes("--keep")) {
  const fs = await import("node:fs/promises");
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}

if (!result) {
  console.error("PROBE: timed out with no result");
  process.exit(1);
}
console.log(result.report);
process.exit(result.failures ? 1 : 0);
