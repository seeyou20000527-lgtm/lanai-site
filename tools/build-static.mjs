import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(process.cwd());
const PUB = path.join(ROOT, 'public');
const DOCS = path.join(ROOT, 'docs');
const REPO = 'seeyou20000527-lgtm/lanai-site';
const BRANCH = 'data';
const CDN = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}/`;

const MAP = [
  ['/music/', 'public/music/'],
  ['/materials/uploads/', 'public/materials/uploads/'],
  ['/assets/img/uploads/', 'public/assets/img/uploads/'],
  ['/uploads/', 'uploads/']
];

function toCdn(u) {
  if (!u || typeof u !== 'string') return u;
  if (/^https?:|^data:|^#/.test(u)) return u;
  for (const [pre, repo] of MAP) {
    if (u.startsWith(pre)) return CDN + repo + u.slice(pre.length);
  }
  return u;
}

function deepRewrite(node) {
  if (Array.isArray(node)) return node.map(deepRewrite);
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = deepRewrite(node[k]);
    return out;
  }
  if (typeof node === 'string') return toCdn(node);
  return node;
}

async function main() {
  let site;
  const token = (process.env.GITHUB_TOKEN || '').trim();
  if (token) {
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/contents/data/site.json?ref=${BRANCH}&t=${Date.now()}`, {
        headers: { Authorization: 'Bearer ' + token, 'User-Agent': 'build', Accept: 'application/vnd.github+json' }
      });
      const j = await r.json();
      site = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
    } catch (e) { console.warn('remote read failed, using local', e.message); }
  }
  if (!site) site = JSON.parse(await fs.readFile(path.join(ROOT, 'data/site.json'), 'utf8'));

  const rewritten = deepRewrite(site);

  await fs.rm(DOCS, { recursive: true, force: true });
  await fs.cp(PUB, DOCS, { recursive: true });
  await fs.rm(path.join(DOCS, 'admin.html'), { force: true });
  // 媒体走 CDN，静态站不重复存一份
  await fs.rm(path.join(DOCS, 'music'), { recursive: true, force: true });
  await fs.rm(path.join(DOCS, 'materials'), { recursive: true, force: true });
  await fs.rm(path.join(DOCS, 'assets/img/uploads'), { recursive: true, force: true });
  await fs.writeFile(path.join(DOCS, 'site-data.json'), JSON.stringify(rewritten));

  // 注入静态版 shim：/api/site → 本地 json；其它写接口给出友好提示
  let html = await fs.readFile(path.join(DOCS, 'index.html'), 'utf8');
  const shim = `<script>
(function () {
  var real = window.fetch ? window.fetch.bind(window) : null;
  window.__STATIC__ = true;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (url.indexOf('/api/site') === 0) {
      return real('site-data.json', { cache: 'no-store' });
    }
    if (url.indexOf('/api/comments') === 0) {
      if (method === 'GET') return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({ error: '静态版暂时不能发评论，去正式站试试～' }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
    }
    if (url.indexOf('/api/') === 0) {
      return Promise.resolve(new Response(JSON.stringify({ error: '静态版只读' }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
    }
    return real(input, init);
  };
})();
</script>`;
  html = html.replace('<script src="/assets/js/app.js', shim + '\n<script src="/assets/js/app.js');
  await fs.writeFile(path.join(DOCS, 'index.html'), html);

  // 404 页
  try { await fs.copyFile(path.join(DOCS, '404.html'), path.join(DOCS, '404.html')); } catch (e) {}
  await fs.writeFile(path.join(DOCS, '.nojekyll'), '');

  console.log('[static] built docs/ — songs:', (rewritten.songs || []).length,
    'music:', (rewritten.music || []).length,
    'notices:', (rewritten.notices || []).length);
}

main().catch((e) => { console.error(e); process.exit(1); });
