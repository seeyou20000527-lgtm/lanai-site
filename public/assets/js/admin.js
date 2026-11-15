/* 辣奶火锅 · 站务后台 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var state = { tab: 'overview', site: null, fanart: null, overview: null, draft: null, fanTab: 'pending', user: null };

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg, bad) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast on' + (bad ? ' err' : '');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'toast'; }, 3000);
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(path, opts).then(function (r) {
      return r.text().then(function (t) {
        var body = {};
        try { body = JSON.parse(t || '{}'); } catch (e) {}
        if (r.status === 401) { showLogin(); throw new Error('请先登录'); }
        if (!r.ok) throw new Error(body.error || ('HTTP ' + r.status));
        // 通知前台标签页刷新数据
        if (opts.method && opts.method !== 'GET') {
          try { localStorage.setItem('site-updated', String(Date.now())); } catch (e) {}
        }
        return body;
      });
    });
  }
  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch (e) { return ''; }
  }

  var TABS = [
    { id: 'overview', label: '概览' },
    { id: 'fanart', label: '二创审核' },
    { id: 'calendar', label: '月历' },
    { id: 'notices', label: '公告' },
    { id: 'news', label: '资讯' },
    { id: 'materials', label: '物料' },
    { id: 'comments', label: '评论' },
    { id: 'songs', label: '歌单' },
    { id: 'music', label: '音乐' },
    { id: 'profile', label: '资料' }
  ];

  function showLogin() {
    $('#loginView').hidden = false;
    $('#app').hidden = true;
  }
  function showApp() {
    $('#loginView').hidden = true;
    $('#app').hidden = false;
  }

  /* ---------------- 数据 ---------------- */
  function loadAll() {
    return Promise.all([api('/api/site'), api('/api/admin/fanart'), api('/api/admin/overview')]).then(function (res) {
      state.site = res[0];
      state.fanart = res[1];
      state.overview = res[2];
      showApp();
      var h = String(location.hash || '').replace('#', '');
      if (h && TABS.some(function (t) { return t.id === h; })) state.tab = h;
      renderSide();
      render();
    });
  }

  function renderSide() {
    var pending = (state.fanart && state.fanart.counts.pending) || 0;
    $('#sideNav').innerHTML = TABS.map(function (t) {
      return '<a data-tab="' + t.id + '" class="' + (state.tab === t.id ? 'on' : '') + '">' + t.label +
        (t.id === 'fanart' && pending ? '<span class="n">' + pending + '</span>' : '') + '</a>';
    }).join('');
  }

  function setTab(tab) {
    if (!TABS.some(function (t) { return t.id === tab; })) return;
    state.tab = tab;
    state.draft = null;
    if (location.hash !== '#' + tab) {
      try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    }
    $('#sideNav').querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === tab); });
    render();
  }

  /* ---------------- 渲染入口 ---------------- */
  function render() {
    var view = $('#view');
    var titles = { overview: ['概览', '一眼看完站点状态'], fanart: ['二创审核', '通过的投稿才会出现在前台展厅'], calendar: ['月历', '直播排期，改完点保存'], news: ['资讯', '首页「最近的事」内容'], comments: ['评论', '管理每条评论，可以删除'], materials: ['物料', '上传新物料、改标题和描述'], notices: ['公告', '当前活动放第一条，其余为往期活动'], songs: ['歌单', '直播会唱的歌，前台「歌单」页展示'], music: ['音乐', '上传自己唱的翻唱，前台可播放和下载'], profile: ['资料', '简介、QQ 群、B 站链接'] };
    $('#pageTitle').textContent = titles[state.tab][0];
    $('#pageSub').textContent = titles[state.tab][1];
    $('#headActions').innerHTML = '';
    view.oninput = null;
    view.onclick = null;
    view.innerHTML = '';

    if (state.tab === 'overview') renderOverview(view);
    else if (state.tab === 'fanart') renderFanart(view);
    else if (state.tab === 'calendar') renderCalendar(view);
    else if (state.tab === 'notices') renderNotices(view);
    else if (state.tab === 'news') renderNews(view);
    else if (state.tab === 'materials') renderMaterials(view);
    else if (state.tab === 'comments') renderCommentsAdmin(view);
    else if (state.tab === 'songs') renderSongs(view);
    else if (state.tab === 'music') renderMusic(view);
    else if (state.tab === 'profile') renderProfile(view);
  }

  /* ---------------- 概览 ---------------- */
  function renderOverview(view) {
    var c = state.overview.counts || {};
    var live = state.overview.live || {};
    view.innerHTML =
      (state.overview.persist === false
        ? '<div class="persist-warn">⚠️ 云端同步未开启：现在上传的图片/音乐只存在临时磁盘，服务重启就会丢。请在 Render 的环境变量里配置 <code>GITHUB_TOKEN</code>。</div>'
        : '') +
      '<div class="stats">' +
      '<div class="stat"><b>' + (c.pending || 0) + '</b><span>待审核二创</span></div>' +
      '<div class="stat"><b>' + (c.approved || 0) + '</b><span>已上架作品</span></div>' +
      '<div class="stat"><b>' + (c.materials || 0) + '</b><span>物料数量</span></div>' +
      '<div class="stat"><b>' + (c.downloads || 0) + '</b><span>物料下载总数</span></div>' +
      '</div>' +
      '<div class="panel"><h2>直播状态 <span class="sub">开启后前台会显示「正在直播」</span></h2>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
      '<label class="switch"><input type="checkbox" id="liveCheck"' + (live.isLive ? ' checked' : '') + '><i></i><span>正在直播</span></label>' +
      '<input id="liveTitle" value="' + esc(live.title || '') + '" placeholder="直播标题，例：沸腾杂谈 · 今晚聊点辣的" style="flex:1;min-width:240px;padding:9px 12px;border:1px solid var(--line);border-radius:10px">' +
      '<button class="btn btn-solid btn-sm" data-act="save-live">保存</button>' +
      '</div></div>' +
      '<div class="panel"><h2>快捷开始</h2><div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" data-go="fanart">去审核二创</button>' +
      '<button class="btn btn-sm" data-go="calendar">改月历</button>' +
      '<button class="btn btn-sm" data-go="materials">上传物料</button>' +
      '<button class="btn btn-sm" data-go="profile">改简介</button>' +
      '</div></div>';

    view.onclick = function (e) {
      var go = e.target.closest('[data-go]');
      if (go) return setTab(go.getAttribute('data-go'));
      if (e.target.closest('[data-act="save-live"]')) {
        api('/api/admin/live', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isLive: $('#liveCheck').checked, title: $('#liveTitle').value.trim() })
        }).then(function () { toast('直播状态已更新'); return loadAll(); }).catch(function (err) { toast(err.message, true); });
      }
    };
  }

  /* ---------------- 二创审核 ---------------- */
  function renderFanart(view) {
    var items = (state.fanart.items || []).filter(function (i) { return i.status === state.fanTab; });
    var counts = state.fanart.counts || {};
    view.innerHTML =
      '<div class="panel"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">' +
      '<div class="seg" id="fanTabs">' +
      ['pending:待审核', 'approved:已上架', 'rejected:已拒绝'].map(function (s) {
        var p = s.split(':');
        return '<button data-fantab="' + p[0] + '" class="' + (state.fanTab === p[0] ? 'on' : '') + '">' + p[1] + ' ' + (counts[p[0]] || 0) + '</button>';
      }).join('') + '</div>' +
      '<span style="font-size:11.5px;color:var(--ink-3)">审核通过 = 立刻上架到前台展厅</span></div></div>' +
      (items.length ? '<div class="pending-grid">' + items.map(function (i) {
        var isImg = /\.(png|jpe?g|webp|gif)$/i.test(i.image || '');
        return '<article class="pcard">' +
          (isImg ? '<img loading="lazy" src="' + esc(i.image) + '" alt="" onerror="this.onerror=null;this.src=\'/assets/img/material-default.png\'">' : '<div class="ph">📦</div>') +
          '<div class="b"><h4>' + esc(i.title) + '</h4>' +
          '<p>' + esc(i.author) + ' · ' + esc(i.category) + ' · ' + fmtDate(i.createdAt) + '</p>' +
          '<div class="acts">' +
          '<button class="btn btn-sm btn-solid" data-act="approve" data-id="' + esc(i.id) + '">' + (i.status === 'approved' ? '重新上架' : '通过') + '</button>' +
          '<button class="btn btn-sm" data-act="reject" data-id="' + esc(i.id) + '">拒绝</button>' +
          '<button class="btn btn-sm" data-act="delete" data-id="' + esc(i.id) + '">删除</button>' +
          '</div></div></article>';
      }).join('') + '</div>' : '<div class="empty">这一类暂时没有投稿。</div>');

    view.onclick = function (e) {
      var t = e.target.closest('[data-fantab]');
      if (t) { state.fanTab = t.getAttribute('data-fantab'); return renderFanart(view); }
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
      if (act === 'delete') {
        if (!confirm('删除后不可恢复，确定删除这条投稿？')) return;
        api('/api/admin/fanart/' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function () { toast('已删除'); return refreshAll(); }).catch(function (err) { toast(err.message, true); });
        return;
      }
      api('/api/admin/fanart/' + encodeURIComponent(id), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: act === 'approve' ? 'approved' : 'rejected' })
      }).then(function () { toast(act === 'approve' ? '已通过，前台展厅可见' : '已拒绝'); return refreshAll(); })
        .catch(function (err) { toast(err.message, true); });
    };
  }

  /* ---------------- 月历 ---------------- */
  function renderCalendar(view) {
    if (!state.draft) {
      state.draft = (state.site.schedule || []).slice().sort(function (a, b) {
        return (a.date + a.time).localeCompare(b.date + b.time);
      }).map(function (e) { return Object.assign({}, e); });
    }
    var types = ['杂谈', '歌回', '游戏', '活动', '休息'];
    view.innerHTML =
      '<div class="panel ev-editor">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap">' +
      '<h2 style="margin:0">排期 <span class="sub">共 ' + state.draft.length + ' 场</span></h2>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-sm" data-act="add-ev">+ 加一场</button>' +
      '<button class="btn btn-sm btn-solid" data-act="save-ev">保存排期</button></div></div>' +
      '<div class="row head-row"><span>日期</span><span>时间</span><span>标题</span><span>类型</span><span>备注</span><span></span></div>' +
      state.draft.map(function (e, i) {
        return '<div class="row">' +
          '<input type="date" value="' + esc(e.date) + '" data-k="' + i + '" data-f="date">' +
          '<input type="time" value="' + esc(e.time || '20:30') + '" data-k="' + i + '" data-f="time">' +
          '<input value="' + esc(e.title) + '" placeholder="直播标题" data-k="' + i + '" data-f="title">' +
          '<select data-k="' + i + '" data-f="type">' + types.map(function (t) { return '<option' + (t === e.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>' +
          '<input value="' + esc(e.note || '') + '" placeholder="备注" data-k="' + i + '" data-f="note">' +
          '<button class="del" data-act="del-ev" data-i="' + i + '">✕</button>' +
          '</div>';
      }).join('') +
      '<p style="font-size:11px;color:var(--ink-3);margin:12px 0 0">提示：日期用 2026-11-14 这种格式；保存后前台月历立即可见。</p></div>';

    view.oninput = function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.k !== undefined) state.draft[+el.dataset.k][el.dataset.f] = el.value;
    };
    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'add-ev') {
        state.draft.push({ date: new Date().toISOString().slice(0, 10), time: '20:30', title: '', type: '杂谈', note: '' });
        return renderCalendar(view);
      }
      if (act === 'del-ev') {
        state.draft.splice(+b.getAttribute('data-i'), 1);
        return renderCalendar(view);
      }
      if (act === 'save-ev') {
        var val = state.draft.filter(function (e) { return e.date && e.title; })
          .sort(function (a, b2) { return (a.date + a.time).localeCompare(b2.date + b2.time); });
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'schedule', value: val })
        }).then(function (r) {
          state.site.schedule = r.value; state.draft = null;
          toast('排期已保存，前台已更新'); renderCalendar(view);
        }).catch(function (err) { toast(err.message, true); });
      }
    };
  }

  /* ---------------- 音乐 ---------------- */
  var PALETTES = { cream: '奶白', rose: '雾粉', moon: '月白', sage: '苔绿', ink: '墨黑' };
  var THEME_PRESETS = ['#f6ede5', '#f6dfd9', '#e7edf6', '#e6eede', '#2f2a28'];
  function paletteOptions(sel) {
    return Object.keys(PALETTES).map(function (k) {
      return '<option value="' + k + '"' + (k === (sel || 'cream') ? ' selected' : '') + '>' + PALETTES[k] + '</option>';
    }).join('');
  }
  function renderMusic(view) {
    var list = state.site.music || [];
    view.innerHTML =
      '<div class="panel"><h2>上传新歌 <span class="sub">mp3 / m4a / wav / ogg，≤ 60 MB</span></h2>' +
      '<div class="form-grid">' +
      '<div class="fld full"><label>音频文件</label><input type="file" id="musFile" accept=".mp3,.m4a,.wav,.ogg,audio/*"></div>' +
      '<div class="fld"><label>歌名</label><input id="musTitle" placeholder="例：起风了"></div>' +
      '<div class="fld"><label>歌手</label><input id="musArtist" placeholder="辣奶火锅"></div>' +
      '<div class="fld"><label>BPM（影响 CD 转速，默认 90）</label><input id="musBpm" type="number" min="20" max="300" value="90"></div>' +
      '<div class="fld"><label>展开区配色（玻璃底色）</label>' +
      '<div class="theme-row"><input type="color" id="musTheme" value="#f6ede5">' +
      '<div class="swatches" data-theme-for="musTheme">' + THEME_PRESETS.map(function (c) { return '<button type="button" class="sw" data-hex="' + c + '" style="background:' + c + '"></button>'; }).join('') + '</div></div></div>' +
      '<div class="fld"><label>B 站影片链接（选填）</label><input id="musBili" placeholder="https://www.bilibili.com/video/BV..."></div>' +
      '<div class="fld full"><label>封面</label><div class="img-row">' +
      '<img class="img-thumb" id="thumb-music" src="/assets/img/avatar.png" alt="">' +
      '<div class="img-col"><input id="musCover" placeholder="/assets/img/avatar.png">' +
      '<div class="img-actions"><button type="button" class="btn btn-sm" data-pick="music" data-input="musCover" data-ratio="1" data-after="none">上传封面</button>' +
      '<span class="img-tip">不传就用头像</span></div></div></div></div>' +
      '<div class="fld full"><label>歌词（支持 LRC 时间轴，一行一句）</label><textarea id="musLyrics" style="min-height:96px" placeholder="[00:12.30]第一句歌词&#10;[00:16.10]第二句歌词"></textarea></div>' +
      '<div class="full"><button class="btn btn-solid btn-sm" data-act="upload-music">上传并添加</button></div>' +
      '</div></div>' +
      '<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h2 style="margin:0">已有歌曲 <span class="sub">共 ' + list.length + ' 首</span></h2>' +
      '<button class="btn btn-sm btn-solid" data-act="save-music">保存修改</button></div>' +
      (list.length ? list.map(function (m, i) {
        return '<div class="music-item"><img src="' + esc(m.cover || '/assets/img/avatar.png') + '" alt="" onerror="this.onerror=null;this.src=\'/assets/img/avatar.png\'">' +
          '<div class="b"><input value="' + esc(m.title) + '" data-mi="' + i + '" data-mf="title" placeholder="歌名">' +
          '<input value="' + esc(m.artist) + '" data-mi="' + i + '" data-mf="artist" placeholder="歌手">' +
          '<div class="mi-row"><input value="' + esc(m.cover) + '" data-mi="' + i + '" data-mf="cover" placeholder="封面地址">' +
          '<input type="number" min="20" max="300" value="' + esc(m.bpm || 90) + '" data-mi="' + i + '" data-mf="bpm" placeholder="BPM">' +
          '<input value="' + esc(m.bili || '') + '" data-mi="' + i + '" data-mf="bili" placeholder="B站链接">' +
          '<span class="theme-cell"><input type="color" data-mi="' + i + '" data-mf="theme" value="' + (/^#[0-9a-f]{6}$/i.test(m.theme || '') ? m.theme : '#f6ede5') + '" title="展开区配色"></span></div>' +
          '<textarea data-mi="' + i + '" data-mf="lyrics" placeholder="歌词（支持 [00:12.30] 时间轴）">' + esc(m.lyrics) + '</textarea>' +
          '<div class="row-b"><span>' + (m.size ? (m.size / 1048576).toFixed(1) + ' MB' : '') + ' · 配色 ' + (/^#[0-9a-f]{6}$/i.test(m.theme || '') ? m.theme : '#f6ede5') + '</span>' +
          '<span><a href="' + esc(m.file) + '" target="_blank">试听</a>　<button class="del" data-act="del-music" data-id="' + esc(m.id) + '">删除</button></span></div></div></div>';
      }).join('') : '<div class="empty">还没有上传歌曲。</div>') + '</div>';

    view.oninput = function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.mi !== undefined) state.site.music[+el.dataset.mi][el.dataset.mf] = el.value;
    };
    view.onchange = function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.mi !== undefined) state.site.music[+el.dataset.mi][el.dataset.mf] = el.value;
      if (el.dataset && el.dataset.themeFor) {
        var inp = document.getElementById(el.dataset.themeFor);
        if (inp) { inp.value = el.value; }
      }
    };
    view.addEventListener('click', function (e) {
      var b = e.target.closest('.sw');
      if (!b) return;
      var box = b.closest('.swatches');
      var inp = box && document.getElementById(box.dataset.themeFor);
      if (inp) inp.value = b.dataset.hex;
    });
    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'upload-music') {
        var file = $('#musFile').files[0];
        if (!file) return toast('先选一个音频文件', true);
        var title = $('#musTitle').value.trim();
        if (!title) return toast('给歌起个名字', true);
        var meta = {
          title: title, artist: $('#musArtist').value.trim(),
          cover: $('#musCover').value.trim(), lyrics: $('#musLyrics').value,
          bpm: $('#musBpm').value, bili: $('#musBili').value.trim(),
          theme: $('#musTheme').value || '#f6ede5', filename: file.name
        };
        b.disabled = true; b.textContent = '上传中…';
        fetch('/api/admin/music', {
          method: 'PUT',
          headers: { 'x-music-meta': encodeURIComponent(JSON.stringify(meta)) },
          body: file
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) throw new Error(j.error || '上传失败');
            return j;
          });
        }).then(function (j) {
          if (j && j.warning) toast(j.warning, true);
          else toast('已上传并同步到云端，前台马上能听');
          return refreshAll();
        })
          .catch(function (err) { toast(err.message, true); b.disabled = false; b.textContent = '上传并添加'; });
      }
      if (act === 'save-music') {
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'music', value: state.site.music })
        }).then(function (r) { state.site.music = r.value; toast('歌单信息已保存'); return refreshAll(); })
          .catch(function (err) { toast(err.message, true); });
      }
      if (act === 'save-track') {
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'music', value: state.site.music })
        }).then(function (r) { state.site.music = r.value; toast('这首已保存'); return refreshAll(); })
          .catch(function (err) { toast(err.message, true); });
      }
      if (act === 'del-music') {
        if (!confirm('从列表移除这首歌？（音频文件仍留在 public/music）')) return;
        var id = b.getAttribute('data-id');
        var next = (state.site.music || []).filter(function (m) { return m.id !== id; });
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'music', value: next })
        }).then(function () { toast('已移除'); return refreshAll(); }).catch(function (err) { toast(err.message, true); });
      }
    };
  }

  /* ---------------- 公告 ---------------- */
  function renderNotices(view) {
    if (!state.draft) state.draft = (state.site.notices || []).map(function (n) { return Object.assign({}, n); });
    view.innerHTML =
      '<div class="panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap">' +
      '<h2 style="margin:0">公告 <span class="sub">共 ' + state.draft.length + ' 条</span></h2>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-sm" data-act="add-notice">+ 发一条</button>' +
      '<button class="btn btn-sm btn-solid" data-act="save-notices">保存公告</button></div></div>' +
      state.draft.map(function (n, i) {
        return '<div class="notice-item">' +
          '<div class="top">' +
          '<input type="date" value="' + esc(n.date) + '" data-k="' + i + '" data-f="date">' +
          '<input value="' + esc(n.tag) + '" placeholder="活动" data-k="' + i + '" data-f="tag">' +
          '<input value="' + esc(n.title) + '" placeholder="标题" data-k="' + i + '" data-f="title">' +
          '<div class="acts">' +
          (i === 0 ? '<span class="badge">当前</span>' : '<button class="btn btn-sm" data-act="pin-notice" data-i="' + i + '">置顶</button>') +
          '<button class="del" data-act="del-notice" data-i="' + i + '">✕</button></div></div>' +
          '<textarea placeholder="正文：活动时间、参与方式、注意事项…" data-k="' + i + '" data-f="text">' + esc(n.text) + '</textarea>' +
          '<input value="' + esc(n.link) + '" placeholder="跳转链接（选填，例如 #/fanart 或 https://…）" data-k="' + i + '" data-f="link" style="margin-top:8px">' +
          '</div>';
      }).join('') +
      '<p style="font-size:11px;color:var(--ink-3);margin:12px 0 0">第一条会显示在前台「公告」页最上面，其余收进「往期活动」。点「置顶」可以调整顺序。</p></div>';

    view.oninput = function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.k !== undefined) state.draft[+el.dataset.k][el.dataset.f] = el.value;
    };
    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'add-notice') {
        state.draft.unshift({ id: '', date: new Date().toISOString().slice(0, 10), tag: '活动', title: '', text: '', link: '' });
        return renderNotices(view);
      }
      if (act === 'del-notice') { state.draft.splice(+b.getAttribute('data-i'), 1); return renderNotices(view); }
      if (act === 'pin-notice') {
        var i = +b.getAttribute('data-i');
        var item = state.draft.splice(i, 1)[0];
        state.draft.unshift(item);
        return renderNotices(view);
      }
      if (act === 'save-notices') {
        var val = state.draft.filter(function (n) { return n.title && n.title.trim(); });
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'notices', value: val })
        }).then(function (r) { state.site.notices = r.value; state.draft = null; toast('公告已保存'); renderNotices(view); })
          .catch(function (err) { toast(err.message, true); });
      }
    };
  }

  /* ---------------- 资讯 ---------------- */
  function renderNews(view) {
    if (!state.draft) state.draft = (state.site.news || []).map(function (n) { return Object.assign({}, n); });
    view.innerHTML =
      '<div class="panel news-editor">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap">' +
      '<h2 style="margin:0">资讯 <span class="sub">共 ' + state.draft.length + ' 条</span></h2>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-sm" data-act="add-news">+ 加一条</button>' +
      '<button class="btn btn-sm btn-solid" data-act="save-news">保存资讯</button></div></div>' +
      '<div class="row head-row"><span>日期</span><span>标签</span><span>标题</span><span>内容</span><span>链接</span><span></span></div>' +
      state.draft.map(function (n, i) {
        return '<div class="row">' +
          '<input type="date" value="' + esc(n.date) + '" data-k="' + i + '" data-f="date">' +
          '<input value="' + esc(n.tag) + '" placeholder="物料" data-k="' + i + '" data-f="tag">' +
          '<input value="' + esc(n.title) + '" placeholder="标题" data-k="' + i + '" data-f="title">' +
          '<input value="' + esc(n.text) + '" placeholder="一句话说明" data-k="' + i + '" data-f="text">' +
          '<input value="' + esc(n.link || '') + '" placeholder="#materials" data-k="' + i + '" data-f="link">' +
          '<button class="del" data-act="del-news" data-i="' + i + '">✕</button></div>';
      }).join('') + '</div>';

    view.oninput = function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.k !== undefined) state.draft[+el.dataset.k][el.dataset.f] = el.value;
    };
    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'add-news') {
        state.draft.unshift({ date: new Date().toISOString().slice(0, 10), tag: '公告', title: '', text: '', link: '' });
        return renderNews(view);
      }
      if (act === 'del-news') { state.draft.splice(+b.getAttribute('data-i'), 1); return renderNews(view); }
      if (act === 'save-news') {
        var val = state.draft.filter(function (n) { return n.title; });
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'news', value: val })
        }).then(function (r) { state.site.news = r.value; state.draft = null; toast('资讯已保存'); renderNews(view); })
          .catch(function (err) { toast(err.message, true); });
      }
    };
  }

  /* ---------------- 物料 ---------------- */
  function renderMaterials(view) {
    view.innerHTML =
      '<div class="panel"><h2>上传新物料</h2>' +
      '<div class="form-grid">' +
      '<div class="fld full"><label>文件（图片 / 影片 mp4·webm·mov / zip / psd，≤ 60 MB）</label>' +
      '<input type="file" id="matFile" accept=".png,.jpg,.jpeg,.webp,.gif,.zip,.mp4,.webm,.mov,.psd,.txt"></div>' +
      '<div class="fld"><label>标题</label><input id="matTitle" placeholder="例：冬季壁纸 · 奶油"></div>' +
      '<div class="fld"><label>分类</label><input id="matCat" placeholder="壁纸 / 头像 / 立绘 / 直播素材" value="壁纸"></div>' +
      '<div class="fld full"><label>描述</label><input id="matDesc" placeholder="一句话说明"></div>' +
      '<div class="fld"><label>格式（自动识别可留空）</label><input id="matFormat" placeholder="PNG"></div>' +
      '<div class="fld"><label>尺寸</label><input id="matRes" placeholder="1920×1080"></div>' +
      '<div class="full"><button class="btn btn-solid btn-sm" data-act="upload-mat">上传并添加</button></div>' +
      '</div><p style="font-size:11px;color:var(--ink-3);margin:10px 0 0">图片会自动当封面；影片会从已有图片物料里随机挑一张当封面；zip 等文件用默认封面。</p></div>' +
      '<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h2 style="margin:0">现有物料 <span class="sub">共 ' + (state.site.materials || []).length + ' 份</span></h2>' +
      '<button class="btn btn-sm btn-solid" data-act="save-mats">保存修改</button></div>' +
      '<div class="mats">' + (state.site.materials || []).map(function (m, i) {
        return '<div class="mat-edit"><img src="' + esc(m.cover || '/assets/img/material-default.png') + '" alt="" onerror="this.onerror=null;this.src=\'/assets/img/material-default.png\'">' +
          '<div class="b"><input value="' + esc(m.title) + '" data-mi="' + i + '" data-mf="title">' +
          '<input value="' + esc(m.desc) + '" data-mi="' + i + '" data-mf="desc">' +
          '<div style="display:flex;gap:6px"><input value="' + esc(m.category) + '" data-mi="' + i + '" data-mf="category" style="flex:1">' +
          '<input value="' + esc(m.res || '') + '" data-mi="' + i + '" data-mf="res" style="width:96px"></div>' +
          '<div class="foot"><span>' + esc(m.format) + ' · ' + (m.downloads || 0) + ' 次下载</span>' +
          '<button class="del" data-act="del-mat" data-id="' + esc(m.id) + '">删除</button></div></div></div>';
      }).join('') + '</div></div>';

    view.oninput = function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.mi !== undefined) state.site.materials[+el.dataset.mi][el.dataset.mf] = el.value;
    };
    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'save-mats') {
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'materials', value: state.site.materials })
        }).then(function (r) { toast('物料信息已保存'); return refreshAll(); }).catch(function (err) { toast(err.message, true); });
      }
      if (act === 'del-mat') {
        if (!confirm('从列表移除这个物料？（服务器上的文件不会删）')) return;
        api('/api/admin/material/' + encodeURIComponent(b.getAttribute('data-id')), { method: 'DELETE' })
          .then(function () { toast('已移除'); return refreshAll(); }).catch(function (err) { toast(err.message, true); });
      }
      if (act === 'upload-mat') {
        var file = $('#matFile').files[0];
        if (!file) return toast('先选一个文件', true);
        var title = $('#matTitle').value.trim();
        if (!title) return toast('给物料起个标题', true);
        var meta = {
          title: title, desc: $('#matDesc').value.trim(), category: $('#matCat').value.trim() || '其他',
          res: $('#matRes').value.trim(), filename: file.name, slug: 'mat'
        };
        b.disabled = true; b.textContent = '上传中…';
        fetch('/api/admin/material', {
          method: 'PUT',
          headers: { 'x-material-meta': encodeURIComponent(JSON.stringify(meta)) },
          body: file
        }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || '上传失败'); return j; }); })
          .then(function (j) {
            if (j && j.warning) toast(j.warning, true);
            else toast('物料已添加并同步到云端');
            return refreshAll();
          })
          .catch(function (err) { toast(err.message, true); b.disabled = false; b.textContent = '上传并添加'; });
      }
    };
  }

  /* ---------------- 评论 ---------------- */
  function renderCommentsAdmin(view) {
    view.innerHTML = '<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h2 style="margin:0">评论 <span class="sub" id="cmAdminCount">加载中…</span></h2>' +
      '<button class="btn btn-sm" data-act="reload-comments">刷新</button></div>' +
      '<div id="cmAdminList"><p class="more-tip">加载中…</p></div></div>';

    function load() {
      api('/api/admin/comments').then(function (j) {
        var items = j.items || [];
        $('#cmAdminCount').textContent = '共 ' + (j.total || items.length) + ' 条';
        if (!items.length) {
          $('#cmAdminList').innerHTML = '<p class="more-tip">还没有评论。</p>';
          return;
        }
        $('#cmAdminList').innerHTML = items.map(function (c) {
          var d = new Date(c.createdAt);
          var ds = isNaN(d) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          return '<div class="cm-row"><div class="cm-main"><div class="cm-top"><b>' + esc(c.name) + '</b>' +
            '<span class="cm-track">' + esc(c.trackTitle) + '</span><time>' + ds + '</time>' +
            (c.likes ? '<span class="cm-like-n">♥ ' + c.likes + '</span>' : '') + '</div>' +
            '<p>' + esc(c.text) + '</p></div>' +
            '<button class="del" data-act="del-comment" data-id="' + esc(c.id) + '">删除</button></div>';
        }).join('');
      }).catch(function (err) {
        $('#cmAdminList').innerHTML = '<p class="more-tip">' + esc(err.message) + '</p>';
      });
    }
    load();

    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.getAttribute('data-act') === 'reload-comments') return load();
      if (b.getAttribute('data-act') === 'del-comment') {
        var id = b.getAttribute('data-id');
        if (!confirm('删除这条评论？删了就找不回来了。')) return;
        b.disabled = true;
        api('/api/admin/comments/' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function () { toast('已删除'); load(); })
          .catch(function (err) { toast(err.message, true); b.disabled = false; });
      }
    };
  }

  /* ---------------- 歌单 ---------------- */
  function renderSongs(view) {
    if (!state.draft) state.draft = (state.site.songs || []).map(function (s) { return Object.assign({}, s); });
    view.innerHTML =
      '<div class="panel song-editor">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap">' +
      '<h2 style="margin:0">歌单 <span class="sub">共 ' + state.draft.length + ' 首</span></h2>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-sm" data-act="add-song">+ 加一首</button>' +
      '<button class="btn btn-sm btn-solid" data-act="save-songs">保存歌单</button></div></div>' +
      '<div class="song-search"><input id="songAdminSearch" value="' + esc(state.songQ || '') + '" placeholder="搜索歌名 / 歌手"></div>' +
      '<div class="row head-row"><span>#</span><span>歌名</span><span>歌手 / 原唱</span><span>标签</span><span>备注</span><span>链接（选填）</span><span>荐</span><span>学</span>><span></span></div>' +
      '<div id="songRows"></div>' +
      '<p class="more-tip" id="songMoreTip"></p>' +
      '<p style="font-size:11px;color:var(--ink-3);margin:12px 0 0">标签会变成前台的筛选按钮，建议统一用「国语 / 日语 / 闽南语 / 英语」。</p></div>';

    function draw() {
      var q = String(state.songQ || '').trim().toLowerCase();
      var ps = state.draft.map(function (s, i) { return { s: s, i: i }; });
      if (q) ps = ps.filter(function (p) { return (p.s.title + ' ' + (p.s.artist || '')).toLowerCase().indexOf(q) >= 0; });
      var show = ps.slice(0, q ? 150 : 80);
      $('#songRows').innerHTML = show.map(function (p) {
        var s = p.s, i = p.i;
        return '<div class="row">' +
          '<span style="font-size:11.5px;color:var(--ink-3)">' + (i + 1) + '</span>' +
          '<input value="' + esc(s.title) + '" placeholder="歌名" data-k="' + i + '" data-f="title">' +
          '<input value="' + esc(s.artist) + '" placeholder="歌手" data-k="' + i + '" data-f="artist">' +
          '<input value="' + esc(s.tag) + '" placeholder="国语" data-k="' + i + '" data-f="tag">' +
          '<input value="' + esc(s.note) + '" placeholder="备注" data-k="' + i + '" data-f="note">' +
          '<input value="' + esc(s.link) + '" placeholder="https://…" data-k="' + i + '" data-f="link">' +
          '<label class="tog' + (s.rec ? ' on' : '') + '" title="推荐区"><input type="checkbox" data-k="' + i + '" data-f="rec"' + (s.rec ? ' checked' : '') + '>★</label>' +
          '<label class="tog' + (s.learning ? ' on' : '') + '" title="在学"><input type="checkbox" data-k="' + i + '" data-f="learning"' + (s.learning ? ' checked' : '') + '>✎</label>' +
          '<button class="del" data-act="del-song" data-i="' + i + '">✕</button></div>';
      }).join('');
      $('#songMoreTip').textContent = ps.length > show.length
        ? '显示 ' + show.length + ' / ' + ps.length + ' 首，用上面的搜索找其余的歌'
        : '共 ' + ps.length + ' 首';
    }
    draw();
    $('#songAdminSearch').oninput = function () { state.songQ = this.value; draw(); };

    function setDraft(el) {
      if (!el.dataset || el.dataset.k === undefined) return;
      var k = +el.dataset.k, f = el.dataset.f;
      state.draft[k][f] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'checkbox') {
        var lab = el.closest('.tog');
        if (lab) lab.classList.toggle('on', el.checked);
      }
    }
    view.oninput = function (e) { setDraft(e.target); };
    view.onchange = function (e) { if (e.target.type === 'checkbox') setDraft(e.target); };
    view.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'add-song') {
        state.draft.push({ id: '', title: '', artist: '', tag: '华语', note: '', link: '', rec: false, learning: false });
        return renderSongs(view);
      }
      if (act === 'del-song') { state.draft.splice(+b.getAttribute('data-i'), 1); return renderSongs(view); }
      if (act === 'save-songs') {
        var val = state.draft.filter(function (s) { return s.title && s.title.trim(); });
        api('/api/admin/site', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'songs', value: val })
        }).then(function (r) { state.site.songs = r.value; state.draft = null; toast('歌单已保存'); renderSongs(view); })
          .catch(function (err) { toast(err.message, true); });
      }
    };
  }

  /* ---------------- 图片裁剪 / 上传 ---------------- */
  function imgField(field, label, inputId, ratio, value, tip) {
    var style = ratio === 0 ? 'width:60px;height:60px;object-fit:contain;background:#fff' : (ratio === 1 ? '' : 'height:75px');
    return '<div class="fld"><label>' + label + '</label><div class="img-row">' +
      '<img class="img-thumb" id="thumb-' + field + '" style="' + style + '" src="' + esc(value || '/assets/img/material-default.png') + '" alt="">' +
      '<div class="img-col"><input id="' + inputId + '" value="' + esc(value || '') + '">' +
      '<div class="img-actions"><button type="button" class="btn btn-sm" data-pick="' + field + '" data-input="' + inputId + '" data-ratio="' + ratio + '">' +
      (ratio ? '上传 / 裁剪' : '上传') + '</button><span class="img-tip">' + tip + '</span></div></div></div></div>';
  }

  var crop = { img: null, ratio: 1, base: 1, zoom: 1, x: 0, y: 0, w: 320, h: 320, field: '', inputId: '' };

  function cropApply() {
    var img = crop.img;
    if (!img) return;
    var s = crop.base * crop.zoom;
    var w = img.width * s, h = img.height * s;
    crop.x = Math.min(0, Math.max(crop.w - w, crop.x));
    crop.y = Math.min(0, Math.max(crop.h - h, crop.y));
    var el = $('#cropImg');
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.transform = 'translate(' + crop.x + 'px,' + crop.y + 'px)';
  }

  function openCrop(file, target) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      crop.img = img;
      // 预览用的 <img> 一定要拿到同一个地址，否则框里是空的
      var preview = $('#cropImg');
      if (preview) preview.src = url;
      crop.field = target.field;
      crop.inputId = target.inputId;
      crop.ratio = target.ratio;
      var W = 320, H = Math.round(W / target.ratio);
      crop.w = W; crop.h = H;
      var stage = $('#cropStage');
      stage.style.width = W + 'px';
      stage.style.height = H + 'px';
      crop.base = Math.max(W / img.width, H / img.height);
      crop.zoom = 1;
      $('#cropZoom').value = 1;
      var s = crop.base;
      crop.x = (W - img.width * s) / 2;
      crop.y = img.height * s > H ? 0 : (H - img.height * s) / 2;
      cropApply();
      $('#cropModal').hidden = false;
    };
    img.onerror = function () { toast('图片读不出来，换一张试试', true); };
    img.src = url;
  }

  function uploadBlob(blob, filename, target) {
    var meta = { field: target.field, filename: filename || (target.field + '.png') };
    fetch('/api/admin/image', {
      method: 'PUT',
      headers: { 'x-image-meta': encodeURIComponent(JSON.stringify(meta)) },
      body: blob
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || '上传失败');
        return j;
      });
    }).then(function (j) {
      var input = document.getElementById(target.inputId);
      if (input) input.value = j.url;
      var thumb = document.getElementById('thumb-' + target.field);
      if (thumb) thumb.src = j.url;
      $('#cropModal').hidden = true;
      if (target.after === 'none') { toast('封面已上传'); return; }
      toast('图片已上传，正在保存…');
      var btn = $('#saveProfileBtn');
      if (btn) btn.click();
    }).catch(function (err) { toast(err.message, true); });
  }

  var pickTarget = null;
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-crop-close]')) { $('#cropModal').hidden = true; return; }
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    pickTarget = { field: b.getAttribute('data-pick'), inputId: b.getAttribute('data-input'), ratio: Number(b.getAttribute('data-ratio')), after: b.getAttribute('data-after') || 'profile' };
    $('#imgPicker').click();
  });
  $('#imgPicker').addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file || !pickTarget) return;
    if (pickTarget.ratio === 0) uploadBlob(file, file.name, pickTarget);
    else openCrop(file, pickTarget);
  });
  $('#cropZoom').addEventListener('input', function () {
    if (!crop.img) return;
    var oldS = crop.base * crop.zoom;
    var cx = (crop.w / 2 - crop.x) / oldS;
    var cy = (crop.h / 2 - crop.y) / oldS;
    crop.zoom = Number(this.value);
    var newS = crop.base * crop.zoom;
    crop.x = crop.w / 2 - cx * newS;
    crop.y = crop.h / 2 - cy * newS;
    cropApply();
  });
  $('#cropSave').addEventListener('click', function () {
    if (!crop.img) return;
    var outW = crop.ratio === 1 ? 1024 : 800;
    var outH = Math.round(outW / crop.ratio);
    var canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    var ctx = canvas.getContext('2d');
    var s = crop.base * crop.zoom;
    var k = outW / crop.w;
    ctx.drawImage(crop.img, crop.x * k, crop.y * k, crop.img.width * s * k, crop.img.height * s * k);
    canvas.toBlob(function (blob) {
      if (!blob) return toast('导出失败，换张图试试', true);
      uploadBlob(blob, crop.field + '.png', { field: crop.field, inputId: crop.inputId });
    }, 'image/png');
  });
  (function () {
    var stage = $('#cropStage');
    var dragging = false, lx = 0, ly = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (!crop.img) return;
      dragging = true; lx = e.clientX; ly = e.clientY;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      crop.x += e.clientX - lx;
      crop.y += e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      cropApply();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (k) {
      stage.addEventListener(k, function () { dragging = false; });
    });
  })();

  /* ---------------- 资料 ---------------- */
  function renderProfile(view) {
    var p = state.site.profile || {};
    var facts = p.facts || [];
    while (facts.length < 4) facts.push({ label: '', value: '' });
    view.innerHTML =
      '<div class="panel"><h2>基本资料</h2><div class="form-grid">' +
      '<div class="fld"><label>名字</label><input id="pName" value="' + esc(p.name) + '"></div>' +
      '<div class="fld"><label>英文名</label><input id="pNameEn" value="' + esc(p.nameEn) + '"></div>' +
      '<div class="fld full"><label>一句话口号</label><input id="pTagline" value="' + esc(p.tagline) + '"></div>' +
      '<div class="fld full"><label>短简介（首页）</label><textarea id="pIntro">' + esc(p.intro) + '</textarea></div>' +
      '<div class="fld full"><label>简介正文（一行一段）</label><textarea id="pBio" style="min-height:110px">' + esc((p.bio || []).join('\n')) + '</textarea></div>' +
      '<div class="fld"><label>粉丝 QQ 群</label><input id="pQQ" value="' + esc(p.qqGroup) + '"></div>' +
      '<div class="fld"><label>B 站 UID</label><input id="pUid" value="' + esc(p.uid) + '"></div>' +
      '<div class="fld"><label>B 站主页</label><input id="pSpace" value="' + esc(p.spaceUrl) + '"></div>' +
      '<div class="fld"><label>直播间</label><input id="pLive" value="' + esc(p.liveUrl) + '"></div>' +
      '<div class="fld"><label>联系邮箱</label><input id="pMail" value="' + esc(p.email) + '"></div>' +
      '<div class="fld"><label>标签（逗号分隔）</label><input id="pTags" value="' + esc((p.tags || []).join(',')) + '"></div>' +
      '</div></div>' +
      '<div class="panel"><h2>档案（简介右侧四项）</h2><div class="form-grid">' +
      facts.slice(0, 4).map(function (f, i) {
        return '<div class="fld"><label>项目 ' + (i + 1) + '</label><input id="fL' + i + '" value="' + esc(f.label) + '" placeholder="出道日"></div>' +
          '<div class="fld"><label>内容 ' + (i + 1) + '</label><input id="fV' + i + '" value="' + esc(f.value) + '" placeholder="2025.08.08"></div>';
      }).join('') + '</div></div>' +
      '<div class="panel"><h2>图片 <span class="sub">可以直接上传，传完能拖动裁剪</span></h2><div class="form-grid">' +
      imgField('avatar', '头像', 'pAvatar', 1, p.avatar, '1:1 正方形') +
      imgField('logo', 'LOGO', 'pLogo', 0, p.logo, '透明底 PNG') +
      imgField('art', '首页立绘', 'pArt', 0.8, p.art, '4:5 竖版') +
      imgField('artAlt', '简介立绘', 'pArtAlt', 0.8, p.artAlt, '4:5 竖版') +
      '</div></div>' +
      '<button class="btn btn-solid" id="saveProfileBtn" data-act="save-profile">保存资料</button>';

    view.onclick = function (e) {
      if (!e.target.closest('[data-act="save-profile"]')) return;
      var bio = $('#pBio').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      var tags = $('#pTags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var facts = [];
      for (var i = 0; i < 4; i++) {
        var l = $('#fL' + i).value.trim(), v = $('#fV' + i).value.trim();
        if (l || v) facts.push({ label: l, value: v });
      }
      var value = {
        name: $('#pName').value.trim(), nameEn: $('#pNameEn').value.trim(),
        tagline: $('#pTagline').value.trim(), intro: $('#pIntro').value.trim(),
        bio: bio, facts: facts, tags: tags,
        qqGroup: $('#pQQ').value.trim(), uid: $('#pUid').value.trim(),
        spaceUrl: $('#pSpace').value.trim(), liveUrl: $('#pLive').value.trim(),
        email: $('#pMail').value.trim(),
        avatar: $('#pAvatar').value.trim(), logo: $('#pLogo').value.trim(),
        art: $('#pArt').value.trim(), artAlt: $('#pArtAlt').value.trim(),
        handle: (state.site.profile && state.site.profile.handle) || ''
      };
      if (!value.name) return toast('名字不能为空', true);
      api('/api/admin/site', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'profile', value: value })
      }).then(function () { toast('资料已保存'); return refreshAll(); }).catch(function (err) { toast(err.message, true); });
    };
  }

  /* ---------------- 刷新 ---------------- */
  function refreshAll() {
    return loadAll().then(function () {
      var pending = state.fanart.counts.pending || 0;
      renderSide(pending);
      render();
    });
  }

  /* ---------------- 启动 ---------------- */
  $('#pwToggle').addEventListener('click', function () {
    var input = $('#password');
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? '隐藏' : '显示';
  });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errBox = $('#loginErr');
    var btn = $('#loginBtn');
    errBox.hidden = true;
    btn.disabled = true;
    btn.textContent = '登录中…';
    fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) throw new Error(body.error || ('登录失败（' + r.status + '）'));
        return body;
      });
    }).then(function () { return loadAll(); })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = '登录';
        errBox.textContent = err.message;
        errBox.hidden = false;
        toast(err.message, true);
      });
  });

  $('#logout').onclick = function () {
    api('/api/auth/logout', { method: 'POST' }).then(function () { showLogin(); }).catch(function () { showLogin(); });
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest('#sideNav a');
    if (a) setTab(a.getAttribute('data-tab'));
  });

  fetch('/api/auth/me').then(function (r) { return r.json(); }).then(function (me) {
    if (me.loggedIn) loadAll().catch(function () { showLogin(); });
    else showLogin();
  }).catch(showLogin);
})();
