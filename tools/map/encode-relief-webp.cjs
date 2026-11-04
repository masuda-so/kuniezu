/* Encode display hillshade, one tile at a time, without a server.
   This stage only creates a NEW output directory. build-height-cache.py owns
   validation and atomic publication of the completed distribution manifest.
   CLI: --source SHADE_ROOT --output NEW_DIR [--previous MAP_DIR]
        [--quality 0.82] [--chrome CHROME_PATH]
   SHADE_ROOT contains shade-{1,4,8}/manifest.json and height manifests.
   PNG compression bytes may differ; reuse requires equal decoded pixel SHA. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const LEVELS = [1, 4, 8];
const PIXELS = 'RGBA8 row-major, unpremultiplied, SHA-256 of decoded bytes';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function safe(root, name) {
  const absolute = path.resolve(root, name);
  if (absolute === path.resolve(root) || !absolute.startsWith(path.resolve(root) + path.sep))
    throw Error('Path escapes input directory: ' + name);
  return absolute;
}

class BrowserEncoder {
  constructor(binary) {
    this.profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kuniezu-relief-'));
    this.pending = new Map(); this.seq = 0; this.buffer = ''; this.failure = null;
    this.child = spawn(binary, ['--headless', '--disable-gpu', '--no-first-run',
      '--no-default-browser-check', '--disable-background-networking',
      '--user-data-dir=' + this.profile, '--remote-debugging-pipe', 'about:blank'],
      {stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']});
    const fail = e => {
      this.failure = e;
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(e); }
      this.pending.clear();
    };
    this.child.on('error', fail);
    this.child.on('exit', (code, signal) => fail(Error(`Chrome exited: ${code} ${signal || ''}`)));
    this.child.stdio[3].on('error', fail);
    this.child.stdio[4].on('data', data => {
      this.buffer += data.toString(); let i;
      while ((i = this.buffer.indexOf('\0')) >= 0) {
        const s = this.buffer.slice(0, i); this.buffer = this.buffer.slice(i + 1);
        if (!s) continue;
        let m; try { m = JSON.parse(s); } catch (e) { fail(e); return; }
        const p = this.pending.get(m.id);
        if (p) { clearTimeout(p.timer); this.pending.delete(m.id);
          m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); }
      }
    });
  }
  call(method, params = {}, sid = this.session) {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error('Chrome timed out: ' + method)); }, 30000);
      this.pending.set(id, {resolve, reject, timer});
      this.child.stdio[3].write(JSON.stringify({id, method, params, ...(sid ? {sessionId: sid} : {})}) + '\0');
    });
  }
  async start() {
    const target = await this.call('Target.createTarget', {url: 'about:blank'}, null);
    this.session = (await this.call('Target.attachToTarget', {targetId: target.targetId, flatten: true}, null)).sessionId;
    await this.call('Runtime.enable');
    this.version = (await this.call('Browser.getVersion', {}, null)).product;
  }
  async encode(png, quality) {
    const expression = `(async()=>{const im=new Image();im.src='data:image/png;base64,${png.toString('base64')}';
      await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
      c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/webp',${quality}).split(',')[1];})()`;
    const result = await this.call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (result.exceptionDetails || typeof result.result?.value !== 'string') throw Error('PNG conversion failed');
    const buffer = Buffer.from(result.result.value, 'base64');
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') throw Error('WebP unavailable');
    return buffer;
  }
  async close() {
    if (!this.failure) { try { await this.call('Browser.close', {}, null); } catch {} }
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill();
      await new Promise(resolve => { this.child.once('exit', resolve); setTimeout(resolve, 1000).unref(); });
    }
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    fs.rmSync(this.profile, {recursive: true, force: true});
  }
}

async function encode({source, output, previous, quality = 0.82, chrome}) {
  if (!(quality > 0 && quality <= 1)) throw Error('Quality must be in (0, 1]');
  if (fs.existsSync(output)) throw Error('Existing output is preserved: ' + output);
  const old = previous && fs.existsSync(path.join(previous, 'relief.json')) ? read(path.join(previous, 'relief.json')) : null;
  const inputs = LEVELS.map(f => {
    const dir = path.join(source, 'shade-' + f), mf = path.join(dir, 'manifest.json'), m = read(mf);
    const hmf = path.join(source, 'height-' + f, 'manifest.json');
    if (m.factor !== f || m.elevationManifestSha256 !== sha(fs.readFileSync(hmf))) throw Error('Height/shade manifest differs');
    const keys = new Set();
    for (const t of m.tiles) {
      const key = t.col + ':' + t.row;
      if (keys.has(key) || !/^[0-9a-f]{64}$/.test(t.pixelSha256)) throw Error('Invalid tile or pixel checksum');
      keys.add(key);
      if (sha(fs.readFileSync(safe(dir, t.file))) !== t.sha256) throw Error('Source PNG checksum differs: ' + t.file);
    }
    return {f, dir, m, mf, hmf};
  });
  const first = inputs[0].m;
  for (const {m} of inputs) for (const key of ['gridSha256', 'sourceHeightmapSha256', 'sourceHeightmapMetadataSha256', 'projectionSha256'])
    if (!first[key] || m[key] !== first[key]) throw Error('Inconsistent source metadata: ' + key);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  const stage = fs.mkdtempSync(path.join(path.dirname(output), '.relief-encode-'));
  let browser, published = false, reused = 0, converted = 0;
  try {
    const out = {generated: 'tools/map/build-height-cache.py', quality, sourcePixelEncoding: PIXELS, levels: []};
    for (const key of ['gridSha256', 'elevationManifestSha256', 'sourceHeightmapSha256', 'sourceHeightmapMetadataSha256',
      'projectionSha256', 'source', 'product', 'acquired', 'license', 'notice', 'disclaimer', 'shading']) out[key] = first[key];
    for (const {f, dir, m, mf, hmf} of inputs) {
      const oldLevel = old?.levels.find(l => l.factor === f);
      const oldTiles = new Map((oldLevel?.tiles || []).map(t => [t.col + ':' + t.row, t]));
      const dst = path.join(stage, 'relief-' + f); fs.mkdirSync(dst);
      const tiles = [];
      for (const t of m.tiles) {
        const png = fs.readFileSync(safe(dir, t.file)), prior = oldTiles.get(t.col + ':' + t.row);
        if (sha(png) !== t.sha256) throw Error('Source PNG changed during encoding');
        const canReuse = Boolean(old?.quality === quality && old?.sourcePixelEncoding === PIXELS &&
          prior?.sourcePixelSha256 === t.pixelSha256 && prior.width === png.readUInt32BE(16) && prior.height === png.readUInt32BE(20));
        let bytes, sourceSha256, encoder;
        if (canReuse) {
          bytes = fs.readFileSync(safe(previous, oldLevel.dir + '/' + prior.file));
          if (sha(bytes) !== prior.sha256) throw Error('Previous WebP checksum differs');
          sourceSha256 = prior.sourceSha256; encoder = prior.encoder || old.encoder || {method: 'retained distribution'}; reused++;
        } else {
          if (!browser) { browser = new BrowserEncoder(chrome || process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'); await browser.start(); }
          bytes = await browser.encode(png, quality); sourceSha256 = t.sha256;
          encoder = {method: 'Chrome canvas WebP', browser: browser.version}; converted++;
        }
        const file = t.file.replace(/\.png$/, '.webp');
        fs.writeFileSync(safe(dst, file), bytes);
        tiles.push({file, col: t.col, row: t.row, width: png.readUInt32BE(16), height: png.readUInt32BE(20),
          sourceSha256, previousSourceSha256: prior?.sourceSha256 || null, regeneratedSourceSha256: t.sha256,
          sourcePixelSha256: t.pixelSha256, sourcePixelsEquivalentToPrevious: prior?.sourcePixelSha256 === t.pixelSha256,
          reusedFromPrevious: canReuse, sha256: sha(bytes), encoder});
      }
      out.levels.push({factor: f, dir: 'relief-' + f, elevationManifestSha256: sha(fs.readFileSync(hmf)),
        shadeManifestSha256: sha(fs.readFileSync(mf)), tiles});
    }
    fs.writeFileSync(path.join(stage, 'relief.json'), JSON.stringify(out, null, 2) + '\n');
    if (fs.existsSync(output)) throw Error('Output appeared during generation');
    fs.renameSync(stage, output); published = true;
    return {reused, converted, output};
  } finally {
    if (browser) await browser.close();
    if (!published) fs.rmSync(stage, {recursive: true, force: true});
  }
}

if (require.main === module) {
  const options = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '');
    if (!['source', 'output', 'previous', 'quality', 'chrome'].includes(key) || !process.argv[i + 1]) throw Error('Invalid option');
    options[key] = key === 'quality' ? Number(process.argv[i + 1]) : path.resolve(process.argv[i + 1]);
  }
  if (!options.source || !options.output) throw Error('--source and --output are required; use build-height-cache.py for publication');
  encode(options).then(result => console.log(JSON.stringify(result))).catch(e => { console.error(e.stack); process.exitCode = 1; });
}
module.exports = {encode};
