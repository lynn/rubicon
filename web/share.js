// Levels in the URL, so the port needs no server of its own.
//
// Two forms of ?level=:
//   ?level=lupebik           7-letter warehouse code -> levels/lupebik.rub
//                            from our own static mirror
//   ?level=eNpjYBgFo2AUjIJRM...  base64url of zlib-deflated level text
//
// kevan.org's rubiload.php sends no Access-Control-Allow-Origin, so a browser
// cannot fetch it directly - warehouse codes MUST resolve against the mirror in
// levels/. That is what tools/fetch_levels.py is for.
//
// The two forms can't be confused: a compressed level never deflates to
// something as short as seven bytes, so /^[a-z]{7}$/ is unambiguous.

const CODE_RE = /^[a-z]{7}$/;

export const isWarehouseCode = (s) => CODE_RE.test(s);

// --- base64url ------------------------------------------------------------

function bytesToBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- zlib via the platform's compression streams ---------------------------

async function pipe(bytes, stream) {
  const rs = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(rs).arrayBuffer());
}

/** Level text -> base64url(zlib). */
export async function encodeLevel(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64Url(await pipe(bytes, new CompressionStream("deflate")));
}

/** base64url(zlib) -> level text. */
export async function decodeLevel(param) {
  const bytes = await pipe(base64UrlToBytes(param), new DecompressionStream("deflate"));
  return new TextDecoder().decode(bytes);
}

// --- resolving ?level= ------------------------------------------------------

/**
 * Resolve a ?level= value to level text.
 * @param {string} param
 * @param {(code:string)=>Promise<string>} fetchCode  loads a warehouse code
 */
export async function resolveLevelParam(param, fetchCode) {
  if (isWarehouseCode(param)) return fetchCode(param);
  return decodeLevel(param);
}

/** Build a shareable URL carrying the whole level inline. */
export async function buildShareURL(levelText, base = location.href) {
  const url = new URL(base);
  url.search = "";
  url.hash = "";
  url.searchParams.set("level", await encodeLevel(levelText));
  return url.toString();
}

/** Copy text to the clipboard, falling back to a hidden textarea. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
