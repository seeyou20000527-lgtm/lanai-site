'use strict';
/**
 * 辣奶火锅 · 官方小站
 * 零依赖 Node.js：静态站点 + 账号登录后台 + 物料/排期/资讯编辑 + 二创审核
 */
const http = require('node:http');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const MATERIAL_DIR = path.join(PUBLIC_DIR, 'materials');
const MATERIAL_UPLOAD_DIR = path.join(MATERIAL_DIR, 'uploads');

let CONFIG = {};
try {
  CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
} catch (e) {
  CONFIG = {};
}
const PORT = Number(process.env.PORT || CONFIG.port || 8787);
const HOST = process.env.HOST || CONFIG.host || '127.0.0.1';
const ADMIN_USER = String(process.env.ADMIN_USER || (CONFIG.admin && CONFIG.admin.username) || 'lanai');
const ADMIN_PASS = String(process.env.ADMIN_PASSWORD || (CONFIG.admin && CONFIG.admin.password) || 'huoguo2026');
const USING_DEFAULT_ADMIN = !process.env.ADMIN_PASSWORD && !(CONFIG.admin && CONFIG.admin.password);
const LEGACY_TOKEN = String(process.env.ADMIN_TOKEN || CONFIG.adminToken || '');
const SESSION_MS = (Number(CONFIG.sessionHours) || 12) * 3600 * 1000;
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || CONFIG.trustProxy === true;
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1' || CONFIG.cookieSecure === true;
const COOKIE_FLAGS = '; HttpOnly; SameSite=Lax; Path=/' + (COOKIE_SECURE ? '; Secure' : '');
const MAX_UPLOAD = (Number(CONFIG.maxUploadMB) || 12) * 1024 * 1024;
const MAX_MATERIAL = 40 * 1024 * 1024;
const SITE_NAME = CONFIG.siteName || '辣奶火锅 · 官方小站';

const UPLOAD_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.zip', '.pdf']);
const MATERIAL_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.zip', '.mp4', '.psd', '.txt']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8', '.ics': 'text/calendar; charset=utf-8',
  '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg'
};

const IMG_UPLOAD_DIR = path.join(PUBLIC_DIR, 'assets', 'img', 'uploads');
const MUSIC_DIR = path.join(PUBLIC_DIR, 'music');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(MATERIAL_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(IMG_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(MUSIC_DIR, { recursive: true });

/* ------------------------------ 基础工具 ------------------------------ */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); } catch { return fallback; }
}

const writeQueue = new Map();
function writeJson(file, data) {
  const target = path.join(DATA_DIR, file);
  const tmp = target + '.' + process.pid + '.tmp';
  const run = async () => {
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fsp.rename(tmp, target);
  };
  const prev = writeQueue.get(file) || Promise.resolve();
  const next = prev.then(run, run).catch((err) => console.error('[write]', file, err.message));
  writeQueue.set(file, next);
  return next;
}

function sendJson(res, status, data, headers) {
  const body = JSON.stringify(data);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  }, headers || {}));
  res.end(body);
}
function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}
function safeJoin(base, requestPath) {
  const clean = decodeURIComponent(requestPath.split('?')[0]);
  const full = path.resolve(base, '.' + path.posix.normalize('/' + clean));
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { const e = new Error('too large'); e.status = 413; reject(e); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function safeJsonBody(req, limit) {
  try {
    const raw = (await readBody(req, limit || 512 * 1024)).toString('utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch { return null; }
}
function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xff) return xff;
  }
  return req.socket.remoteAddress || 'unknown';
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
  });
  return out;
}
function timingEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* ------------------------------ 会话 ------------------------------ */
const sessions = new Map();
function newSession() {
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, { user: ADMIN_USER, exp: Date.now() + SESSION_MS });
  return sid;
}
function sessionUser(req) {
  const sid = parseCookies(req)['lanai_sid'];
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(sid); return null; }
  return s;
}
function isAdmin(req) {
  if (sessionUser(req)) return true;
  const token = req.headers['x-admin-token'];
  return Boolean(LEGACY_TOKEN) && timingEqual(token || '', LEGACY_TOKEN);
}
setInterval(() => {
  const now = Date.now();
  for (const [sid, s] of sessions) if (s.exp < now) sessions.delete(sid);
}, 10 * 60 * 1000).unref();

const cmHits = new Map();
function commentLimited(ip) {
  const now = Date.now();
  const hits = (cmHits.get(ip) || []).filter((t) => now - t < 60000);
  hits.push(now);
  cmHits.set(ip, hits);
  return hits.length > 8;
}

