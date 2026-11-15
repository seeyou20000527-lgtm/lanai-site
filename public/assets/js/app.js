/* 辣奶火锅 · 官方小站 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var site = null;
  var state = { route: 'home', navToken: 0 };
  var SONG_PAGE = 60;
  var songState = { tag: '全部', q: '', limit: 60 };

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5"/><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.5"/><path d="m4 17 4.5-4 4 3.5 3-2.5 4.5 4"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3.5 19 6v6c0 4.2-3 7-7 8.5-4-1.5-7-4.3-7-8.5V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    disc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.3"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.4 5.4 2 6H4c.6-.6 2-2 2-6z"/><path d="M10 19a2.2 2.2 0 0 0 4 0"/></svg>'
  };

  var NAV = [
    { id: 'home', label: '首页', icon: 'home' },
    { id: 'notices', label: '公告', icon: 'bell' },
    { id: 'about', label: '简介', icon: 'user' },
    { id: 'calendar', label: '月历', icon: 'calendar' },
    { id: 'songs', label: '歌单', icon: 'music' },
    { id: 'music', label: '音乐', icon: 'disc' },
    { id: 'materials', label: '物料', icon: 'download' },
    { id: 'fanart', label: '二创', icon: 'image' },
    { id: 'rules', label: '规则', icon: 'shield', hidden: true }
  ];
  var EV_MIN = 120;

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromYmd(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function fmtSize(b) { return !b ? '—' : (b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB'); }
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var TYPE = { '杂谈': 'talk', '歌回': 'sing', '游戏': 'game', '活动': 'event', '休息': 'rest' };
  var typeClass = function (t) { return TYPE[t] || 'talk'; };

  function toast(msg, bad) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast on' + (bad ? ' err' : '');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'toast'; }, 3000);
  }

  /* ---------------- 导航 / 换页 ---------------- */
  function renderNav() {
    var vis = NAV.filter(function (n) { return !n.hidden; });
    var item = function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '">' + ICONS[n.icon] + '<span>' + n.label + '</span></a>';
    };
    $('#sideNav').innerHTML = vis.map(item).join('');
    $('#tabbar').innerHTML = vis.map(item).join('');
    $$('[data-nav]').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-nav') === state.route);
    });
  }

  function routeFromHash() {
    var h = String(location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return NAV.some(function (n) { return n.id === h; }) ? h : 'home';
  }

  function go(route) {
    if (!site || route === state.route) return;
    var from = $('#page-' + state.route);
    var to = $('#page-' + route);
    if (!from || !to) return;
    state.route = route;
    renderNav();
    renderPage(route);

    // 清掉可能残留的淡出页面，避免快速连点时叠在一起
    $$('.page.leaving').forEach(function (p) { p.classList.remove('leaving'); });
    from.classList.remove('on');
    from.classList.add('leaving');

    setTimeout(function () {
      from.classList.remove('leaving');
      var cur = document.querySelector('.page.on');
      if (cur && cur !== to) cur.classList.remove('on');
      to.classList.add('on');
      window.scrollTo(0, 0);
    }, 160);
  }

  function renderPage(route) {
    if (route === 'home') renderHome();
    else if (route === 'notices') renderNotices();
    else if (route === 'about') renderAbout();
    else if (route === 'calendar') renderCal();
    else if (route === 'materials') renderMaterials();
    else if (route === 'fanart') renderGallery();
    else if (route === 'songs') renderSongs();
    else if (route === 'music') renderMusic();
    else if (route === 'rules') renderRules();
  }

  /* ---------------- 资料 ---------------- */
  function renderProfile() {
    var p = site.profile || {};
    $('#heroName').textContent = p.name || '辣奶火锅';
    $('#sideName').textContent = p.name || '辣奶火锅';
    $('#tagline').textContent = p.tagline || '';
    $('#intro').textContent = p.intro || '';
    $('#year').textContent = new Date().getFullYear();
    if (p.logo) $('#sideLogo').src = p.logo;
    if (p.art) $('#heroArt').src = p.art;
    if (p.artAlt) $('#aboutArt').src = p.artAlt;
    if (p.qqGroup) {
      $('#qqNum').textContent = p.qqGroup;
      $('#qqNum2').textContent = p.qqGroup;
      $('#mQqNum').textContent = p.qqGroup;
    }
    $('#sideSpace').href = p.spaceUrl || '#';
    $('#sideLive').href = p.liveUrl || '#';
    document.title = p.name || '辣奶火锅';
    if (site.live && site.live.isLive) {
      $('#tagline').textContent = '● 正在直播：' + (site.live.title || '辣奶火锅的直播间');
    }
    renderLiveBar();
  }

  var SNS_ICON = {
    douyin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.5 4.5 0 0 1-2.4-2.3h-2.6v9.7a2.3 2.3 0 1 1-1.9-2.25v-2.6a4.9 4.9 0 1 0 4.5 4.88V9.1a7.2 7.2 0 0 0 3.6.96V7.5a4.6 4.6 0 0 1-1.2-.17z"/></svg>',
    bili: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="4"/><path d="m8 3 3 4M16 3l-3 4"/><path d="M9.5 14v-3M14.5 14v-3" stroke-linecap="round"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10.5 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" stroke="none"/></svg>'
  };
  function renderAbout() {
    var p = site.profile || {};
    $('#bioBox').innerHTML = (p.bio || []).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    $('#factsBox').innerHTML = (p.facts || []).map(function (f) {
      return '<div><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>';
    }).join('');
    $('#tagsBox').innerHTML = (p.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    var links = [
      { icon: 'douyin', label: '抖音', sub: '@辣奶火锅', href: p.douyin || '' },
      { icon: 'bili', label: 'B 站主页', sub: 'space.bilibili.com', href: p.spaceUrl || '' },
      { icon: 'replay', label: '录播号', sub: '直播回放', href: p.replay || '' }
    ].filter(function (l) { return l.href; });
    $('#aboutLinks').innerHTML = links.map(function (l) {
      return '<a href="' + esc(l.href) + '" target="_blank" rel="noopener">' + SNS_ICON[l.icon] +
        '<span class="lbl"><b>' + esc(l.label) + '</b><small>' + esc(l.sub) + '</small></span></a>';
    }).join('');
    var side = document.getElementById('sideReplay');
    if (side) { side.href = p.replay || '#'; }
  }

  function renderLiveBar() {
    var bar = $('#liveBar');
    if (!bar) return;
    var live = site.live || {};
    var off = false;
    try { off = sessionStorage.getItem('live-bar-off') === '1'; } catch (e) {}
    if (!live.isLive || off) { bar.hidden = true; return; }
    var t = $('#liveBarTitle');
    if (t) t.textContent = live.title || '辣奶火锅的直播间';
    var go = $('#liveBarGo');
    if (go) go.href = (site.profile && site.profile.liveUrl) || 'https://live.bilibili.com/1911412880';
    bar.hidden = false;
    var close = $('#liveBarClose');
    if (close && !close._bound) {
      close._bound = true;
      close.onclick = function () {
        bar.hidden = true;
        try { sessionStorage.setItem('live-bar-off', '1'); } catch (e) {}
      };
    }
  }

  /* ---------------- 公告 ---------------- */
  function fmtDate(s) { return String(s || '').replace(/-/g, '.'); }
  function openNotice(n) {
    $('#mTitle').textContent = n.title || '公告';
    $('#mMeta').textContent = fmtDate(n.date) + ' · ' + (n.tag || '公告');
    $('#mText').textContent = n.text || '';
    $('#mLink').hidden = true;
    $('#modal').hidden = false;
  }
  function renderNotices() {
    var list = site.notices || [];
    var hero = $('#noticeHero'), hist = $('#noticeHistory');
    if (!list.length) {
      hero.innerHTML = '<div class="empty-box"><div class="big">📣</div>暂时没有公告。</div>';
      hist.innerHTML = '';
      $('#noticeCount').textContent = '';
      $('#noticeEmpty').hidden = false;
      return;
    }
    var cur = list[0];
    hero.innerHTML = '<div class="notice-hero">' +
      '<div class="notice-meta"><span class="n-tag">' + esc(cur.tag || '公告') + '</span><span class="n-date">' + esc(fmtDate(cur.date)) + '</span></div>' +
      '<h2>' + esc(cur.title) + '</h2><p>' + esc(cur.text) + '</p>' +
      (cur.link ? '<a class="btn btn-solid btn-sm" href="' + esc(cur.link) + '">查看活动</a>' : '<button class="btn btn-solid btn-sm" type="button" data-notice="0">查看详情</button>') +
      '</div>';
    var past = list.slice(1);
    $('#noticeCount').textContent = past.length ? past.length + ' 条' : '';
    $('#noticeEmpty').hidden = past.length > 0;
    hist.innerHTML = past.map(function (n, i) {
      var act = n.link
        ? '<a class="btn btn-sm" href="' + esc(n.link) + '">查看活动</a>'
        : '<button class="btn btn-sm" type="button" data-notice="' + (i + 1) + '">查看活动</button>';
      return '<article class="notice-card"><div class="top"><span class="n-tag">' + esc(n.tag || '公告') + '</span><span class="n-date">' + esc(fmtDate(n.date)) + '</span></div>' +
        '<h4>' + esc(n.title) + '</h4><p>' + esc(n.text) + '</p>' + act + '</article>';
    }).join('');
    $$('#page-notices [data-notice]').forEach(function (b) {
      b.onclick = function () { openNotice(list[+b.getAttribute('data-notice')]); };
    });
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var evs = (site.schedule || []).slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var now = Date.now();
    var next = null;
    for (var i = 0; i < evs.length; i++) {
      var start = fromYmd(evs[i].date);
      var parts = String(evs[i].time || '20:00').split(':').map(Number);
      start.setHours(parts[0], parts[1], 0, 0);
      if (start.getTime() + (Number(evs[i].duration) || 120) * 60000 > now) { next = { e: evs[i], at: start }; break; }
    }
    var box = $('#nextBox');
    if (!next) {
      box.innerHTML = '<p class="next-note" style="margin:10px 0 0">下一场排期待公布，先去 B 站动态蹲一下。</p>';
    } else {
      var d = next.at;
      box.innerHTML =
        '<div class="next-line"><b>' + esc(next.e.title) + '</b>' +
        '<span>' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + WEEK[d.getDay()] + ' ' + esc(next.e.time) + ' 开播</span></div>' +
        '<p class="next-note">' + esc(next.e.type || '直播') + (next.e.note ? ' · ' + esc(next.e.note) : '') + '</p>' +
        '<a class="btn btn-sm" href="#/calendar">查看排期</a>';
    }
    $('#newsMini').innerHTML = (site.notices || []).slice(0, 4).map(function (n) {
      var inner = '<span class="d">' + esc(String(n.date || '').slice(5).replace('-', '/')) + '</span>' +
        '<span class="t">' + esc(n.tag ? '[' + n.tag + '] ' : '') + esc(n.title) + '</span>';
      return '<li><a href="#/notices">' + inner + '</a></li>';
    }).join('');
  }

  /* ---------------- 月历 ---------------- */
  var calState = { view: 'month', cursor: new Date(), selected: ymd(new Date()) };
  var HOUR_H = 54;

  function eventsOn(dateStr) {
    return (site.schedule || []).filter(function (e) { return e.date === dateStr; })
      .sort(function (a, b) { return String(a.time).localeCompare(String(b.time)); });
  }
  function evAttr(e) { return esc(encodeURIComponent(JSON.stringify({ d: e.date, t: e.time, n: e.title }))); }
  function evFromAttr(v) {
    try {
      var o = JSON.parse(decodeURIComponent(v));
      return eventsOn(o.d).filter(function (e) { return e.time === o.t && e.title === o.n; })[0] || null;
    } catch (err) { return null; }
  }
  function openEvent(e) {
    $('#mTitle').textContent = e.title || '直播';
    $('#mMeta').textContent = e.date.replace(/-/g, '.') + ' ' + WEEK[fromYmd(e.date).getDay()] + ' ' + (e.time || '20:30') + ' · ' + (e.type || '直播');
    $('#mText').textContent = e.note || '准时开播，记得来蹲。';
    var link = $('#mLink');
    if (site.profile && site.profile.liveUrl) { link.href = site.profile.liveUrl; link.hidden = false; }
    else link.hidden = true;
    $('#modal').hidden = false;
  }
  function calNav(dir) {
    var d = new Date(calState.cursor);
    if (calState.view === 'month') d.setMonth(d.getMonth() + dir);
    else if (calState.view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    calState.cursor = d;
    if (calState.view === 'day') calState.selected = ymd(d);
    renderCal();
  }
  function monthCells(map) {
    var y = calState.cursor.getFullYear(), m = calState.cursor.getMonth();
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(y, m, 1 - offset);
    var today = ymd(new Date());
    var html = '';
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var key = ymd(d);
      var evs = map[key] || [];
      var cls = 'cal-cell' + (d.getMonth() !== m ? ' dim' : '') + (key === today ? ' today' : '') + (key === calState.selected ? ' sel' : '');
      html += '<div class="' + cls + '" data-date="' + key + '"><div class="cal-num">' + d.getDate() + '</div>' +
        evs.slice(0, 2).map(function (e) {
          return '<span class="chip ' + typeClass(e.type) + '" data-ev="' + evAttr(e) + '">' + esc(e.title) + '</span>';
        }).join('') +
        (evs.length > 2 ? '<span class="cal-more">+' + (evs.length - 2) + ' 场</span>' : '') + '</div>';
    }
    return html;
  }
  function weekStart(d) { var x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function renderWeek(map) {
    var start = weekStart(calState.cursor);
    var today = ymd(new Date());
    var days = [];
    for (var i = 0; i < 7; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    var dow = days.map(function (d) {
      return '<span class="' + (ymd(d) === today ? 'today' : '') + '">' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + WEEK[d.getDay()] + '</span>';
    }).join('');
    var cells = days.map(function (d) {
      var key = ymd(d), evs = map[key] || [];
      var cls = 'cal-cell wk-cell' + (key === today ? ' today' : '') + (key === calState.selected ? ' sel' : '');
      return '<div class="' + cls + '" data-date="' + key + '">' +
        '<div class="cal-num">' + d.getDate() + '</div>' +
        (evs.length ? evs.map(function (e) {
          return '<span class="chip wk-chip ' + typeClass(e.type) + '" data-ev="' + evAttr(e) + '"><b>' + esc(e.time || '20:00') + '</b>' + esc(e.title) + '</span>';
        }).join('') : '<span class="wk-rest">休息</span>') + '</div>';
    }).join('');
    return '<div class="cal-dow">' + dow + '</div><div class="cal-grid wk-grid">' + cells + '</div>';
  }
  function renderDay(map) {
    var evs = map[calState.selected] || [];
    if (!evs.length) return '<div class="day-list"><p style="color:var(--ink-3);font-size:12.5px;margin:0">这天没有安排，锅在休息。</p></div>';
    return '<div class="day-list">' + evs.map(function (e) {
      return '<div class="day-item" data-ev="' + evAttr(e) + '" style="cursor:pointer"><div class="day-time">' + esc(e.time || '20:00') + '</div>' +
        '<div><h4>' + esc(e.title) + '</h4><p>' + esc(e.type || '直播') + (e.note ? ' · ' + esc(e.note) : '') + '</p></div></div>';
    }).join('') + '</div>';
  }
  function renderDetail(map) {
    var box = $('#calDetail');
    if (calState.view === 'day') { box.hidden = true; return; }
    box.hidden = false;
    var evs = map[calState.selected] || [];
    var d = fromYmd(calState.selected);
    box.innerHTML = '<h4>' + d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · ' + WEEK[d.getDay()] + '</h4>' +
      (evs.length ? evs.map(function (e) {
        return '<div class="ev-row" data-ev="' + evAttr(e) + '" style="cursor:pointer"><span class="ev-time">' + esc(e.time || '20:00') + '</span>' +
          '<span class="ev-title">' + esc(e.title) + '</span><span class="ev-type">' + esc(e.type || '直播') + '</span></div>';
      }).join('') : '<div class="empty">这天没有安排，锅在休息。</div>');
  }
  function renderCal() {
    if (!site) return;
    var map = {};
    (site.schedule || []).forEach(function (e) { (map[e.date] = map[e.date] || []).push(e); });
    var y = calState.cursor.getFullYear(), m = calState.cursor.getMonth(), view = calState.view;
    var title, sub, body;
    if (view === 'month') {
      var monthCount = Object.keys(map).filter(function (k) { return k.slice(0, 7) === y + '-' + pad(m + 1); })
        .reduce(function (n, k) { return n + map[k].length; }, 0);
      title = y + ' 年 ' + (m + 1) + ' 月';
      sub = '本月 ' + monthCount + ' 场直播';
      body = '<div class="cal-dow">' + ['一', '二', '三', '四', '五', '六', '日'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="cal-grid">' + monthCells(map) + '</div>';
    } else if (view === 'week') {
      var ws = weekStart(calState.cursor);
      var selD = fromYmd(calState.selected);
      if (selD < ws || selD > new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6)) calState.selected = ymd(ws);
      var we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
      var wc = 0;
      for (var i = 0; i < 7; i++) {
        var dd = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i);
        wc += (map[ymd(dd)] || []).length;
      }
      title = (ws.getMonth() + 1) + ' 月 ' + ws.getDate() + ' 日 – ' + (we.getMonth() + 1) + ' 月 ' + we.getDate() + ' 日';
      sub = '本周 ' + wc + ' 场直播';
      body = renderWeek(map);
    } else {
      var d = fromYmd(calState.selected);
      title = d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
      sub = WEEK[d.getDay()] + ' · ' + (map[calState.selected] || []).length + ' 场安排';
      body = renderDay(map);
    }
    $('#calTitle').textContent = title;
    $('#calSub').textContent = sub;
    $('#calBody').innerHTML = body;
    renderDetail(map);
    $$('#calViews button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === view); });
  }

  /* ---------------- 物料 ---------------- */
  var matFilter = '全部';
  function renderMaterials() {
    var mats = site.materials || [];
    var cats = ['全部'];
    mats.forEach(function (m) { if (m.category && cats.indexOf(m.category) < 0) cats.push(m.category); });
    $('#matFilters').innerHTML = cats.map(function (c) {
      return '<button type="button" class="filter' + (c === matFilter ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    var list = mats.filter(function (m) { return matFilter === '全部' || m.category === matFilter; });
    $('#matGrid').innerHTML = list.map(function (m) {
      var cover = m.cover || (/\.(png|jpe?g|webp|gif)$/i.test(m.file || '') ? m.file : '/assets/img/material-default.png');
      return '<article class="mat"><div class="mat-cover"><img loading="lazy" src="' + esc(cover) + '" alt="' + esc(m.title) + '" onerror="' + IMG_FB + '"></div>' +
        '<div class="mat-body"><div class="mat-cat">' + esc(m.category) + (m.format ? ' · ' + esc(m.format) : '') + (m.res ? ' · ' + esc(m.res) : '') + '</div>' +
        '<h3>' + esc(m.title) + '</h3><p>' + esc(m.desc) + '</p>' +
        '<div class="mat-foot"><span class="mat-meta"><b>↓ ' + (m.downloads || 0) + '</b> · ' + fmtSize(m.size) + '</span>' +
        '<a class="btn btn-sm btn-solid" href="/download/' + encodeURIComponent(m.id) + '">下载</a></div></div></article>';
    }).join('');
    $$('#matFilters .filter').forEach(function (b) {
      b.onclick = function () { matFilter = b.getAttribute('data-cat'); renderMaterials(); };
    });
  }

  /* ---------------- 歌单 ---------------- */
  function renderSongs() {
    var songs = site.songs || [];
    var tags = ['全部', '推荐', '在学'];
    songs.forEach(function (s) { if (s.tag && tags.indexOf(s.tag) < 0) tags.push(s.tag); });
    $('#songFilters').innerHTML = tags.map(function (t) {
      return '<button type="button" class="filter' + (t === songState.tag ? ' on' : '') + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    var q = songState.q.trim().toLowerCase();
    var rows = [];
    songs.forEach(function (s, i) {
      if (songState.tag === '推荐') { if (!s.rec) return; }
      else if (songState.tag === '在学') { if (!s.learning) return; }
      else if (songState.tag !== '全部' && s.tag !== songState.tag) return;
      if (q && (s.title + ' ' + (s.artist || '')).toLowerCase().indexOf(q) < 0) return;
      rows.push({ s: s, i: i });
    });
    var shown = rows.slice(0, songState.limit);
    $('#songCount').textContent = rows.length ? '已显示 ' + shown.length + ' / 共 ' + rows.length + ' 首' : '共 0 首';
    $('#songEmpty').hidden = rows.length > 0;
    $('#songList').innerHTML = shown.map(function (r) {
      var s = r.s;
      var act = s.link
        ? '<a class="go" href="' + esc(s.link) + '" target="_blank" rel="noopener">原曲 ↗</a>'
        : '<button class="go" type="button" data-copy-song="' + esc(s.title) + '" style="border:none;background:none;cursor:pointer;padding:0">复制歌名</button>';
      return '<div class="song"><span class="no">' + pad(r.i + 1) + '</span>' +
        '<div><p class="ti">' + esc(s.title) + '</p><p class="ar">' + esc(s.artist || '') + '</p>' +
        (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') + '</div>' +
        '<span class="tg">' + esc(s.tag || '歌曲') + '</span>' +
        (s.rec ? '<span class="bd rec">推荐</span>' : '') + (s.learning ? '<span class="bd learn">在学</span>' : '') + act + '</div>';
    }).join('') + (rows.length > shown.length
      ? '<div class="song-more"><button class="btn btn-sm" type="button" id="songMore">显示更多（还有 ' + (rows.length - shown.length) + ' 首）</button></div>'
      : '');
    $$('#songFilters .filter').forEach(function (b) {
      b.onclick = function () { songState.tag = b.getAttribute('data-tag'); songState.limit = SONG_PAGE; renderSongs(); };
    });
    var more = $('#songMore');
    if (more) more.onclick = function () { songState.limit += SONG_PAGE; renderSongs(); };
    $$('#songList [data-copy-song]').forEach(function (b) {
      b.onclick = function () { copyText(b.getAttribute('data-copy-song'), '歌名已复制'); };
    });
  }

  /* ---------------- 音乐 ---------------- */
  var audio = document.getElementById('audioEl') || new Audio();
  audio.preload = 'metadata';
  audio.setAttribute('playsinline', '');
  var player = { idx: -1, lyrics: [], active: -1, mode: localStorage.getItem('pl-mode') || 'order', wantPlay: false };

  var MODE = {
    order: { label: '顺序播放', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h11M4 12h11M4 17h7"/><path d="m17 9 3 3-3 3z" fill="currentColor" stroke="none"/></svg>' },
    single: { label: '单曲循环', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="m17.5 3 .6 3.4-3.4.6"/><path d="m6.5 21-.6-3.4 3.4-.6"/><path d="M12 9.5v5" stroke-width="1.8"/></svg>' },
    shuffle: { label: '随机播放', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3.5l7 10H20"/><path d="M4 17h3.5l7-10H20"/><path d="m17.5 4 2.5 3-2.5 3"/><path d="m17.5 14 2.5 3-2.5 3"/></svg>' }
  };
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    var ms = navigator.mediaSession;
    var set = function (name, fn) { try { ms.setActionHandler(name, fn); } catch (e) {} };
    set('play', function () { audio.play().catch(function () {}); });
    set('pause', function () { audio.pause(); });
    set('previoustrack', function () { stepTrack(-1); });
    set('nexttrack', function () { stepTrack(1); });
    set('seekto', function (d) { if (d && isFinite(d.seekTime)) audio.currentTime = d.seekTime; });
    set('seekbackward', function (d) { audio.currentTime = Math.max(0, audio.currentTime - ((d && d.seekOffset) || 10)); });
    set('seekforward', function (d) { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + ((d && d.seekOffset) || 10)); });
  }
  function updateMediaSession(m) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: m.title || '辣奶火锅',
        artist: m.artist || '辣奶火锅',
        album: '翻唱 · 辣奶火锅',
        artwork: [
          { src: m.cover || '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }
        ]
      });
    } catch (e) {}
  }
  function syncMediaState() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
      if (audio.duration && isFinite(audio.duration)) {
        navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate || 1 });
      }
    } catch (e) {}
  }

  function applyMode() {
    var m = MODE[player.mode] || MODE.order;
    var btn = $('#plMode');
    btn.innerHTML = m.icon;
    btn.title = m.label;
  }

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), x = Math.floor(s % 60);
    return m + ':' + (x < 10 ? '0' : '') + x;
  }
  function parseLyrics(text) {
    var out = [], re = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;
    String(text || '').split('\n').forEach(function (line) {
      var m = line.match(re);
      if (m) out.push({ t: (+m[1]) * 60 + (+m[2]) + (m[3] ? +('0.' + m[3]) : 0), text: m[4] || '♪' });
      else if (line.trim()) out.push({ t: null, text: line.trim() });
    });
    return out;
  }
  function renderMusic() {
    var list = site.music || [];
    $('#trackEmpty').hidden = list.length > 0;
    $('#trackList').innerHTML = list.map(function (m, i) {
      var playing = player.idx === i && !audio.paused && !audio.ended;
      return '<div class="track' + (player.idx === i ? ' on' : '') + '" data-i="' + i + '">' +
        '<button class="tr-play" type="button" data-play="' + i + '" aria-label="播放">' + (playing ? '❚❚' : '▶') + '</button>' +
        '<img class="tr-cover" src="' + esc(m.cover || '/assets/img/avatar.png') + '" alt="" onerror="' + IMG_FB + '">' +
        '<div class="tr-info"><b>' + esc(m.title) + '</b><span>' + esc(m.artist || '') + (m.size ? ' · ' + fmtSize(m.size) : '') + '</span></div>' +
        '<a class="tr-dl" href="/music/download/' + encodeURIComponent(m.id) + '">下载</a></div>';
    }).join('');
    $$('#trackList .track').forEach(function (el) {
      el.onclick = function (e) {
        if (e.target.closest('.tr-dl')) return;
        var i = +el.getAttribute('data-i');
        if (e.target.closest('[data-play]') && player.idx === i) { togglePlay(); return; }
        if (player.idx !== i) playTrack(i);
        openCD();
      };
    });
  }
  function renderLyrics(text) {
    player.lyrics = parseLyrics(text);
    player.active = -1;
    var box = $('#cdLyrics');
    if (!player.lyrics.length) { box.innerHTML = '<p class="cd-nolyric">这首歌还没有歌词</p>'; return; }
    box.innerHTML = player.lyrics.map(function (l, i) {
      return '<p class="ly" data-i="' + i + '" data-t="' + (l.t == null ? '' : l.t) + '">' + esc(l.text) + '</p>';
    }).join('');
    $$('.ly', box).forEach(function (el) {
      el.onclick = function () {
        var t = el.getAttribute('data-t');
        if (t === '' || t == null) return;
        audio.currentTime = Number(t);
        if (audio.paused) audio.play().catch(function () {});
      };
    });
    box.scrollTop = 0;
  }
  function playTrack(i) {
    var m = (site.music || [])[i];
    if (!m) return;
    player.idx = i;
    player.wantPlay = true;
    var gg = ensureGraph();
    if (gg.ctx && gg.ctx.state === 'suspended') gg.ctx.resume().catch(function () {});
    audio.src = m.file;
    audio.play().catch(function () {});
    $('#player').hidden = false;
    document.body.classList.add('has-player');
    $('#plTitle').textContent = m.title;
    $('#plArtist').textContent = m.artist || '';
    $('#plCover').src = m.cover || '/assets/img/avatar.png';
    $('#cdCover').src = m.cover || '/assets/img/avatar.png';
    $('#cdTitle').textContent = m.title;
    $('#cdArtist').textContent = m.artist || '';
    $('#plDl').href = '/music/download/' + encodeURIComponent(m.id);
    $('#cdDl').href = '/music/download/' + encodeURIComponent(m.id);
    $('#plFill').style.width = '0%';
    $('#plDot').style.left = '0%';
    $('#plTime').textContent = '0:00 / 0:00';
    var bpm = Math.min(300, Math.max(20, Number(m.bpm) || 90));
    $('#cdDisc').style.animationDuration = (60 / bpm * 8).toFixed(2) + 's';
    var bili = $('#cdBili');
    if (m.bili) { bili.href = m.bili; bili.hidden = false; } else bili.hidden = true;
    applyTheme(m);
    updateMediaSession(m);
    renderLyrics(m.lyrics);
    renderMusic();
    loadComments(m.id);
  }
  function togglePlay() {
    if (!audio.src) return;
    var gg = ensureGraph();
    if (gg.ctx && gg.ctx.state === 'suspended') gg.ctx.resume().catch(function () {});
    if (audio.paused) { player.wantPlay = true; audio.play().catch(function () {}); }
    else { player.wantPlay = false; audio.pause(); }
  }
  /* 手机切到别的 App 再回来：浏览器可能把音频暂停了，用户意图是「继续播」就试着恢复 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !audio.src || !player.wantPlay || !audio.paused) return;
    audio.play().catch(function () {});
  });
  function setPlayingUI() {
    var playing = !audio.paused && !audio.ended;
    syncMediaState();
    $('#plPlay').textContent = playing ? '❚❚' : '▶';
    $('#player').classList.toggle('playing', playing);
    document.body.classList.toggle('pl-playing', playing);
    renderMusic();
  }
  function syncLyrics() {
    var lyr = player.lyrics;
    if (!lyr.length) return;
    var idx = -1;
    for (var i = 0; i < lyr.length; i++) if (lyr[i].t != null && audio.currentTime >= lyr[i].t) idx = i;
    if (idx === player.active) return;
    player.active = idx;
    var box = $('#cdLyrics');
    $$('.ly', box).forEach(function (el, i) { el.classList.toggle('active', i === idx); });
    var act = box.querySelector('.ly.active');
    if (act && !$('#cd').hidden) {
      var wrap = box.parentElement && box.parentElement.classList.contains('cd-left') ? box.parentElement : box;
      var r = act.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var delta = (r.top - wr.top) - (wrap.clientHeight / 2 - r.height / 2);
      wrap.scrollTo({ top: wrap.scrollTop + delta, behavior: 'smooth' });
    }
  }
  function stepTrack(dir) {
    var n = (site.music || []).length;
    if (!n) return;
    if (player.mode === 'shuffle' && n > 1) {
      var i = player.idx;
      while (i === player.idx) i = Math.floor(Math.random() * n);
      return playTrack(i);
    }
    playTrack((player.idx + dir + n) % n);
  }
  function onEnded() {
    if (player.mode === 'single') { audio.currentTime = 0; audio.play().catch(function () {}); return; }
    stepTrack(1);
  }
  function openCD() {
    $('#cd').hidden = false;
    document.body.classList.add('cd-open');
    requestAnimationFrame(function () { $('#cd').classList.add('open'); });
    syncLyrics();
    startEq();
  }
  function closeCD() {
    $('#cd').classList.remove('open');
    document.body.classList.remove('cd-open');
    stopEq();
    setTimeout(function () { $('#cd').hidden = true; }, 420);
  }
  /* 律动：真实频谱画成一条波浪，浮在展开区上沿 */
  var eq = { raf: 0, actx: null, analyser: null, data: null, failed: false, fakeT: 0, levels: [] };
  var graph = { ctx: null, gain: null, analyser: null, failed: false };
  function storedVolume() {
    var v = Number(localStorage.getItem('pl-vol'));
    return isFinite(v) && v >= 0 && v <= 100 ? v : 80;
  }
  function ensureGraph() {
    if (graph.ctx || graph.failed) return graph;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = new AC();
      var src = ctx.createMediaElementSource(audio);
      var gain = ctx.createGain();
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .85;
      src.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);
      gain.gain.value = storedVolume() / 100;
      graph.ctx = ctx; graph.gain = gain; graph.analyser = analyser;
    } catch (e) { graph.failed = true; }
    return graph;
  }
  function applyVolume(v) {
    var g = ensureGraph();
    if (g.gain) g.gain.gain.value = v / 100;
    audio.volume = v / 100;
    audio.muted = v === 0;
  }
  function hexToRgb(hex) {
    var m = /^#?([a-f0-9]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function applyTheme(m) {
    var panel = $('#cdPanel');
    if (!panel) return;
    var rgb = hexToRgb(m && m.theme) || [246, 237, 229];
    panel.style.setProperty('--cd-rgb', rgb.join(', '));
    var lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    panel.classList.toggle('cd-dark', lum < 0.45);
  }
  function drawWave() {
    var svg = $('#cdWave'), path = $('#cdWavePath');
    if (!svg || !path) return;
    var W = svg.clientWidth || window.innerWidth, H = svg.clientHeight || 38;
    var n = eq.levels.length || 64;
    var step = W / (n - 1);
    var pts = [];
    for (var i = 0; i < n; i++) {
      var v = eq.levels[i] || 0;
      pts.push([i * step, H - Math.max(1.5, v * (H - 3))]);
    }
    var d = 'M0,' + H.toFixed(1) + ' L' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k], mx = (a[0] + b[0]) / 2;
      d += ' C' + mx.toFixed(1) + ',' + a[1].toFixed(1) + ' ' + mx.toFixed(1) + ',' + b[1].toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
    }
    d += ' L' + W.toFixed(1) + ',' + H.toFixed(1) + ' Z';
    path.setAttribute('d', d);
  }
  function startEq() {
    var N = 72;
    if (!eq.levels.length) { eq.levels = []; for (var i = 0; i < N; i++) eq.levels.push(0); }
    var g = ensureGraph();
    if (g.analyser && !eq.analyser) {
      eq.actx = g.ctx;
      eq.analyser = g.analyser;
      eq.data = new Uint8Array(eq.analyser.frequencyBinCount);
    }
    if (eq.actx && eq.actx.state === 'suspended') eq.actx.resume().catch(function () {});
    cancelAnimationFrame(eq.raf);
    var loop = function () {
      eq.fakeT += 0.03;
      if (eq.actx && !eq.failed) eq.analyser.getByteFrequencyData(eq.data);
      for (var i = 0; i < N; i++) {
        var v = 0;
        if (eq.actx && !eq.failed) {
          var idx = Math.floor(i / N * eq.data.length * 0.78);
          v = (eq.data[idx] || 0) / 255;
        }
        var soft = 0.12 + 0.10 * Math.sin(i * 0.36 + eq.fakeT) * Math.sin(i * 0.11 + eq.fakeT * 0.7);
        var target = Math.max(v * 1.25, Math.abs(soft) * 1.5);
        eq.levels[i] = eq.levels[i] * 0.74 + target * 0.26;
      }
      drawWave();
      eq.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  function stopEq() {
    cancelAnimationFrame(eq.raf);
    eq.raf = 0;
    eq.levels = eq.levels.map(function () { return 0; });
    drawWave();
  }

  function loadComments(trackId) {
    var box = $('#cmList');
    if (!box) return;
    box.innerHTML = '<p class="cm-empty">加载中…</p>';
    fetch('/api/comments?track=' + encodeURIComponent(trackId)).then(function (r) { return r.json(); })
      .then(function (j) { renderComments((j && j.items) || []); })
      .catch(function () { renderComments([]); });
  }
  var likedIds = {};
  try { likedIds = JSON.parse(localStorage.getItem('cm-liked') || '{}') || {}; } catch (e) { likedIds = {}; }

  function renderComments(items) {
    var box = $('#cmList');
    if ($('#cmCount')) $('#cmCount').textContent = items.length ? items.length + ' 条' : '';
    var plCm = $('#plCm');
    if (plCm) {
      var badge = plCm.querySelector('b');
      if (items.length) {
        if (!badge) { badge = document.createElement('b'); plCm.appendChild(badge); }
        badge.textContent = items.length;
      } else if (badge) badge.remove();
    }
    if (!items.length) {
      box.innerHTML = '<p class="cm-empty">还没有评论，来说第一句吧。</p>';
      return;
    }
    var hot = items.filter(function (c) { return (c.likes || 0) > 0; })
      .sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); }).slice(0, 3);
    var rest = items.filter(function (c) { return hot.indexOf(c) < 0; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    box.innerHTML = hot.concat(rest).map(function (c) {
      var d = new Date(c.createdAt);
      var ds = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      var liked = !!likedIds[c.id];
      return '<div class="cm-item' + (hot.indexOf(c) >= 0 ? ' hot' : '') + '">' +
        '<div class="cm-body"><div class="who"><b>' + esc(c.name) + '</b><time>' + ds + '</time></div>' +
        '<p>' + esc(c.text) + '</p></div>' +
        '<button class="cm-like' + (liked ? ' on' : '') + '" type="button" data-like="' + esc(c.id) + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.3s-7.2-4.5-7.2-9.4A4 4 0 0 1 12 8.2a4 4 0 0 1 7.2 2.7c0 4.9-7.2 9.4-7.2 9.4z"/></svg>' +
        '<span>' + (c.likes || 0) + '</span></button></div>';
    }).join('');
    $$('[data-like]', box).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-like');
        if (likedIds[id]) return toast('已经点过赞啦');
        b.disabled = true;
        fetch('/api/comments/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('点赞失败')); })
          .then(function () {
            likedIds[id] = 1;
            try { localStorage.setItem('cm-liked', JSON.stringify(likedIds)); } catch (e) {}
            var m = (site.music || [])[player.idx];
            if (m) loadComments(m.id);
          })
          .catch(function () { b.disabled = false; toast('点赞失败，稍后再试', true); });
      };
    });
  }
  function seekAt(clientX) {
    var r = $('#plBar').getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = p * audio.duration;
  }
  function setupPlayer() {
    var vol = storedVolume();
    $('#plVolume').value = vol;
    applyMode();
    setupMediaSession();

    $('#plPlay').onclick = togglePlay;
    $('#plPrev').onclick = function () { stepTrack(-1); };
    $('#plNext').onclick = function () { stepTrack(1); };
    $('#plMode').onclick = function () {
      var order = ['order', 'single', 'shuffle'];
      player.mode = order[(order.indexOf(player.mode) + 1) % order.length];
      localStorage.setItem('pl-mode', player.mode);
      applyMode();
      toast(MODE[player.mode].label);
    };
    $('#plVolume').addEventListener('input', function () {
      var v = Number(this.value);
      applyVolume(v);
      localStorage.setItem('pl-vol', String(v));
    });
    var volWrap = $('#plVol');
    $('#plMute').onclick = function (e) {
      e.stopPropagation();
      if (volWrap) volWrap.classList.toggle('open');
    };
    document.addEventListener('click', function (e) {
      if (volWrap && !e.target.closest('#plVol')) volWrap.classList.remove('open');
    });
    if (volWrap) volWrap.addEventListener('click', function (e) {
      if (e.target.id === 'plVolume') e.stopPropagation();
    });
    $('#plBar').addEventListener('pointerdown', function (e) {
      seekAt(e.clientX);
      var move = function (ev) { seekAt(ev.clientX); };
      var up = function () { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
    $('#plExpand').onclick = openCD;
    var playerBar = $('#player');
    if (playerBar) playerBar.addEventListener('click', function (e) {
      if (e.target.closest('button, a, input, .pl-bar')) return;
      openCD();
    });
    var plCm = $('#plCm');
    if (plCm) plCm.onclick = function () {
      openCD();
      setTimeout(function () {
        var cm = document.querySelector('.cd-comments');
        if (cm) cm.scrollIntoView({ behavior: 'smooth', block: 'end' });
        var t = $('#cmText');
        if (t) t.focus({ preventScroll: true });
      }, 460);
    };
    $$('[data-cd-close]').forEach(function (el) { el.onclick = closeCD; });
    $('#cmName').value = localStorage.getItem('cm-name') || '';
    $('#cmForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var m = (site.music || [])[player.idx];
      if (!m) return;
      var text = $('#cmText').value.trim();
      if (!text) return toast('写点什么再发吧', true);
      var name = $('#cmName').value.trim();
      localStorage.setItem('cm-name', name);
      fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: m.id, name: name, text: text })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || '发送失败');
          return j;
        });
      }).then(function () {
        $('#cmText').value = '';
        loadComments(m.id);
        toast('评论成功');
      }).catch(function (err) { toast(err.message, true); });
    });
    audio.addEventListener('play', setPlayingUI);
    audio.addEventListener('pause', setPlayingUI);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', function () {
      $('#plTime').textContent = '0:00 / ' + fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      var pct = audio.currentTime / audio.duration * 100;
      $('#plFill').style.width = pct + '%';
      $('#plDot').style.left = pct + '%';
      $('#plTime').textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
      syncLyrics();
      syncMediaState();
    });
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !audio.paused) {
        e.preventDefault(); togglePlay();
      }
    });
  }

  /* ---------------- 规则 / 展厅 ---------------- */
  function renderRules() {
    var r = site.rules || {};
    $('#ruleOk').innerHTML = (r.allowed || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('#ruleNo').innerHTML = (r.forbidden || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('#ruleNotes').innerHTML = (r.notes || []).map(function (n) {
      return '<div class="note"><h4>' + esc(n.title) + '</h4><p>' + esc(n.text) + '</p></div>';
    }).join('');
  }
  var IMG_FB = "this.onerror=null;this.src='/assets/img/material-default.png'";
  function renderGallery() {
    var items = site.fanart || [];
    $('#galCount').textContent = items.length + ' 件';
    $('#galEmpty').hidden = items.length > 0;
    $('#gallery').innerHTML = items.map(function (w) {
      var tag = w.link ? 'a' : 'div';
      var attr = w.link ? ' href="' + esc(w.link) + '" target="_blank" rel="noopener"' : '';
      return '<' + tag + ' class="work"' + attr + '><img loading="lazy" src="' + esc(w.image) + '" alt="' + esc(w.title) + '">' +
        '<div class="work-in"><b>' + esc(w.title) + '</b>' + esc(w.author) + ' · ' + esc(w.category || '二创') + '</div></' + tag + '>';
    }).join('');
  }

  /* ---------------- 投稿 ---------------- */
  function setupUpload() {
    var form = $('#uploadForm'), drop = $('#drop'), input = $('#fileInput');
    var preview = $('#dzPreview'), clr = $('#dzClear'), prog = $('#prog'), bar = prog.querySelector('i');
    var btn = $('#submitBtn'), picked = null;
    var maxMB = (site.upload && site.upload.maxSizeMB) || 12;
    var exts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.zip'];

    function resetDrop() {
      picked = null; input.value = ''; preview.hidden = true; preview.src = '';
      clr.classList.remove('on');
      drop.querySelector('.t').textContent = '把作品拖进来，或点击选择';
    }
    function pick(file) {
      if (!file) return;
      var name = file.name || '', dot = name.lastIndexOf('.');
      var ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
      if (exts.indexOf(ext) < 0) return toast('只支持 PNG / JPG / WEBP / GIF / ZIP', true);
      if (file.size > maxMB * 1024 * 1024) return toast('文件超过 ' + maxMB + ' MB 了', true);
      picked = file; clr.classList.add('on');
      if (/^image\//.test(file.type)) {
        var reader = new FileReader();
        reader.onload = function (e) { preview.src = e.target.result; preview.hidden = false; };
        reader.readAsDataURL(file);
      } else {
        preview.hidden = true;
        drop.querySelector('.t').textContent = '📦 ' + name + '（' + fmtSize(file.size) + '）';
      }
    }
    input.addEventListener('change', function () { pick(input.files && input.files[0]); });
    ['dragenter', 'dragover'].forEach(function (k) { drop.addEventListener(k, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (k) { drop.addEventListener(k, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); });
    clr.onclick = function (e) { e.preventDefault(); e.stopPropagation(); resetDrop(); };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!picked) return toast('先选一个作品文件吧', true);
      var author = $('#author').value.trim(), title = $('#title').value.trim(), link = $('#link').value.trim();
      if (!author) return toast('填一下昵称～', true);
      if (!title) return toast('给作品起个名字吧', true);
      if (!$('#consent').checked) return toast('请先勾选同意投稿规则', true);
      if (link && !/^https?:\/\//i.test(link)) return toast('链接要以 http(s):// 开头', true);
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', '/api/fanart', true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('x-fanart-meta', encodeURIComponent(JSON.stringify({
        author: author, title: title, link: link, category: $('#category').value, filename: picked.name, consent: true
      })));
      btn.disabled = true; btn.textContent = '正在上传…';
      prog.hidden = false; bar.style.width = '0%';
      xhr.upload.onprogress = function (ev) { if (ev.lengthComputable) bar.style.width = Math.round(ev.loaded / ev.total * 100) + '%'; };
      xhr.onload = function () {
        btn.disabled = false; btn.textContent = '投喂这份二创'; prog.hidden = true;
        var res = {};
        try { res = JSON.parse(xhr.responseText || '{}'); } catch (err) {}
        if (xhr.status >= 200 && xhr.status < 300) { toast(res.message || '收到啦，审核通过后就会上架。'); form.reset(); resetDrop(); }
        else toast(res.error || '上传失败了，再试一次。', true);
      };
      xhr.onerror = function () { btn.disabled = false; btn.textContent = '投喂这份二创'; prog.hidden = true; toast('网络断了一下，再试一次？', true); };
      xhr.send(picked);
    });
  }

  /* ---------------- 杂项 ---------------- */
  function copyText(text, msg) {
    var done = function () { toast(msg || '已复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { toast(text); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(text); }
      document.body.removeChild(ta);
    }
  }
  function copyQQ() { copyText((site.profile && site.profile.qqGroup) || '858862396', '群号已复制，快来锅里泡着'); }

  function setupEvents() {
    window.addEventListener('hashchange', function () { refreshSite(); go(routeFromHash()); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshSite(); });
    window.addEventListener('storage', function (e) { if (e.key === 'site-updated') refreshSite(true); });
    window.addEventListener('focus', function () { refreshSite(); });
    $('#qqBox').onclick = copyQQ;
    $('#qqBox').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyQQ(); } };
    $('#qqCopy').onclick = copyQQ;
    $('#mQq').onclick = copyQQ;

    $('#calViews').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-view]');
      if (!b) return;
      calState.view = b.getAttribute('data-view');
      if (calState.view === 'week') calState.cursor = fromYmd(calState.selected);
      renderCal();
    });
    $('#calPrev').onclick = function () { calNav(-1); };
    $('#calNext').onclick = function () { calNav(1); };
    $('#calToday').onclick = function () { var t = new Date(); calState.cursor = t; calState.selected = ymd(t); renderCal(); };
    $('#calBody').addEventListener('click', function (ev) {
      var chip = ev.target.closest('[data-ev]');
      if (chip) { ev.stopPropagation(); var item = evFromAttr(chip.getAttribute('data-ev')); if (item) openEvent(item); return; }
      var cell = ev.target.closest('.cal-cell');
      if (cell) { calState.selected = cell.getAttribute('data-date'); renderCal(); }
    });
    $('#calDetail').addEventListener('click', function (ev) {
      var row = ev.target.closest('[data-ev]');
      if (!row) return;
      var item = evFromAttr(row.getAttribute('data-ev'));
      if (item) openEvent(item);
    });
    $('#songSearch').addEventListener('input', function () { songState.q = this.value; songState.limit = SONG_PAGE; renderSongs(); });
    $('#modal').addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) $('#modal').hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#modal').hidden = true; });
  }

  /* ---------------- 数据刷新（后台改完，前台自动跟上） ---------------- */
  var lastSiteLoad = 0;
  function refreshSite(force) {
    if (!force && Date.now() - lastSiteLoad < 15000) return;
    lastSiteLoad = Date.now();
    fetch('/api/site', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        site = d;
        renderProfile(); renderNav(); renderNotices(); renderAbout(); renderSongs();
        renderMusic(); renderMaterials(); renderRules(); renderGallery(); renderHome(); renderCal();
        renderPage(state.route || routeFromHash());
      })
      .catch(function () {});
  }

  /* ---------------- 视觉细节 ---------------- */
  function setupUI() {
    function markImg(img) {
      if (!img || img.classList.contains('img-in')) return;
      if (img.complete && img.naturalWidth) { img.classList.add('img-in'); return; }
      img.addEventListener('load', function () { img.classList.add('img-in'); }, { once: true });
    }
    function scanImgs(root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll('img').forEach(markImg);
    }
    scanImgs(document);

    var raf = 0;
    function schedule(fn) {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; fn(); });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '-30px 0px -6% 0px', threshold: 0.02 });
      var applyReveal = function () {
        document.querySelectorAll('.card, .mat, .work, .ph, .about, .hero, .cal-card').forEach(function (el) {
          if (!el.classList.contains('reveal') && !el.classList.contains('in')) {
            el.classList.add('reveal');
            io.observe(el);
          }
        });
      };
      applyReveal();
      window.addEventListener('hashchange', function () { setTimeout(applyReveal, 80); });
    }

    var mo = new MutationObserver(function (muts) {
      var needImg = false, needReveal = false;
      muts.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'IMG' || (n.querySelector && n.querySelector('img'))) needImg = true;
          if (n.matches && n.matches('.card, .mat, .work, .ph')) needReveal = true;
        });
      });
      if (needImg) schedule(function () { scanImgs(document); });
      if (needReveal && 'IntersectionObserver' in window) schedule(function () {
        document.querySelectorAll('.card, .mat, .work, .ph').forEach(function (el) {
          if (!el.classList.contains('reveal') && !el.classList.contains('in')) {
            el.classList.add('reveal');
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // 回到顶部
    var toTop = $('#toTop');
    if (toTop) {
      var onScroll = function () { toTop.hidden = window.scrollY < 380; };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      toTop.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    }

    // 灯箱
    var lb = $('#lightbox');
    function openLightbox(src, cap) {
      if (!lb) return;
      var smBox = $('#shareModal');
      if (smBox) smBox.hidden = true;
      $('#lbImg').src = src;
      $('#lbCap').textContent = cap || '';
      lb.hidden = false;
    }
    function closeLightbox() { if (lb) lb.hidden = true; }
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) return closeLightbox();
      var work = e.target.closest('.work');
      if (work) {
        var img = work.querySelector('img');
        if (img && img.src) {
          e.preventDefault();
          var capEl = work.querySelector('.work-in');
          openLightbox(img.src, capEl ? capEl.textContent.replace(/\s+/g, ' ').trim() : '');
        }
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeLightbox(); var sm = $('#shareModal'); if (sm) sm.hidden = true; }
    });

    // 分享弹窗
    var sm = $('#shareModal');
    var shareBtn = $('#shareBtn');
    if (shareBtn && sm) shareBtn.onclick = function () {
      if (lb) lb.hidden = true;
      sm.hidden = false;
    };
    $$('[data-sm-close]').forEach(function (el) { el.onclick = function () { sm.hidden = true; }; });
    var smCopy = $('#smCopy');
    if (smCopy) smCopy.onclick = function () { copyText(location.origin + '/', '链接已复制，去发给朋友吧'); };
    if (navigator.share) {
      var nb = $('#smNative');
      if (nb) {
        nb.hidden = false;
        nb.onclick = function () {
          navigator.share({ title: document.title, text: '辣奶火锅 · 官方小站', url: location.origin + '/' }).catch(function () {});
        };
      }
    }
  }

  /* ---------------- 启动 ---------------- */
  fetch('/api/site').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      site = data;
      lastSiteLoad = Date.now();
      state.route = routeFromHash();
      renderProfile();
      renderNav();
      renderNotices();
      renderAbout();
      renderSongs();
      renderMusic();
      renderMaterials();
      renderRules();
      renderGallery();
      renderHome();
      renderCal();
      setupUpload();
      setupEvents();
      setupPlayer();
      setupUI();
      var boot = $('#bootSkeleton');
      if (boot) { boot.classList.add('off'); setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 400); }
      // 直接打开带锚点的页面
      if (state.route !== 'home') {
        var cur = $('#page-home');
        cur.classList.remove('on');
        $('#page-' + state.route).classList.add('on');
      }
      renderNav();
    })
    .catch(function (err) {
      console.error(err);
      var boot = $('#bootSkeleton');
      if (boot) boot.innerHTML = '<p class="boot-err">内容加载失败，下拉刷新或稍后再试。</p>';
      toast('数据加载失败，请确认服务已启动', true);
    });
})();
