'use strict';
/* ============================================================
   픽셀 씬 렌더러 — 192x108 논리 해상도를 CSS로 확대
   ============================================================ */
const Art = (() => {
  const W = 192, H = 108;
  const instances = [];

  const SEASON = {
    spring: { sky: ['#8fd0f2', '#a6dbf6', '#bfe6f9', '#d6f0fb'], far: '#8fb9a4', mid: '#76b35c', grass: '#8cc866', grass2: '#7bb657', tree: ['#5ea34a', '#74bb5c'], hill: '#6aa64f' },
    summer: { sky: ['#5fb8ee', '#7fc9f3', '#a0d8f7', '#c0e6fa'], far: '#6aa38a', mid: '#4f9a3f', grass: '#5faa45', grass2: '#4f9a3a', tree: ['#3f8b3a', '#52a046'], hill: '#3f8b3a' },
    autumn: { sky: ['#9cc6dc', '#b4d3e3', '#cde0ea', '#e2ecf0'], far: '#b59a6a', mid: '#a8803a', grass: '#b3a24f', grass2: '#a3913f', tree: ['#d9822b', '#e8a33a'], hill: '#a07a35' },
    winter: { sky: ['#b9c9d8', '#c9d6e2', '#d9e3ec', '#e8eff5'], far: '#b9c5cf', mid: '#d3dde5', grass: '#eef3f7', grass2: '#e0e8ee', tree: ['#e8eef2', '#f6f9fb'], hill: '#cfd9e0' },
  };
  const NIGHT_SKY = ['#0a0f2e', '#101a45', '#18255a', '#223270'];

  const UNI = {
    army:   { h: '#4a5a30', H: '#33401f', u: '#5b6b3b', U: '#46552d', p: '#52623a', b: '#2a2018', s: '#e8b98a', k: '#2a1a10' },
    navy:   { h: '#eef2f5', H: '#c9d3db', u: '#3f5f86', U: '#2f4a6c', p: '#3f5f86', b: '#1c1c24', s: '#e8b98a', k: '#2a1a10' },
    af:     { h: '#27406b', H: '#1b2d4d', u: '#6b92c4', U: '#547aab', p: '#4a6d9b', b: '#1c1c24', s: '#e8b98a', k: '#2a1a10' },
    marine: { h: '#4b5a30', H: '#c0392b', u: '#68794a', U: '#52633a', p: '#586a3c', b: '#2a2018', s: '#e8b98a', k: '#2a1a10' },
    civil:  { h: '#2b1b12', H: '#2b1b12', u: '#e8e2d2', U: '#c9c3b2', p: '#3b4a68', b: '#f0f0f0', s: '#e8b98a', k: '#2a1a10' },
  };
  const SHIRTS = [['#e8e2d2', '#c9c3b2'], ['#6aa2c8', '#4f87ac'], ['#d9823a', '#b86a2a'], ['#8fb870', '#6f9a52'], ['#c96a7a', '#a9525f']];

  const HEAD = ['..hhhhh..', '.hhhhhhh.', '.HHHHHHH.', '..sksks..', '..sssss..'];
  const BODY = ['...sss...', '.uuuuuuu.', 'uuuuuuuuu', 'uUuuuuuUu', 'sUuuuuuUs'];
  const LEGS_A = ['.pp...pp.', '.pp...pp.', '.pp...pp.', 'bbb...bbb'].map(r => r.slice(0, 9));
  const LEGS_B = ['..pp.pp..', '..pp.pp..', '..pp.pp..', '.bbb.bbb.'];
  const SPRITE_A = HEAD.concat(BODY, LEGS_A);
  const SPRITE_B = HEAD.concat(BODY, LEGS_B);

  function rnd(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  function create(canvas, opts = {}) {
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    const st = Object.assign({ scene: 'camp', season: 'spring', uni: 'army', shirt: 0, overlay: '', t: 0 }, opts);
    const inst = { canvas, c, st, raf: 0, last: 0, running: false };

    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
    const night = () => st.overlay === 'night' || st.overlay === 'march';
    const P = () => SEASON[st.season] || SEASON.spring;
    const lit = []; // 밤에 켜질 창문

    function man(x, y, uni, step, extra) {
      const pal = Object.assign({}, UNI[uni] || UNI.army);
      if (uni === 'civil') { const sh = SHIRTS[st.shirt % SHIRTS.length]; pal.u = sh[0]; pal.U = sh[1]; }
      if (extra && extra.shirt != null) { const sh = SHIRTS[extra.shirt % SHIRTS.length]; pal.u = sh[0]; pal.U = sh[1]; }
      const rows = step ? SPRITE_B : SPRITE_A;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let q = 0; q < row.length; q++) {
          const ch = row[q];
          if (ch !== '.') R(x + q, y + r, 1, 1, pal[ch]);
        }
      }
      if (extra && extra.pack) R(x - 1, y + 6, 2, 6, '#3b4a28');
      if (extra && extra.rifle) { R(x + 9, y + 5, 1, 9, '#222'); R(x + 9, y + 4, 1, 2, '#555'); }
    }

    function sky() {
      const pal = night() ? NIGHT_SKY : P().sky;
      const bh = 16;
      pal.forEach((col, i) => R(0, i * bh, W, bh + 1, col));
      if (night()) {
        for (let i = 0; i < 46; i++) {
          const tw = (Math.sin(st.t * 2 + i) > .2) ? 1 : 0;
          if (tw) R(rnd(i) * W, rnd(i + 99) * 54, 1, 1, '#fff');
        }
        R(160, 10, 8, 8, '#f6f0c8'); R(163, 9, 4, 1, '#f6f0c8'); R(158, 12, 2, 4, '#f6f0c8');
        R(164, 10, 3, 6, '#dcd59f');
      } else {
        // 해
        if (st.season !== 'winter') { R(150, 10, 10, 10, '#fff1a8'); R(152, 8, 6, 2, '#fff1a8'); R(152, 20, 6, 2, '#fff1a8'); R(148, 12, 2, 6, '#fff1a8'); R(160, 12, 2, 6, '#fff1a8'); }
        for (let i = 0; i < 3; i++) {
          const cx = ((rnd(i + 5) * W) + st.t * (3 + i)) % (W + 40) - 20;
          const cy = 8 + i * 12 + rnd(i) * 6;
          R(cx + 4, cy, 14, 3, '#ffffff'); R(cx, cy + 3, 24, 3, '#ffffff'); R(cx + 8, cy - 2, 8, 2, '#ffffff');
        }
      }
    }
    function ridge(base, amp, f, ph, col) {
      for (let x = 0; x < W; x++) {
        const y = base - Math.floor(amp * (0.5 + 0.5 * Math.sin(x * f + ph)) + amp * 0.4 * Math.sin(x * f * 2.3 + ph * 1.7));
        R(x, y, 1, H - y, col);
      }
    }
    function tree(x, y, h) {
      const [a, b] = P().tree;
      const hh = h || 14;
      R(x + 3, y - 5, 2, 6, '#6b4a2e');
      R(x + 1, y - hh, 6, 3, a); R(x - 1, y - hh + 3, 10, 4, b); R(x - 2, y - hh + 7, 12, 4, a); R(x, y - hh + 10, 8, 2, b);
      if (st.season === 'winter') { R(x + 1, y - hh, 6, 1, '#fff'); R(x - 1, y - hh + 3, 10, 1, '#fff'); R(x - 2, y - hh + 7, 12, 1, '#fff'); }
    }
    function pine(x, y, h) {
      R(x + 3, y - 4, 2, 5, '#5a3e28');
      for (let i = 0; i < 4; i++) { const w = 4 + i * 3; R(x + 4 - w / 2, y - h + i * 4, w, 4, i % 2 ? '#2f6b3a' : '#3a7b45'); }
    }
    function flag(x, y, big) {
      R(x, y, 1, big ? 30 : 26, '#a8a8a8'); R(x - 1, y - 1, 3, 2, '#d6b34a');
      for (let i = 0; i < 14; i++) {
        const yo = Math.round(Math.sin(st.t * 3 + i * .55) * 1);
        R(x + 1 + i, y + 1 + yo, 1, 9, '#fafafa');
      }
      const yo = Math.round(Math.sin(st.t * 3 + 7 * .55) * 1);
      R(x + 7, y + 3 + yo, 3, 2, '#d9323a'); R(x + 7, y + 5 + yo, 3, 2, '#2250a3');
      R(x + 2, y + 2, 1, 1, '#222'); R(x + 2, y + 8, 1, 1, '#222'); R(x + 13, y + 2, 1, 1, '#222'); R(x + 13, y + 8, 1, 1, '#222');
    }
    function usFlag(x, y) {
      R(x, y, 1, 26, '#a8a8a8');
      for (let i = 0; i < 14; i++) {
        const yo = Math.round(Math.sin(st.t * 3 + i * .55 + 1) * 1);
        for (let j = 0; j < 9; j++) R(x + 1 + i, y + 1 + yo + j, 1, 1, j % 2 ? '#fafafa' : '#c62828');
        if (i < 6) for (let j = 0; j < 5; j++) R(x + 1 + i, y + 1 + yo + j, 1, 1, '#274690');
      }
    }
    function window3(x, y, w, h) {
      const isNight = night();
      R(x, y, w, h, isNight ? '#2a3550' : '#6aa2c8');
      if (!isNight) R(x, y, w, 1, '#d5ecf8');
      lit.push([x, y, w, h]);
    }
    function barracks(x, y, w, h) {
      R(x, y + 5, w, h - 5, '#d4cdb0'); R(x - 2, y, w + 4, 6, '#6e8050'); R(x - 2, y + 5, w + 4, 1, '#566640');
      if (st.season === 'winter') R(x - 2, y - 1, w + 4, 2, '#fff');
      for (let i = 4; i < w - 6; i += 9) window3(x + i, y + 10, 5, 6);
      R(x + w / 2 - 3, y + h - 8, 6, 8, '#5a4632'); R(x, y + h - 1, w, 1, '#a69f86');
    }
    function crowd(list, y, uni, sp, extra) {
      list.forEach((o, i) => {
        const x = ((o + st.t * sp) % (W + 40)) - 20;
        man(x, y + (i % 2) * 3, uni, Math.floor(st.t * 4 + i) % 2, extra);
      });
    }
    function ground(y, col, col2) { R(0, y, W, H - y, col); R(0, y, W, 1, col2); }

    /* ---------- 장면 ---------- */
    const SCENES = {
      camp() {
        sky(); ridge(60, 10, .045, 1.2, P().far); ridge(68, 6, .07, .4, P().mid);
        ground(66, P().grass, P().grass2);
        R(0, 76, W, 32, '#d8c9a3'); R(0, 92, W, 1, '#cbbb92'); R(0, 100, W, 1, '#cbbb92');
        barracks(8, 44, 46, 26); barracks(66, 42, 46, 28); tree(122, 72, 16); tree(176, 72, 18);
        flag(142, 38);
        const march = st.overlay === 'march';
        crowd([0, 22, 44, 66, 88], 82, st.uni, march ? 7 : 11, march ? { pack: true } : null);
        if (st.uni === 'army' || st.uni === 'marine') crowd([40], 96, st.uni, 6);
      },
      gop() {
        sky(); ridge(52, 18, .03, 2, P().far); ridge(62, 12, .05, .8, P().hill);
        ground(70, P().grass, P().grass2); R(0, 84, W, 12, '#a89a78'); R(0, 84, W, 1, '#8e8260');
        for (let i = 0; i < W; i += 4) R(i, 90, 2, 1, '#bfb28f');
        for (let x = 4; x < W; x += 14) R(x, 54, 1, 22, '#4a4a4a');
        [58, 62, 66, 70].forEach((y, k) => { R(0, y, W, 1, '#8c8c8c'); for (let x = k * 2; x < W; x += 5) R(x, y - 1, 1, 3, '#6e6e6e'); });
        // 감시탑
        R(144, 48, 2, 28, '#6b5a45'); R(160, 48, 2, 28, '#6b5a45'); R(146, 62, 14, 1, '#6b5a45');
        R(140, 44, 26, 3, '#7a6a54'); R(142, 28, 22, 16, '#8a7a62'); R(139, 25, 28, 4, '#4a5a30');
        R(145, 33, 16, 6, '#2b3a4a');
        man(148, 30, st.uni, 0, { rifle: true }); R(142, 42, 22, 2, '#5a4a38');
        crowd([20], 80, st.uni, 8, { rifle: true });
        pine(14, 80, 16); pine(176, 82, 18);
      },
      office() {
        sky(); ridge(58, 10, .04, 3, P().far);
        ground(76, P().grass, P().grass2);
        R(0, 80, W, 28, '#a6adb3'); R(0, 80, W, 1, '#8b9299');
        R(48, 32, 96, 48, '#dcd6c3'); R(44, 28, 104, 5, '#8a8f98'); R(48, 32, 96, 1, '#f4f0e2');
        for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) window3(54 + i * 11, 38 + j * 12, 7, 8);
        R(90, 62, 12, 18, '#4a5a70'); R(95, 62, 1, 18, '#2c3846'); R(88, 60, 16, 2, '#8a8f98');
        flag(24, 46); flag(164, 46);
        tree(8, 82, 16); tree(176, 82, 16);
        crowd([10, 100], 86, st.uni, 9, { papers: true });
        // 서류
        const sx = ((10 + st.t * 9) % (W + 40)) - 20; R(sx + 8, 92, 4, 5, '#fff');
      },
      ship() {
        sky();
        R(0, 56, W, H - 56, '#2f6f9f');
        for (let y = 58; y < H; y += 5) {
          const off = Math.floor(st.t * 8 + y * 3) % 12;
          for (let x = -12 + off; x < W; x += 12) R(x, y, 6, 1, y % 2 ? '#4a8fc2' : '#3f83b6');
        }
        const oy = Math.round(Math.sin(st.t * 1.6) * 1.5);
        R(36, 66 + oy, 106, 8, '#8d98a5'); R(142, 66 + oy, 6, 5, '#8d98a5'); R(148, 66 + oy, 3, 3, '#8d98a5');
        R(36, 74 + oy, 104, 2, '#8c3a35'); R(36, 66 + oy, 106, 1, '#6d7782');
        R(66, 54 + oy, 44, 12, '#a5b0bb'); R(78, 44 + oy, 22, 10, '#b9c3cc'); R(81, 47 + oy, 16, 3, '#2b3a4a');
        R(88, 28 + oy, 2, 16, '#7d8791'); R(82, 31 + oy, 14, 2, '#7d8791'); R(86, 26 + oy, 6, 2, '#6d7782');
        R(114, 50 + oy, 9, 12, '#6d7782'); R(114, 50 + oy, 9, 2, '#3a4048');
        R(46, 60 + oy, 12, 3, '#6d7782'); R(56, 59 + oy, 7, 2, '#4a5058');
        flag(36, 40 + oy);
        man(112, 52 + oy, 'navy', Math.floor(st.t * 2) % 2); man(124, 52 + oy, 'navy', 0); man(68, 52 + oy, 'navy', 0);
        R(0, 92, W, 16, '#245f8a');
        for (let y = 94; y < H; y += 4) { const off = Math.floor(st.t * 10 + y) % 10; for (let x = -10 + off; x < W; x += 10) R(x, y, 5, 1, '#3b82b8'); }
        for (let i = 0; i < 2; i++) { const gx = ((i * 90 + st.t * 14) % (W + 30)) - 15; const gy = 18 + i * 9 + Math.round(Math.sin(st.t * 3 + i) * 1.5); R(gx, gy, 3, 1, '#f5f5f5'); R(gx + 3, gy - 1, 3, 1, '#f5f5f5'); R(gx + 6, gy, 3, 1, '#f5f5f5'); }
      },
      runway() {
        sky(); ridge(60, 10, .05, 0.6, P().far);
        ground(66, P().grass, P().grass2);
        R(8, 48, 52, 28, '#9aa3ad'); R(10, 44, 48, 5, '#7b8590'); R(22, 56, 24, 20, '#3c4650'); R(33, 56, 1, 20, '#2c353d');
        R(152, 32, 10, 46, '#c9ced4'); R(146, 24, 22, 10, '#6aa2c8'); R(144, 20, 26, 4, '#7b8590'); R(156, 14, 2, 6, '#7b8590');
        R(0, 82, W, 26, '#5d636b'); R(0, 82, W, 1, '#e8e8e8'); R(0, 106, W, 1, '#e8e8e8');
        for (let i = 0; i < W; i += 16) R(i, 94, 9, 1, '#e8e8e8');
        const jx = ((st.t * 34) % (W + 80)) - 40;
        const jy = 42 - Math.max(0, (jx - 80)) * .08;
        R(jx - 8, jy + 1, 8, 1, '#ffb23a'); R(jx - 5, jy + 1, 5, 1, '#fff2c0');
        R(jx, jy, 26, 3, '#aab4be'); R(jx + 4, jy + 3, 10, 2, '#8d98a5'); R(jx + 2, jy - 3, 5, 3, '#8d98a5');
        R(jx + 18, jy - 1, 5, 1, '#6aa2c8'); R(jx + 26, jy + 1, 3, 1, '#aab4be');
        crowd([30, 90], 88, st.uni === 'army' ? 'af' : st.uni, 7);
      },
      beach() {
        sky();
        R(0, 52, W, 28, '#2f7fb0');
        for (let y = 54; y < 78; y += 4) { const off = Math.floor(st.t * 9 + y * 2) % 12; for (let x = -12 + off; x < W; x += 12) R(x, y, 6, 1, '#5aa2d0'); }
        R(0, 76, W, 32, '#e7d6a6'); R(0, 76, W, 4, '#cdbd8d');
        const foam = Math.round(Math.sin(st.t * 2) * 2); R(0, 76 + foam, W, 1, '#ffffff');
        pine(10, 80, 22); pine(26, 78, 18); pine(172, 82, 22);
        const by = Math.round(Math.sin(st.t * 2.4) * 1);
        R(76, 74 + by, 44, 7, '#3a3a3a'); R(74, 76 + by, 3, 4, '#3a3a3a'); R(118, 76 + by, 3, 4, '#3a3a3a');
        [80, 92, 104].forEach((x, i) => man(x, 62 + by, 'marine', Math.floor(st.t * 3 + i) % 2));
        R(76, 80 + by, 44, 4, '#2c2c2c');
        for (let i = 0; i < 3; i++) { R(82 + i * 12, 79 + by, 1, 6, '#6b4a2e'); }
        crowd([30, 120], 92, 'marine', 10);
      },
      katusa() {
        sky(); ridge(56, 10, .05, 2.2, P().far);
        ground(74, P().grass, P().grass2);
        R(0, 80, W, 28, '#9ba1a6'); R(0, 80, W, 1, '#7f858a');
        R(10, 44, 56, 32, '#ece5d2'); R(8, 40, 60, 5, '#6b7280');
        for (let i = 0; i < 4; i++) window3(16 + i * 12, 52, 7, 8);
        R(100, 40, 70, 36, '#e5ddc7'); R(98, 36, 74, 5, '#6b7280');
        for (let i = 0; i < 5; i++) { window3(106 + i * 12, 46, 7, 8); window3(106 + i * 12, 60, 7, 8); }
        flag(80, 44); usFlag(92, 44); tree(180, 80, 14);
        for (let i = 0; i < W; i += 14) R(i, 100, 8, 1, '#d8d8d8');
        const jx = ((st.t * 16) % (W + 60)) - 30;
        R(jx, 86, 26, 7, '#6b7a4a'); R(jx + 14, 82, 8, 5, '#9ad2e8'); R(jx + 3, 92, 5, 4, '#222'); R(jx + 17, 92, 5, 4, '#222'); R(jx + 8, 84, 6, 2, '#566640');
        crowd([20, 130], 88, 'army', 8);
      },
      town() {
        sky();
        for (let i = 0; i < 9; i++) {
          const bw = 14 + Math.floor(rnd(i + 20) * 10), bh = 22 + Math.floor(rnd(i + 40) * 22), bx = i * 22 - 4;
          R(bx, 62 - bh, bw, bh + 2, i % 2 ? '#c4c9cf' : '#b3b9c1');
          for (let y = 62 - bh + 3; y < 58; y += 6) for (let x = bx + 2; x < bx + bw - 2; x += 5) window3(x, y, 2, 3);
        }
        ground(62, P().grass, P().grass2);
        R(0, 62, W, 18, '#cfc9b6'); R(0, 80, W, 28, '#6c7077'); R(0, 80, W, 1, '#4f5359'); R(0, 79, W, 2, '#bdb8aa');
        // 주민센터
        R(54, 44, 76, 32, '#efe6d0'); R(50, 40, 84, 5, '#7a8a6a'); R(70, 48, 44, 9, '#2f6f4f');
        for (let i = 0; i < 6; i++) R(74 + i * 6, 51, 3, 3, '#e8f4ec');
        for (let i = 0; i < 3; i++) window3(60 + i * 24, 62, 8, 8);
        R(88, 62, 10, 14, '#4a5a70'); flag(140, 42);
        tree(8, 78, 18); tree(168, 78, 18);
        for (let i = 0; i < W; i += 18) R(i, 94, 9, 1, '#e8e8e8');
        for (let i = 0; i < 6; i++) R(130 + i * 4, 82, 2, 14, '#e8e8e8');
        const bx = ((st.t * 20) % (W + 80)) - 50;
        R(bx, 88, 42, 12, '#2f7d4a'); R(bx, 88, 42, 2, '#245f39'); for (let i = 0; i < 5; i++) R(bx + 3 + i * 8, 90, 6, 4, '#bfe3f2'); R(bx + 5, 99, 6, 4, '#222'); R(bx + 29, 99, 6, 4, '#222');
        crowd([20, 70], 66, st.uni, 7, null);
        crowd([100], 88, st.uni, 6, null);
      },
      bureau() {
        sky(); ridge(60, 10, .04, 1, P().far);
        ground(70, P().grass, P().grass2); R(0, 82, W, 26, '#c9c3b0');
        R(30, 28, 132, 54, '#cfcab8'); R(26, 24, 140, 5, '#7a8590');
        for (let j = 0; j < 3; j++) for (let i = 0; i < 10; i++) window3(38 + i * 12, 34 + j * 13, 7, 8);
        R(88, 62, 16, 20, '#3f5f86'); R(95, 62, 2, 20, '#2f4a6c'); R(72, 18, 48, 8, '#2f4a6c');
        for (let i = 0; i < 8; i++) R(76 + i * 5, 20, 3, 4, '#e8eef4');
        flag(16, 40); flag(176, 40);
        for (let i = 0; i < 5; i++) {
          const x = ((i * 26 + st.t * 7) % 130) + 26;
          man(x, 86 + (i % 2) * 4, 'civil', Math.floor(st.t * 3 + i) % 2, { shirt: i });
        }
        tree(4, 84, 16); tree(182, 84, 16);
      },
    };

    /* ---------- 오버레이 ---------- */
    function particles() {
      const s = st.season;
      if (st.overlay === 'snow' || s === 'winter') {
        const n = st.overlay === 'snow' ? 70 : 22;
        for (let i = 0; i < n; i++) {
          const x = (rnd(i + 3) * W + Math.sin(st.t + i) * 4 + W) % W;
          const y = (rnd(i + 77) * H + st.t * (14 + (i % 4) * 4)) % H;
          R(x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2, '#ffffff');
        }
      }
      if (st.overlay === 'rain') {
        c.globalAlpha = .22; R(0, 0, W, H, '#1d3550'); c.globalAlpha = 1;
        for (let i = 0; i < 80; i++) {
          const x = (rnd(i + 3) * W + st.t * 20) % W;
          const y = (rnd(i + 55) * H + st.t * 90) % H;
          R(x, y, 1, 4, '#b9d6f0'); R(x - 1, y + 4, 1, 1, '#b9d6f0');
        }
      }
      if (st.overlay === 'fog') {
        c.globalAlpha = .5;
        for (let i = 0; i < 4; i++) { const x = ((i * 70 + st.t * 4) % (W + 100)) - 100; R(x, 36 + i * 10, 140, 10, '#ffffff'); }
        c.globalAlpha = 1;
      }
      if (s === 'autumn' && !st.overlay) {
        for (let i = 0; i < 12; i++) {
          const x = (rnd(i + 8) * W + Math.sin(st.t * 2 + i) * 6 + W) % W;
          const y = (rnd(i + 15) * H + st.t * 10) % H;
          R(x, y, 2, 1, i % 2 ? '#d9822b' : '#b5532a');
        }
      }
    }
    function nightShade() {
      if (!night()) return;
      c.globalAlpha = .46; R(0, 0, W, H, '#070c2a'); c.globalAlpha = 1;
      lit.forEach(([x, y, w, h], i) => { if (rnd(i + st.scene.length) > .35) R(x, y, w, h, '#ffd76a'); });
    }

    function render() {
      lit.length = 0;
      const fn = SCENES[st.scene] || SCENES.camp;
      fn();
      particles();
      nightShade();
    }
    inst.render = render;
    inst.set = o => Object.assign(st, o);
    inst.start = () => {
      if (inst.running) return;
      inst.running = true;
      const loop = ts => {
        if (!inst.running) return;
        inst.raf = requestAnimationFrame(loop);
        if (ts - inst.last < 90) return;
        inst.last = ts; st.t += .09; render();
      };
      inst.raf = requestAnimationFrame(loop);
    };
    inst.stop = () => { inst.running = false; cancelAnimationFrame(inst.raf); };
    instances.push(inst);
    render();
    return inst;
  }

  /* 신분증 사진용 초상 */
  function portrait(canvas, uni, shirt) {
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    const pal = Object.assign({}, UNI[uni] || UNI.army);
    if (uni === 'civil') { const sh = SHIRTS[(shirt || 0) % SHIRTS.length]; pal.u = sh[0]; pal.U = sh[1]; }
    const s = Math.floor(Math.min(canvas.width / 9, canvas.height / 11));
    c.fillStyle = '#b9d3e6'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#9fbfd6'; c.fillRect(0, canvas.height * .6, canvas.width, canvas.height * .4);
    const rows = HEAD.concat(BODY).slice(0, 10);
    const ox = Math.floor((canvas.width - 9 * s) / 2), oy = canvas.height - rows.length * s;
    rows.forEach((row, r) => { for (let q = 0; q < row.length; q++) { const ch = row[q]; if (ch !== '.') { c.fillStyle = pal[ch]; c.fillRect(ox + q * s, oy + r * s, s, s); } } });
  }

  return { create, portrait, W, H };
})();