const loginHits = new Map();
function loginLimited(ip) {
  const now = Date.now();
  const hits = (loginHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  loginHits.set(ip, hits);
  return hits.length > 8;
}

/* ------------------------------ 站点数据 ------------------------------ */
async function buildSitePayload() {
  const site = readJson('site.json', {});
  const stats = readJson('stats.json', { downloads: {} });
  const liveOverride = readJson('live.json', null);
  const fanart = readJson('fanart.json', { items: [] });
  const items = Array.isArray(fanart.items) ? fanart.items : [];
  const approved = items.filter((i) => i.status === 'approved');

  const materials = await Promise.all((site.materials || []).map(async (m) => {
    let size = 0;
    try {
      const full = m.file && m.file.startsWith('/materials/uploads/')
        ? safeJoin(MATERIAL_UPLOAD_DIR, m.file.replace('/materials/uploads', ''))
        : safeJoin(PUBLIC_DIR, m.file || '');
      if (full) size = (await fsp.stat(full)).size;
    } catch { /* ignore */ }
    return Object.assign({}, m, { size, downloads: Number((stats.downloads || {})[m.id]) || 0 });
  }));

  const music = (site.music || []).map((m) => Object.assign({}, m, {
    downloads: Number((stats.musicDownloads || {})[m.id]) || 0
  }));

  return {
    siteName: SITE_NAME,
    profile: site.profile || {},
    live: liveOverride || site.live || { isLive: false },
    schedule: site.schedule || [],
    news: site.news || [],
    materials,
    music,
    rules: site.rules || { allowed: [], forbidden: [], notes: [] },
    songs: site.songs || [],
    notices: site.notices || [],
    upload: site.upload || {},
    counts: {
      materials: materials.length,
      fanart: approved.length,
      events: (site.schedule || []).length
    },
    fanart: approved.slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((i) => ({ id: i.id, title: i.title, author: i.author, category: i.category, link: i.link || '', image: i.image, createdAt: i.createdAt }))
  };
}

/* ------------------------------ 静态 ------------------------------ */
async function serveStatic(req, res, urlPath, opts) {
  const options = opts || {};
  const baseDir = options.base || PUBLIC_DIR;
  let filePath = safeJoin(baseDir, urlPath);
  if (!filePath) return sendText(res, 403, 'Forbidden');
  try {
    let stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stat = await fsp.stat(filePath);
    }
    const ext = path.extname(filePath).toLowerCase();
    const etag = 'W/"' + stat.size.toString(16) + '-' + Math.floor(stat.mtimeMs).toString(16) + '"';
    if (!options.attachment && req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag }); return res.end();
    }
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': options.attachment ? 'no-store' : (ext === '.html' ? 'no-cache' : 'public, max-age=3600')
    };
    if (!options.attachment) headers.ETag = etag;
    if (options.attachment) {
      const name = options.filename || path.basename(filePath);
      headers['Content-Disposition'] =
        'attachment; filename="' + name.replace(/[^\x20-\x7e]/g, '_') + '"; filename*=UTF-8\'\'' + encodeURIComponent(name);
    }
    const range = req.headers.range;
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = s ? parseInt(s, 10) : 0;
      const end = e ? Math.min(parseInt(e, 10), stat.size - 1) : stat.size - 1;
      if (start >= stat.size || end < start) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': headers['Content-Type'],
        'Content-Length': end - start + 1,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
        'Accept-Ranges': 'bytes',
        'Cache-Control': headers['Cache-Control']
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    if (!options.attachment) headers['Accept-Ranges'] = 'bytes';
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EISDIR') return serve404(req, res);
    console.error('[static]', err.message);
    sendText(res, 500, 'Server Error');
  }
}
function serve404(req, res) {
  const page = path.join(PUBLIC_DIR, '404.html');
  if (fs.existsSync(page)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(page).pipe(res);
  } else sendText(res, 404, '404 Not Found');
}

