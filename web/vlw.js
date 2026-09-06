// Processing's .vlw bitmap fonts, so the toolbox text is the original's text.
//
// The applet shipped Palatino Linotype baked into four .vlw files (12/14/16/32
// px), and a browser has no way to reproduce those glyphs from a CSS font
// stack: substituting a serif is close, but every string ends up a few pixels
// wide of the original. The format is trivial, the files are in data/, so the
// port just reads them.
//
// Layout, all big-endian:
//   int glyphCount, version, size, mboxHeight, ascent, descent
//   glyphCount * { int code, height, width, setWidth, topExtent, leftExtent, _ }
//   glyph bitmaps back to back, height*width bytes of 8-bit COVERAGE each
//   two length-prefixed name strings
//
// A glyph is coverage, not colour: Processing tints it with the current fill,
// which is what tint() below reproduces, one cached canvas per glyph per colour.

const CSS_RGB = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/;

/** "#fff" | "#ffffff" | "rgb(r,g,b)" -> [r, g, b] */
function parseColor(css) {
  if (css[0] === "#") {
    const h = css.slice(1);
    const n = h.length === 3
      ? parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16)
      : parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = CSS_RGB.exec(css);
  return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
}

export class VLWFont {
  static async load(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load ${url}`);
    return new VLWFont(await r.arrayBuffer());
  }

  constructor(buffer) {
    const dv = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const count = dv.getInt32(0);
    this.size = dv.getInt32(8);
    this.ascent = dv.getInt32(16);
    this.descent = dv.getInt32(20);
    // Processing's default: textLeading = (ascent + descent) * 1.275
    this.leading = Math.round((this.ascent + this.descent) * 1.275);

    this.glyphs = new Map();
    let head = 24;
    let bits = 24 + count * 28;
    for (let i = 0; i < count; i++) {
      const g = {
        code: dv.getInt32(head),
        height: dv.getInt32(head + 4),
        width: dv.getInt32(head + 8),
        setWidth: dv.getInt32(head + 12),
        topExtent: dv.getInt32(head + 16),
        leftExtent: dv.getInt32(head + 20),
      };
      head += 28;
      g.coverage = bytes.subarray(bits, bits + g.width * g.height);
      bits += g.width * g.height;
      this.glyphs.set(g.code, g);
    }
    this._tinted = new Map();
  }

  /** One glyph, painted in `css`, as a canvas ready to blit. */
  _tint(g, css) {
    const key = `${g.code}|${css}`;
    let c = this._tinted.get(key);
    if (c) return c;

    const [r, gr, b] = parseColor(css);
    c = document.createElement("canvas");
    c.width = Math.max(g.width, 1);
    c.height = Math.max(g.height, 1);
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < g.coverage.length; i++) {
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = gr;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = g.coverage[i];
    }
    ctx.putImageData(img, 0, 0);
    this._tinted.set(key, c);
    return c;
  }

  /**
   * Advance for one character. The files carry no space glyph - they start at
   * '!' - and PFont.width() answers that by charging a space the width of an
   * 'i', so that is what the spacing has to be here too.
   */
  advance(code) {
    if (code === 32) return this.glyphs.get(105)?.setWidth ?? Math.round(this.size / 4);
    return this.glyphs.get(code)?.setWidth ?? 0;
  }

  /** Draw one line with its baseline at (x, y), as Processing's text() does. */
  drawLine(ctx, text, x, y, css) {
    let pen = x;
    for (const ch of text) {
      const code = ch.codePointAt(0);
      const g = this.glyphs.get(code);
      if (g && g.width > 0 && g.height > 0) {
        ctx.drawImage(this._tint(g, css), pen + g.leftExtent, y - g.topExtent);
      }
      pen += this.advance(code);
    }
  }

  width(text) {
    let w = 0;
    for (const ch of text) w += this.advance(ch.codePointAt(0));
    return w;
  }
}