/* ------------------------------ 认证 ------------------------------ */
async function apiLogin(req, res) {
  const ip = clientIp(req);
  if (loginLimited(ip)) return sendJson(res, 429, { error: '尝试次数太多，十分钟后再试。' });
  const body = await safeJsonBody(req);
  if (!body) return sendJson(res, 400, { error: '请求格式不正确。' });
  const toAscii = (s) => String(s)
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ');
  const user = toAscii(body.username || '').trim();
  const pass = toAscii(body.password || '');
  const okUser = timingEqual(user.toLowerCase(), ADMIN_USER.toLowerCase());
  const okPass = timingEqual(pass, ADMIN_PASS) || timingEqual(pass.trim(), ADMIN_PASS);
  if (!okUser || !okPass) {
    return sendJson(res, 401, { error: '账号或密码不对。账号是 ' + ADMIN_USER + '，密码区分大小写，注意别带上空格。' });
  }
  const sid = newSession();
  sendJson(res, 200, { ok: true, user: ADMIN_USER }, {
    'Set-Cookie': 'lanai_sid=' + sid + COOKIE_FLAGS + '; Max-Age=' + Math.floor(SESSION_MS / 1000)
  });
}
function apiLogout(req, res) {
  const sid = parseCookies(req)['lanai_sid'];
  if (sid) sessions.delete(sid);
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'lanai_sid=' + COOKIE_FLAGS + '; Max-Age=0' });
}
function apiMe(req, res) {
  const s = sessionUser(req);
  sendJson(res, 200, { loggedIn: Boolean(s), user: s ? s.user : null });
}

/* ------------------------------ 二创 ------------------------------ */
async function apiFanartUpload(req, res) {
  const ip = clientIp(req);
  if (loginLimited('fanart:' + ip)) return sendJson(res, 429, { error: '投稿太频繁啦，歇一会儿再来。' });
  if (Number(req.headers['content-length'] || 0) > MAX_UPLOAD) {
    return sendJson(res, 413, { error: '文件太大，单个作品请控制在 ' + (MAX_UPLOAD / 1024 / 1024) + ' MB 以内。' });
  }
  let meta;
  try { meta = JSON.parse(decodeURIComponent(String(req.headers['x-fanart-meta'] || '{}'))); }
  catch { return sendJson(res, 400, { error: '投稿信息格式不正确。' }); }

  const author = String(meta.author || '').trim().slice(0, 24);
  const title = String(meta.title || '').trim().slice(0, 40);
  const link = String(meta.link || '').trim().slice(0, 200);
  const category = String(meta.category || '其他').trim().slice(0, 12);
  const filename = String(meta.filename || 'work.png');
  const ext = path.extname(filename).toLowerCase();

  if (!author || !title) return sendJson(res, 400, { error: '昵称和作品名都要填哦。' });
  if (!UPLOAD_EXT.has(ext)) return sendJson(res, 400, { error: '只收图片（png / jpg / webp / gif）或 zip 压缩包。' });
  if (meta.consent !== true) return sendJson(res, 400, { error: '请先确认同意二创投稿规则。' });
  if (link && !/^https?:\/\//i.test(link)) return sendJson(res, 400, { error: '作品链接需要以 http(s):// 开头。' });

  let body;
  try { body = await readBody(req, MAX_UPLOAD); }
  catch { return sendJson(res, 413, { error: '文件太大，单个作品请控制在 ' + (MAX_UPLOAD / 1024 / 1024) + ' MB 以内。' }); }
  if (!body.length) return sendJson(res, 400, { error: '没有收到文件内容。' });

  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const safeName = id + ext;
  await fsp.writeFile(path.join(UPLOAD_DIR, safeName), body);

  const db = readJson('fanart.json', { items: [] });
  db.items = Array.isArray(db.items) ? db.items : [];
  db.items.push({
    id, title, author, category, link,
    image: '/uploads/' + safeName,
    originalName: path.basename(filename).slice(0, 80),
    bytes: body.length, status: 'pending',
    createdAt: new Date().toISOString(), ip
  });
  await writeJson('fanart.json', db);
  sendJson(res, 201, { ok: true, id, message: '收到啦！审核通过后就会出现在展厅。' });
}

function apiAdminFanart(req, res) {
  const db = readJson('fanart.json', { items: [] });
  const items = (db.items || []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  sendJson(res, 200, {
    items,
    counts: {
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      rejected: items.filter((i) => i.status === 'rejected').length
    }
  });
}

async function apiAdminFanartStatus(req, res, id) {
  const body = await safeJsonBody(req);
  if (!body) return sendJson(res, 400, { error: '请求格式不正确。' });
  const status = String(body.status || '');
  if (!['pending', 'approved', 'rejected'].includes(status)) return sendJson(res, 400, { error: '状态不合法。' });
  const db = readJson('fanart.json', { items: [] });
  const item = (db.items || []).find((i) => i.id === id);
  if (!item) return sendJson(res, 404, { error: '找不到这条投稿。' });
  item.status = status;
  item.reviewedAt = new Date().toISOString();
  await writeJson('fanart.json', db);
  sendJson(res, 200, { ok: true, item });
}

async function apiAdminFanartDelete(req, res, id) {
  const db = readJson('fanart.json', { items: [] });
  const idx = (db.items || []).findIndex((i) => i.id === id);
  if (idx < 0) return sendJson(res, 404, { error: '找不到这条投稿。' });
  db.items.splice(idx, 1);
  await writeJson('fanart.json', db);
  sendJson(res, 200, { ok: true });
}

/* ------------------------------ 后台编辑 ------------------------------ */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n || 200);

function sanitizeSection(section, value) {
  if (section === 'profile') {
    const p = value || {};
    const out = {};
    ['name', 'nameEn', 'handle', 'tagline', 'intro', 'qqGroup', 'uid', 'spaceUrl', 'liveUrl', 'email', 'avatar', 'art', 'artAlt', 'logo'].forEach((k) => {
      out[k] = clean(p[k], k === 'intro' ? 200 : 200);
    });
    out.bio = (Array.isArray(p.bio) ? p.bio : []).slice(0, 6).map((t) => clean(t, 600));
    out.tags = (Array.isArray(p.tags) ? p.tags : []).slice(0, 10).map((t) => clean(t, 16));
    out.facts = (Array.isArray(p.facts) ? p.facts : []).slice(0, 8).map((f) => ({ label: clean(f && f.label, 16), value: clean(f && f.value, 40) }));
    return out;
  }
  if (section === 'schedule') {
    return (Array.isArray(value) ? value : []).slice(0, 300).map((e) => ({
      date: DATE_RE.test(e && e.date) ? e.date : '',
      time: TIME_RE.test(e && e.time) ? e.time : '20:30',
      title: clean(e && e.title, 80),
      type: clean(e && e.type, 8) || '杂谈',
      note: clean(e && e.note, 80)
    })).filter((e) => e.date && e.title);
  }
  if (section === 'news') {
    return (Array.isArray(value) ? value : []).slice(0, 100).map((n) => ({
      date: DATE_RE.test(n && n.date) ? n.date : '',
      tag: clean(n && n.tag, 8),
      title: clean(n && n.title, 80),
      text: clean(n && n.text, 400),
      link: clean(n && n.link, 200)
    })).filter((n) => n.title);
  }
  if (section === 'materials') {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).slice(0, 100).map((m) => {
      let id = clean(m && m.id, 40).replace(/[^a-zA-Z0-9_-]/g, '');
      if (!id || seen.has(id)) id = 'mat-' + Math.random().toString(36).slice(2, 8);
      seen.add(id);
      return {
        id,
        title: clean(m && m.title, 60),
        desc: clean(m && m.desc, 160),
        category: clean(m && m.category, 12) || '其他',
        file: clean(m && m.file, 300),
        cover: clean(m && m.cover, 300),
        format: clean(m && m.format, 10).toUpperCase(),
        res: clean(m && m.res, 30)
      };
    }).filter((m) => m.title && m.file);
  }
  if (section === 'music') {
    return (Array.isArray(value) ? value : []).slice(0, 200).map((m, i) => ({
      id: clean(m && m.id, 40).replace(/[^a-zA-Z0-9_-]/g, '') || ('m' + i),
      title: clean(m && m.title, 60),
      artist: clean(m && m.artist, 40) || '辣奶火锅',
      cover: clean(m && m.cover, 300),
      lyrics: clean(m && m.lyrics, 8000),
      bpm: Math.min(300, Math.max(20, Number(m && m.bpm) || 90)),
      bili: clean(m && m.bili, 300),
      file: clean(m && m.file, 300),
      size: Number(m && m.size) || 0,
      createdAt: m && m.createdAt ? clean(m.createdAt, 40) : new Date().toISOString()
    })).filter((m) => m.title && m.file);
  }
  if (section === 'notices') {
    return (Array.isArray(value) ? value : []).slice(0, 100).map((n, i) => {
      let id = clean(n && n.id, 40).replace(/[^a-zA-Z0-9_-]/g, '');
      if (!id) id = 'notice-' + i + '-' + Math.random().toString(36).slice(2, 6);
      return {
        id,
        date: DATE_RE.test(n && n.date) ? n.date : '',
        tag: clean(n && n.tag, 8) || '公告',
        title: clean(n && n.title, 80),
        text: clean(n && n.text, 800),
        link: clean(n && n.link, 300),
        cover: clean(n && n.cover, 300)
      };
    }).filter((n) => n.title);
  }
  if (section === 'songs') {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).slice(0, 1000).map((s, i) => {
      let id = clean(s && s.id, 40).replace(/[^a-zA-Z0-9_-]/g, '');
      if (!id || seen.has(id)) id = 'song-' + i + '-' + Math.random().toString(36).slice(2, 6);
      seen.add(id);
      return {
        id,
        title: clean(s && s.title, 60),
        artist: clean(s && s.artist, 40),
        tag: clean(s && s.tag, 8) || '华语',
        note: clean(s && s.note, 60),
        link: clean(s && s.link, 300)
      };
    }).filter((s) => s.title);
  }
  if (section === 'rules') {
    const r = value || {};
    return {
      allowed: (Array.isArray(r.allowed) ? r.allowed : []).slice(0, 12).map((t) => clean(t, 80)),
      forbidden: (Array.isArray(r.forbidden) ? r.forbidden : []).slice(0, 12).map((t) => clean(t, 80)),
      notes: (Array.isArray(r.notes) ? r.notes : []).slice(0, 8).map((n) => ({ title: clean(n && n.title, 30), text: clean(n && n.text, 300) }))
    };
  }
  return null;
}

async function apiAdminSaveSection(req, res) {
  const body = await safeJsonBody(req);
  if (!body) return sendJson(res, 400, { error: '请求格式不正确。' });
  const section = String(body.section || '');
  const value = sanitizeSection(section, body.value);
  if (!value) return sendJson(res, 400, { error: '未知的内容区块。' });
  const site = readJson('site.json', {});
  site[section] = value;
  await writeJson('site.json', site);
  sendJson(res, 200, { ok: true, section, value });
}

async function apiAdminImage(req, res) {
  let meta;
  try { meta = JSON.parse(decodeURIComponent(String(req.headers['x-image-meta'] || '{}'))); }
  catch { return sendJson(res, 400, { error: '图片信息格式不正确。' }); }
  const field = String(meta.field || 'image').replace(/[^a-z0-9]/gi, '') || 'image';
  const ext = path.extname(String(meta.filename || 'x.png')).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    return sendJson(res, 400, { error: '只支持 png / jpg / webp。' });
  }
  let body;
  try { body = await readBody(req, 10 * 1024 * 1024); }
  catch { return sendJson(res, 413, { error: '图片太大，10 MB 以内。' }); }
  if (!body.length) return sendJson(res, 400, { error: '没有收到图片。' });
  const name = field + '-' + Date.now().toString(36) + ext;
  await fsp.writeFile(path.join(IMG_UPLOAD_DIR, name), body);
  sendJson(res, 200, { ok: true, url: '/assets/img/uploads/' + name });
}

async function apiAdminMusic(req, res) {
  let meta;
  try { meta = JSON.parse(decodeURIComponent(String(req.headers['x-music-meta'] || '{}'))); }
  catch { return sendJson(res, 400, { error: '音乐信息格式不正确。' }); }
  const title = clean(meta.title, 60).trim();
  if (!title) return sendJson(res, 400, { error: '给这首歌起个名字吧。' });
  const ext = path.extname(String(meta.filename || 'song.mp3')).toLowerCase();
  if (!['.mp3', '.m4a', '.wav', '.ogg'].includes(ext)) {
    return sendJson(res, 400, { error: '支持 mp3 / m4a / wav / ogg。' });
  }
  let body;
  try { body = await readBody(req, 60 * 1024 * 1024); }
  catch { return sendJson(res, 413, { error: '音频太大，60 MB 以内。' }); }
  if (!body.length) return sendJson(res, 400, { error: '没有收到音频。' });

  const id = 'm' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  const name = id + ext;
  await fsp.writeFile(path.join(MUSIC_DIR, name), body);

  const item = {
    id, title,
    artist: clean(meta.artist, 40) || '辣奶火锅',
    cover: clean(meta.cover, 300) || '/assets/img/avatar.png',
    lyrics: clean(meta.lyrics, 8000),
    bpm: Math.min(300, Math.max(20, Number(meta.bpm) || 90)),
    bili: clean(meta.bili, 300),
    file: '/music/' + name,
    size: body.length,
    createdAt: new Date().toISOString()
  };
  const site = readJson('site.json', {});
  site.music = Array.isArray(site.music) ? site.music : [];
  site.music.push(item);
  await writeJson('site.json', site);
  sendJson(res, 201, { ok: true, item });
}

async function apiAdminMaterialUpload(req, res) {
  if (Number(req.headers['content-length'] || 0) > MAX_MATERIAL) {
    return sendJson(res, 413, { error: '文件太大（上限 40 MB）。' });
  }
  let meta;
  try { meta = JSON.parse(decodeURIComponent(String(req.headers['x-material-meta'] || '{}'))); }
  catch { return sendJson(res, 400, { error: '物料信息格式不正确。' }); }
  const title = clean(meta.title, 60).trim();
  const filename = String(meta.filename || 'file.png');
  const ext = path.extname(filename).toLowerCase();
  if (!title) return sendJson(res, 400, { error: '给物料起个名字吧。' });
  if (!MATERIAL_EXT.has(ext)) return sendJson(res, 400, { error: '支持 png / jpg / webp / gif / zip / mp4 / psd / txt。' });

  let body;
  try { body = await readBody(req, MAX_MATERIAL); }
  catch { return sendJson(res, 413, { error: '文件太大（上限 40 MB）。' }); }
  if (!body.length) return sendJson(res, 400, { error: '没有收到文件。' });

  const slug = (clean(meta.slug, 30) || 'mat').replace(/[^a-zA-Z0-9_-]/g, '') || 'mat';
  const id = slug + '-' + Date.now().toString(36);
  const safeName = id + ext;
  await fsp.writeFile(path.join(MATERIAL_UPLOAD_DIR, safeName), body);

  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(safeName);
  const item = {
    id,
    title,
    desc: clean(meta.desc, 160),
    category: clean(meta.category, 12) || '其他',
    file: '/materials/uploads/' + safeName,
    cover: isImage ? '/materials/uploads/' + safeName : '/assets/img/material-default.png',
    format: ext.replace('.', '').toUpperCase(),
    res: clean(meta.res, 30)
  };
  const site = readJson('site.json', {});
  site.materials = Array.isArray(site.materials) ? site.materials : [];
  site.materials.push(item);
  await writeJson('site.json', site);
  sendJson(res, 201, { ok: true, item });
}

async function apiAdminMaterialDelete(req, res, id) {
  const site = readJson('site.json', {});
  const before = (site.materials || []).length;
  site.materials = (site.materials || []).filter((m) => m.id !== id);
  if (site.materials.length === before) return sendJson(res, 404, { error: '没有这个物料。' });
  await writeJson('site.json', site);
  sendJson(res, 200, { ok: true });
}

async function apiAdminLive(req, res) {
  const body = await safeJsonBody(req);
  if (!body) return sendJson(res, 400, { error: '请求格式不正确。' });
  const next = {
    isLive: Boolean(body.isLive),
    title: clean(body.title, 80),
    startedAt: body.isLive ? (body.startedAt || new Date().toISOString()) : ''
  };
  await writeJson('live.json', next);
  sendJson(res, 200, { ok: true, live: next });
}

async function apiMusicDownload(req, res, id) {
  const site = readJson('site.json', {});
  const track = (site.music || []).find((m) => m.id === id);
  if (!track) return sendJson(res, 404, { error: '没有这首歌。' });
  const stats = readJson('stats.json', { downloads: {} });
  stats.musicDownloads = stats.musicDownloads || {};
  stats.musicDownloads[id] = (Number(stats.musicDownloads[id]) || 0) + 1;
  writeJson('stats.json', stats);
  const ext = path.extname(track.file).toLowerCase();
  const filename = (track.title || 'song').replace(/[\\/:*?"<>|]/g, '_') + ext;
  return serveStatic(req, res, track.file, { attachment: true, filename });
}

/* ------------------------------ 留言 ------------------------------ */
function apiCommentsGet(req, res, url) {
  const track = String(url.searchParams.get('track') || '');
  const db = readJson('comments.json', { items: [] });
  const items = (db.items || []).filter((c) => c.trackId === track).slice(-200);
  sendJson(res, 200, { items });
}

async function apiCommentsPost(req, res) {
  const ip = clientIp(req);
  if (commentLimited(ip)) {
    return sendJson(res, 429, { error: '留言太快啦，歇一会儿再发。' });
  }
  const body = await safeJsonBody(req, 4 * 1024);
  if (!body) return sendJson(res, 400, { error: '请求格式不正确。' });
  const trackId = clean(body.trackId, 40);
  const name = clean(body.name, 16).trim() || '匿名宝贝';
  const text = clean(body.text, 200).trim();
  if (!text) return sendJson(res, 400, { error: '写点什么再发吧。' });
  const site = readJson('site.json', {});
  if (!(site.music || []).some((m) => m.id === trackId)) {
    return sendJson(res, 404, { error: '没有这首歌。' });
  }
  const db = readJson('comments.json', { items: [] });
  db.items = Array.isArray(db.items) ? db.items : [];
  const item = {
    id: 'c' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
    trackId, name, text, createdAt: new Date().toISOString()
  };
  db.items.push(item);
  if (db.items.length > 5000) db.items = db.items.slice(-5000);
  await writeJson('comments.json', db);
  sendJson(res, 201, { ok: true, item });
}

function apiAdminOverview(req, res) {
  const site = readJson('site.json', {});
  const stats = readJson('stats.json', { downloads: {} });
  const db = readJson('fanart.json', { items: [] });
  const items = db.items || [];
  const totalDownloads = Object.values(stats.downloads || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  sendJson(res, 200, {
    counts: {
      materials: (site.materials || []).length,
      events: (site.schedule || []).length,
      news: (site.news || []).length,
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      downloads: totalDownloads
    },
    live: readJson('live.json', site.live || { isLive: false })
  });
}

/* ------------------------------ 下载 / 日历 ------------------------------ */
async function apiDownload(req, res, id) {
  const site = readJson('site.json', {});
  const material = (site.materials || []).find((m) => m.id === id);
  if (!material) return sendJson(res, 404, { error: '没有这个物料。' });
  const stats = readJson('stats.json', { downloads: {} });
  stats.downloads = stats.downloads || {};
  stats.downloads[id] = (Number(stats.downloads[id]) || 0) + 1;
  writeJson('stats.json', stats);

  const ext = path.extname(material.file).toLowerCase();
  const filename = (material.title || 'material').replace(/[\\/:*?"<>|]/g, '_') + ext;
  if (material.file.startsWith('/materials/uploads/')) {
    return serveStatic(req, res, '/' + path.basename(material.file), { base: MATERIAL_UPLOAD_DIR, attachment: true, filename });
  }
  return serveStatic(req, res, material.file, { attachment: true, filename });
}

function escapeIcs(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function apiIcs(req, res) {
  const site = readJson('site.json', {});
  const p = site.profile || {};
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lanai Hotpot//Schedule//CN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcs((p.name || '辣奶火锅') + ' · 直播排期'),
    'X-WR-TIMEZONE:Asia/Shanghai',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Shanghai', 'BEGIN:STANDARD',
    'DTSTART:19700101T000000', 'TZOFFSETFROM:+0800', 'TZOFFSETTO:+0800',
    'TZNAME:CST', 'END:STANDARD', 'END:VTIMEZONE'
  ];
  for (const s of site.schedule || []) {
    const date = String(s.date || '').replace(/-/g, '');
    const time = String(s.time || '20:00').replace(':', '') + '00';
    if (date.length !== 8) continue;
    const start = new Date(s.date + 'T' + (s.time || '20:00') + ':00+08:00');
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + 120 * 60000);
    const endLocal = new Date(end.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace(/[-:]/g, '');
    lines.push('BEGIN:VEVENT', 'UID:' + date + 'T' + time + '-lanai@local', 'DTSTAMP:' + stamp,
      'DTSTART;TZID=Asia/Shanghai:' + date + 'T' + time,
      'DTEND;TZID=Asia/Shanghai:' + endLocal,
      'SUMMARY:' + escapeIcs('【直播】' + (s.title || '辣奶火锅')),
      'DESCRIPTION:' + escapeIcs((s.note || '') + ' 类型：' + (s.type || '直播')),
      'URL:' + (p.liveUrl || ''), 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const body = lines.join('\r\n') + '\r\n';
  res.writeHead(200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="lanai-schedule.ics"',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

/* ------------------------------ 路由 ------------------------------ */
async function handle(req, res) {
  const parsed = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = parsed.pathname;
  const method = req.method || 'GET';

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (method === 'GET' || method === 'HEAD') {
    if (pathname === '/' || pathname === '/index.html') return serveStatic(req, res, '/index.html');
    if (pathname === '/admin' || pathname === '/admin/') return serveStatic(req, res, '/admin.html');
    if (pathname === '/api/site') return sendJson(res, 200, await buildSitePayload());
    if (pathname === '/api/comments') return apiCommentsGet(req, res, parsed);
    if (pathname === '/api/schedule.ics') return apiIcs(req, res);
    if (pathname === '/api/health') return sendJson(res, 200, { ok: true, uptime: Math.round(process.uptime()) });
    if (pathname.startsWith('/uploads/')) {
      const name = pathname.slice('/uploads/'.length);
      if (!/^[a-z0-9]+\.(png|jpe?g|webp|gif|zip|pdf)$/i.test(name)) return sendText(res, 404, 'Not Found');
      const db = readJson('fanart.json', { items: [] });
      const visible = (db.items || []).some((i) => i.image === '/uploads/' + name && i.status === 'approved');
      if (!visible && !isAdmin(req) && !timingEqual(parsed.searchParams.get('t') || '', LEGACY_TOKEN)) {
        return sendText(res, 404, 'Not Found');
      }
      return serveStatic(req, res, '/' + name, { base: UPLOAD_DIR });
    }
    if (pathname.startsWith('/music/download/')) return apiMusicDownload(req, res, pathname.slice('/music/download/'.length));
    if (pathname.startsWith('/download/')) return apiDownload(req, res, pathname.slice('/download/'.length));
  }

  if (pathname === '/api/auth/login' && method === 'POST') return apiLogin(req, res);
  if (pathname === '/api/auth/logout' && method === 'POST') return apiLogout(req, res);
  if (pathname === '/api/auth/me' && method === 'GET') return apiMe(req, res);

  if (pathname === '/api/fanart' && method === 'PUT') return apiFanartUpload(req, res);
  if (pathname === '/api/comments' && method === 'POST') return apiCommentsPost(req, res);

  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return sendJson(res, 401, { error: '请先登录后台。' });
    if (pathname === '/api/admin/overview' && method === 'GET') return apiAdminOverview(req, res);
    if (pathname === '/api/admin/fanart' && method === 'GET') return apiAdminFanart(req, res);
    if (pathname.startsWith('/api/admin/fanart/') && method === 'POST') {
      return apiAdminFanartStatus(req, res, pathname.slice('/api/admin/fanart/'.length).split('/')[0]);
    }
    if (pathname.startsWith('/api/admin/fanart/') && method === 'DELETE') {
      return apiAdminFanartDelete(req, res, pathname.slice('/api/admin/fanart/'.length).split('/')[0]);
    }
    if (pathname === '/api/admin/site' && method === 'PUT') return apiAdminSaveSection(req, res);
    if (pathname === '/api/admin/image' && method === 'PUT') return apiAdminImage(req, res);
    if (pathname === '/api/admin/music' && method === 'PUT') return apiAdminMusic(req, res);
    if (pathname === '/api/admin/material' && method === 'PUT') return apiAdminMaterialUpload(req, res);
    if (pathname.startsWith('/api/admin/material/') && method === 'DELETE') {
      return apiAdminMaterialDelete(req, res, pathname.slice('/api/admin/material/'.length).split('/')[0]);
    }
    if (pathname === '/api/admin/live' && method === 'POST') return apiAdminLive(req, res);
    return sendJson(res, 404, { error: '没有这个接口。' });
  }

  if (method === 'GET' || method === 'HEAD') return serveStatic(req, res, pathname);
  return sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  res.on('finish', () => {
    if (process.env.QUIET) return;
    console.log(String(res.statusCode) + ' ' + req.method + ' ' + req.url + ' ' + (Date.now() - started) + 'ms');
  });
  handle(req, res).catch((err) => {
    console.error('[error]', err);
    if (!res.headersSent) sendJson(res, 500, { error: '服务器开小差了，稍后再试。' });
    else res.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  🍲 ' + SITE_NAME);
  console.log('  → 前台 http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT);
  console.log('  → 后台 http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT + '/admin');
  console.log('  → 账号 ' + ADMIN_USER + '（密码见 config.json 或环境变量）');
  if (USING_DEFAULT_ADMIN) {
    console.log('');
    console.log('  ⚠️  当前用的是默认后台密码 huoguo2026');
    console.log('     上线前请修改：环境变量 ADMIN_PASSWORD，或 config.json 里的 admin.password');
  }
  console.log('');
});

['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => {
    console.log('收到 ' + sig + '，正在关闭…');
    server.close(() => {
      Promise.all(Array.from(writeQueue.values())).finally(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000);
    });
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error('端口 ' + PORT + ' 已被占用，改 config.json 里的 port。');
  else console.error(err);
  process.exit(1);
});
