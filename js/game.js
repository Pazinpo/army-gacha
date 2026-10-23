'use strict';
/* ============================================================
   군대 뽑기 시뮬레이터 — 엔진 & UI
   ============================================================ */
(() => {
  const $ = id => document.getElementById(id);
  const rand = Math.random;
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, window.__fastSim ? 0 : ms)); // __fastSim: 개발용 시뮬레이션 훅
  const val = (x, s) => (typeof x === 'function' ? x(s) : x);

  function wpick(items, wf = x => x.w) {
    let tot = 0;
    const ws = items.map(i => { const w = Math.max(0, wf(i)); tot += w; return w; });
    let r = rand() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function probOf(items, item, wf = x => x.w) {
    const tot = items.reduce((a, i) => a + Math.max(0, wf(i)), 0);
    return wf(item) / tot;
  }
  const fmtPct = p => (p >= .1 ? (p * 100).toFixed(0) : p >= .01 ? (p * 100).toFixed(1) : (p * 100).toFixed(2)) + '%';
  const stars = g => { const n = Math.max(1, Math.min(5, Math.round(g) + 3)); return '★'.repeat(n) + '☆'.repeat(5 - n); };

  /* ---------- 저장소 ---------- */
  const Store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } },
  };
  const SAVE_KEY = 'armyGacha.save.v1', DEX_KEY = 'armyGacha.dex.v1', PREF_KEY = 'armyGacha.pref.v1';

  /* ---------- 효과음 ---------- */
  const SFX = {
    on: true, ctx: null,
    init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 무시 */ } } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone(f, d = .08, type = 'square', vol = .03, delay = 0) {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + .02);
    },
    tick() { this.tone(480 + Math.random() * 120, .04, 'square', .02); },
    thump() { this.tone(120, .22, 'sine', .12); },
    reveal(k) { const seq = { N: [392], R: [392, 523], SR: [392, 523, 659], SSR: [392, 523, 659, 784], UR: [392, 523, 659, 784, 1047, 1318] }[k] || [392]; seq.forEach((f, i) => this.tone(f, .18, 'triangle', .07, i * .09)); },
    bad() { this.tone(196, .25, 'sawtooth', .04); this.tone(147, .32, 'sawtooth', .04, .12); },
    click() { this.tone(660, .06, 'triangle', .05); },
  };

  /* ---------- 전역 상태 ---------- */
  let S = null;                       // 현재 진행
  const G = { speed: 1, paused: false, skipping: false, auto: false, timer: 0, autoTimer: 0, pending: null, inGacha: false, queue: [], ovl: null, hiddenPause: false, running: false };
  let sceneArt = null, titleArt = null;

  /* ---------- 파생값 ---------- */
  const B = () => BRANCH[S.branch];
  const U = () => UNITS.find(u => u.id === S.unitId);
  const C = () => CULTURES.find(c => c.id === S.cultureId);
  const BO = () => BOSSES.find(b => b.id === S.bossId);
  const daysTotal = () => Math.round(B().months * 30.4375);
  const rankIdxAt = (w, T) => { const f = w / T; return f < .111 ? 0 : f < .444 ? 1 : f < .778 ? 2 : 3; };
  const rankLabel = () => (B().id === 'civil' ? CIVIL_PHASE : RANK_NAMES)[S.rankIdx];
  function dateAt(week) { const m = S.startMonth + Math.floor(week * 7 / 30.4375); return { y: S.startYear + Math.floor(m / 12), m: m % 12 }; }
  function seasonOf(m) { return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
  function refresh() {
    S.rankIdx = rankIdxAt(S.week, S.totalWeeks || 78);
    S.daysLeft = S.branch && S.totalWeeks ? Math.max(0, Math.round(daysTotal() * (1 - S.week / S.totalWeeks))) : (S.branch ? daysTotal() : 0);
    S.season = seasonOf(dateAt(S.week).m);
    S.tags = (S.unitId ? U().tags : []).concat([S.branch || '']);
  }

  /* ---------- 새 게임 ---------- */
  function newRun(name) {
    const major = wpick(MAJORS);
    const gf = rand() < .55;
    return {
      v: 1, name: name || (pick(SURNAMES) + pick(GIVEN)), major: major.id, majorName: major.name, majorBlurb: major.blurb,
      serial: '26-' + ri(70000000, 79999999), startMonth: ri(0, 11), startYear: new Date().getFullYear(), shirt: ri(0, 4),
      stats: Object.assign({ body: 50, mind: 56, rep: 48, bond: 48, skill: 42 }, {}),
      money: major.money || 0, leave: 0, gf, gfStart: gf, gfLove: gf ? ri(50, 80) : 0, week: 0, phase: 'intake',
      fit: null, branch: null, unitId: null, cultureId: null, bossId: null, probs: {}, luck: 0, tickets: 1,
      flags: {}, seen: {}, log: [], highlights: [], lastLeaveWeek: -99, cool: 0, trainWeeks: 0, totalWeeks: 0, sched: {}, drift: {},
      month: 0, rankIdx: 0, daysLeft: 0, season: 'spring', tags: [],
    };
  }
  function applyMajorMods() {
    const m = MAJORS.find(x => x.id === S.major);
    Object.entries(m.mod || {}).forEach(([k, v]) => { S.stats[k] = clamp(S.stats[k] + v); });
  }

  /* ============================================================
     화면 전환
     ============================================================ */
  function showScreen(id) {
    ['title', 'game', 'end'].forEach(k => $('screen-' + k).classList.toggle('hidden', k !== id));
    window.scrollTo(0, 0);
    if (id === 'title') { sceneArt && sceneArt.stop(); titleArt && titleArt.start(); }
    else if (id === 'game') { titleArt && titleArt.stop(); sceneArt && sceneArt.start(); }
    else { titleArt && titleArt.stop(); sceneArt && sceneArt.stop(); }
  }
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.add('hidden'), 2200);
  }

  /* ============================================================
     뽑기 연출
     ============================================================ */
  function confetti() {
    const box = $('confetti'); box.innerHTML = '';
    const cols = ['#f5c542', '#e8553d', '#3aa675', '#4c8bf5', '#b05cf0', '#ffffff'];
    for (let i = 0; i < 46; i++) {
      const d = document.createElement('i');
      d.style.left = Math.random() * 100 + '%';
      d.style.background = pick(cols);
      d.style.animationDelay = (Math.random() * .4) + 's';
      d.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      d.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      box.appendChild(d);
    }
    setTimeout(() => { box.innerHTML = ''; }, 3200);
  }
  function renderReveal(i) {
    const g = i.g == null ? '' : `<div class="rv-grade">꿀지수 <span class="stars">${stars(i.g)}</span> <b style="color:${gradeOf(i.g).c}">${gradeOf(i.g).n}</b></div>`;
    return `<div class="rv-rar">${i.rar.name}</div><div class="rv-name">${i.name}</div>${i.sub ? `<div class="rv-sub">${i.sub}</div>` : ''}` +
      `<div class="rv-prob">이 결과가 나올 확률 <b>${fmtPct(i.p)}</b></div>${g}<p class="rv-blurb">${i.blurb || ''}</p>${i.note ? `<p class="rv-note">${i.note}</p>` : ''}`;
  }

  function gacha(cfg) {
    return new Promise(resolve => {
      G.inGacha = true; clearTimeout(G.timer);
      if (!G.auto) G.skipping = false;
      const ov = $('gacha'), card = $('gacha-card'), reel = $('g-reel'), reelText = $('g-reel-text'), result = $('g-result');
      const bRoll = $('g-roll'), bAcc = $('g-accept'), bRe = $('g-reroll');
      ov.classList.remove('hidden');
      $('g-step').textContent = cfg.step; $('g-title').textContent = cfg.title; $('g-sub').textContent = cfg.sub || '';
      card.className = 'gacha-card';
      result.classList.add('hidden'); result.innerHTML = '';
      reel.classList.remove('landed'); reel.classList.toggle('hidden', !!cfg.instant); reelText.textContent = '?';
      bAcc.classList.add('hidden'); bRe.classList.add('hidden');
      bRoll.classList.toggle('hidden', !!cfg.instant);
      let res = null, busy = false, accepted = false;

      async function spin() {
        if (busy || accepted) return;
        busy = true; SFX.init(); SFX.click();
        bRoll.classList.add('hidden'); bAcc.classList.add('hidden'); bRe.classList.add('hidden');
        result.classList.add('hidden'); card.className = 'gacha-card';
        res = cfg.roll();
        const info = cfg.reveal(res);
        if (!cfg.instant) {
          reel.classList.remove('landed', 'hidden');
          let d = 45, t = 0; const total = cfg.fast ? 800 : 1700;
          while (t < total) { reelText.textContent = pick(cfg.labels); SFX.tick(); await sleep(d); t += d; d = Math.min(260, d * 1.13); }
          reelText.textContent = info.name; reel.classList.add('landed'); SFX.thump();
          await sleep(260);
        } else { await sleep(120); }
        card.className = 'gacha-card rar-' + info.rar.cls + (info.bad ? ' bad' : '');
        if (!cfg.instant) reel.classList.add('hidden');
        result.innerHTML = renderReveal(info); result.classList.remove('hidden');
        if (info.bad) SFX.bad(); else SFX.reveal(info.rar.k);
        if (info.rar.k === 'SSR' || info.rar.k === 'UR' || info.good) confetti();
        bAcc.textContent = cfg.acceptLabel ? cfg.acceptLabel(res) : '이대로 간다 ▶';
        bAcc.classList.remove('hidden');
        if (cfg.canReroll && S.tickets > 0) { bRe.textContent = `🎫 다시 뽑기 (${S.tickets}장)`; bRe.classList.remove('hidden'); }
        busy = false;
        if (G.auto) { await sleep(1500); if (!busy && !accepted) accept(); }
      }
      function accept() {
        if (accepted || busy) return;
        accepted = true; SFX.click();
        ov.classList.add('hidden'); bRoll.onclick = bAcc.onclick = bRe.onclick = null;
        G.inGacha = false; resolve(res);
      }
      function reroll() {
        if (busy || accepted || S.tickets < 1) return;
        S.tickets--; updateWallet(); spin();
      }
      bRoll.onclick = spin; bAcc.onclick = accept; bRe.onclick = reroll;
      if (cfg.instant || G.auto) setTimeout(spin, cfg.instant ? 150 : 700);
    });
  }

  /* ---------- 1) 신체등급 ---------- */
  async function runIntake() {
    let attempts = 0, fit = null;
    while (true) {
      fit = await gacha({
        step: 'STEP 1 · 병역판정검사', title: '신체등급 뽑기', sub: '병무청 신체검사를 마쳤습니다. 결과는…',
        labels: FIT.map(f => `${f.name} · ${f.label}`),
        roll: () => (window.__forceFit ? FIT.find(f => f.kind === window.__forceFit) : attempts >= 2 ? FIT[2] : wpick(FIT)), // __force*: 개발용 시뮬레이션 훅
        reveal: f => {
          const p = probOf(FIT, f);
          return {
            name: `${f.name} · ${f.label}`, sub: '', p, rar: rarityOf(p), blurb: f.desc, g: null,
            good: f.kind === 'exempt', note: f.kind === 'active' ? '입영 통지서가 곧 도착합니다.' : f.kind === 'civil' ? '출퇴근하는 복무, 사회복무요원의 길로 갑니다.' : f.kind === 'exempt' ? '축하…해야 할까요? 이 게임의 입장에서는 가장 희귀한 결말입니다.' : '',
          };
        },
        acceptLabel: f => (f.kind === 'retest' ? '재검사 받으러 가기 ▶' : f.kind === 'exempt' || f.kind === 'exempt5' ? '결과 확인 ▶' : '다음 ▶'),
      });
      if (fit.kind === 'retest' && attempts < 2) { attempts++; toast('재신체검사를 다시 받습니다…'); continue; }
      break;
    }
    S.fit = fit; S.probs.fit = probOf(FIT, fit);
    return fit;
  }

  /* ---------- 2) 군종 ---------- */
  async function runBranch() {
    if (S.fit.kind === 'civil') {
      S.branch = 'civil'; S.probs.branch = 1;
      await gacha({
        step: 'STEP 2 · 복무 형태', title: '사회복무요원 소집', sub: '4급 판정자는 현역 대신 이 길로 갑니다.', instant: true, labels: [],
        roll: () => BRANCH.civil,
        reveal: b => ({ name: b.name, sub: `${b.months}개월 복무`, p: probOf(FIT, S.fit), rar: rarityOf(probOf(FIT, S.fit)), blurb: b.tag + ' ' + b.blurb, g: null, note: '근무지는 훈련 후 발표됩니다.' }),
        acceptLabel: () => '연수 시작 ▶',
      });
      return;
    }
    const pool = BRANCH_ROLL.map(id => BRANCH[id]);
    const b = await gacha({
      step: 'STEP 2 · 군종 배정', title: '군종 뽑기', sub: '원래는 지원과 추첨이지만, 여기서는 100% 운입니다.',
      labels: pool.map(x => x.name), canReroll: true,
      roll: () => (window.__forceBranch ? BRANCH[window.__forceBranch] : wpick(pool)),
      reveal: x => {
        const p = probOf(pool, x), rar = rarityOf(p);
        let note = '';
        if (x.g >= 2) note = '당첨입니다!! (실제로는 어학성적 통과자 중 전산 추첨, 평균 약 10:1에 지원은 평생 1회예요.)';
        else if (x.g < 0 && rar.k !== 'N') note = '희귀하다고 다 꿀은 아닙니다. 빨간 명찰이 기다립니다.';
        else if (x.id === 'army') note = '가장 흔한 길. 진짜 승부는 자대 배치에서 갈립니다.';
        else if (x.id === 'sangun') note = '병무청이 거주지 기준으로 뽑는, 집에서 출퇴근하는 현역입니다.';
        return { name: x.name, sub: `${x.months}개월 복무 · 훈련 ${x.train}주`, p, rar, blurb: x.tag + ' ' + x.blurb, g: x.g, bad: x.g < 0, note };
      },
      acceptLabel: () => '입영 ▶',
    });
    S.branch = b.id; S.probs.branch = probOf(pool, b);
  }

  /* ---------- 3) 자대·보직·분위기·간부 ---------- */
  function unitBoost(u) {
    const major = MAJORS.find(m => m.id === S.major);
    let f = 1; (u.tags || []).forEach(t => { if (major.boost && major.boost[t]) f = Math.max(f, major.boost[t]); });
    return f;
  }
  async function runUnitDraw() {
    refresh();
    const pool = UNITS.filter(u => u.br === S.branch);
    const wf = u => u.w * unitBoost(u);
    const unit = await gacha({
      step: 'STEP 3 · 자대 배치', title: S.branch === 'civil' ? '근무지 뽑기' : '자대·보직 뽑기', sub: DRAW_SUB[S.branch] || '수료를 마치고, 드디어 배치 명단이 발표됩니다.',
      labels: pool.map(u => u.name), canReroll: true,
      roll: () => wpick(pool, wf),
      reveal: u => {
        const p = probOf(pool, u, wf), rar = rarityOf(p), boosted = unitBoost(u) > 1;
        return { name: u.name, sub: u.place, p, rar, blurb: u.blurb, g: u.g, bad: u.g <= -1, good: u.g >= 2, note: boosted ? `전공 보정 적용! (${S.majorName})` : '' };
      },
      acceptLabel: () => '배치받으러 간다 ▶',
    });
    S.unitId = unit.id; S.probs.unit = probOf(pool, unit, wf);
    refresh();

    const cul = await gacha({
      step: 'STEP 4 · 부대 분위기', title: '분위기 뽑기', sub: '같은 보직이라도 부대 분위기에 따라 하루가 달라집니다.', fast: true,
      labels: CULTURES.map(c => c.name),
      roll: () => wpick(CULTURES),
      reveal: c => { const p = probOf(CULTURES, c); return { name: c.name, sub: '', p, rar: rarityOf(p), blurb: c.desc, g: c.g, bad: c.g <= -1 }; },
      acceptLabel: () => '다음 ▶',
    });
    S.cultureId = cul.id; S.probs.culture = probOf(CULTURES, cul);

    const boss = await gacha({
      step: 'STEP 5 · 간부·선임 운', title: '간부 운 뽑기', sub: '내 군 생활의 8할은 사람이라고들 합니다.', fast: true,
      labels: BOSSES.map(b => b.name),
      roll: () => wpick(BOSSES),
      reveal: b => { const p = probOf(BOSSES, b); return { name: b.name, sub: '', p, rar: rarityOf(p), blurb: b.desc, g: b.g, bad: b.g <= -1, good: b.g >= 2 }; },
      acceptLabel: () => '다음 ▶',
    });
    S.bossId = boss.id; S.probs.boss = probOf(BOSSES, boss);

    S.luck = unit.g + cul.g + boss.g;
    const p3 = S.probs.unit * S.probs.culture * S.probs.boss;
    const comment = S.luck >= 5 ? '역대급 꿀 복무가 예상됩니다. 주변의 질투를 조심하세요.' : S.luck >= 2 ? '꽤 괜찮은 뽑기! 이 정도면 감사히 복무해야겠습니다.' : S.luck >= -1 ? '평범한 복무가 예상됩니다. 결국 선택이 승부를 가릅니다.' : S.luck >= -4 ? '조금 험난하지만, 그만큼 단단해질 기회입니다.' : '축하합니다… 아니, 응원합니다. 정말 굳세게 버텨 주세요.';
    await gacha({
      step: 'FINAL · 종합', title: '내 복무 운', sub: `${unit.name} · ${cul.name} · ${boss.name}`, instant: true, labels: [],
      roll: () => S.luck,
      reveal: lk => ({ name: `복무 운 ${stars(clamp(lk / 2, -2, 2))}`, sub: gradeOf(clamp(lk / 2, -2, 2)).n + ' 복무', p: p3, rar: rarityOf(p3), blurb: comment, g: clamp(lk / 2, -2, 2), bad: lk <= -3, good: lk >= 4, note: '이 조합이 나올 확률 — 같은 군 생활은 두 번 다시 나오지 않습니다.' }),
      acceptLabel: () => '군 생활 시작 ▶',
    });
    computeDrift();
  }
  function computeDrift() {
    const u = U(), c = C(), b = BO();
    const d = { body: (u.phys - .35) * .35, mind: u.g * .15, rep: 0, bond: 0, skill: u.skill * 1.1 };
    [c.drift, b.drift].forEach(x => Object.entries(x || {}).forEach(([k, v]) => { d[k] += v * 1.4; }));
    S.drift = d;
  }

  /* ============================================================
     이벤트 처리
     ============================================================ */
  function applyFx(fx) {
    if (!fx) return;
    Object.entries(fx).forEach(([k, v]) => {
      if (STAT_KEYS.includes(k)) S.stats[k] = clamp(S.stats[k] + v);
      else if (k === 'money') S.money = Math.max(0, S.money + v);
      else if (k === 'leave') S.leave = Math.max(0, S.leave + v);
      else if (k === 'gf') { if (S.gf) S.gfLove = clamp(S.gfLove + v); }
    });
    updateStats(fx);
    if (S.gf && S.gfLove <= 6 && !S.flags.breakup) { S.flags.breakup = true; G.queue.push({ type: 'event', ev: MS.breakup }); }
  }
  function chipsHtml(fx) {
    if (!fx) return '';
    const order = ['body', 'mind', 'rep', 'bond', 'skill', 'money', 'leave', 'gf'];
    return order.filter(k => fx[k] && !(k === 'gf' && !S.gf)).map(k => {
      const v = fx[k], pos = v > 0, unit = k === 'money' ? '만원' : k === 'leave' ? '일' : '';
      return `<span class="chip ${pos ? 'pos' : 'neg'}">${STAT_NAME[k]} ${pos ? '+' : '−'}${Math.abs(v)}${unit}</span>`;
    }).join('');
  }
  function addLog(text, hl) {
    S.log.unshift({ w: S.week, r: S.branch ? rankLabel() : '', t: text, hl: !!hl });
    if (S.log.length > 160) S.log.length = 160;
    renderLog();
  }
  function addHighlight(t) { if (t && !S.highlights.includes(t)) S.highlights.push(t); }

  function eligible(ev) {
    if (ev.id === 'e_quiet') return false;
    if (ev.r && (S.rankIdx < ev.r[0] || S.rankIdx > ev.r[1])) return false;
    if (ev.b && !ev.b.includes(S.branch)) return false;
    if (ev.tags && !ev.tags.some(t => S.tags.includes(t))) return false;
    if (ev.season && ev.season !== S.season) return false;
    if (!ev.repeat && S.seen[ev.id]) return false;
    if (ev.need && !ev.need(S)) return false;
    return true;
  }
  function chooseRandomEvent() {
    const pool = EVENTS.filter(eligible);
    if (!pool.length) return null;
    const prio = pool.filter(e => e.w >= 50);
    if (prio.length) return prio[0];
    if (rand() > .4) return null;
    return wpick(pool);
  }

  /* 오버레이 장면 */
  const OVERLAYS = ['night', 'snow', 'rain', 'fog', 'march'];
  function setEventScene(key) {
    if (!key) return;
    G.ovl = { key, until: S.week + 2 };
    applyScene();
  }
  function baseScene() {
    if (S.phase === 'intake') return 'bureau';
    if (S.phase === 'train') return S.branch === 'civil' ? 'office' : 'camp';
    return U().scene;
  }
  function applyScene() {
    if (!sceneArt || !S) return;
    if (G.ovl && S.week > G.ovl.until) G.ovl = null;
    let base = baseScene(), overlay = '';
    if (G.ovl) { if (OVERLAYS.includes(G.ovl.key)) { overlay = G.ovl.key; if (overlay === 'march') base = 'camp'; } else base = G.ovl.key; }
    sceneArt.set({ scene: base, season: S.season, uni: S.branch ? B().uni : 'civil', shirt: S.shirt, overlay });
  }

  /* 이벤트 표시 */
  function renderFocus(v) {
    $('f-tag').textContent = v.tag || '상황';
    $('f-title').textContent = v.title || '';
    $('f-text').textContent = v.text || '';
    $('f-chips').innerHTML = v.chips || '';
    const res = $('f-result');
    res.textContent = v.result || ''; res.classList.toggle('hidden', !v.result);
    const box = $('f-choices'); box.innerHTML = '';
    (v.choices || []).forEach(c => {
      const b = document.createElement('button');
      b.className = 'choice' + (c.risky ? ' risky' : '') + (c.cont ? ' cont' : '');
      b.innerHTML = `<b>${c.label}</b>${c.risky ? '<small>도전</small>' : ''}`;
      b.onclick = () => { SFX.init(); SFX.click(); c.fn(); };
      box.appendChild(b);
    });
    $('focus').className = 'focus card k-' + (v.kind || 'auto');
    $('focus').classList.remove('flash'); void $('focus').offsetWidth; $('focus').classList.add('flash');
    if (v.choices && v.choices.length) $('focus').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function tagFor(ev) { return ev.milestone ? '이정표' : ev.auto ? '일상' : '결정'; }

  /* @return true if blocked waiting for player */
  function showEvent(ev) {
    if (ev.scene) setEventScene(ev.scene);
    if (!ev.repeat) S.seen[ev.id] = true;
    const title = val(ev.title, S), text = val(ev.text, S);
    if (ev.auto) {
      applyFx(ev.fx);
      if (ev.flag) S.flags[ev.flag] = true;
      if (typeof ev.hl === 'string') addHighlight(ev.hl);
      if (ev.onShow) ev.onShow(S);
      renderFocus({ tag: tagFor(ev), title, text, result: val(ev.result, S), chips: chipsHtml(ev.fx), kind: 'auto' });
      addLog(`${title} — ${val(ev.result, S) || text}`, !!ev.hl && ev.hl !== false);
      return false;
    }
    const choices = (ev.choices || []).filter(c => !c.need || c.need(S));
    G.pending = { ev, phase: 'choose' };
    if (!G.auto) G.skipping = false;
    renderFocus({
      tag: tagFor(ev), title, text, kind: 'choice',
      choices: choices.map(c => ({ label: c.t, risky: !!c.p, fn: () => choose(ev, c) })),
    });
    scheduleAuto(() => { const c = pick(choices); choose(ev, c); }, 1500);
    return true;
  }
  function scheduleAuto(fn, ms) {
    clearTimeout(G.autoTimer);
    if (G.auto) G.autoTimer = setTimeout(fn, G.skipping ? 200 : ms);
  }

  function choose(ev, ch) {
    if (!G.pending || G.pending.phase !== 'choose') return;
    clearTimeout(G.autoTimer);
    if (ch.leaveMenu) { openLeaveMenu(ev, ch.leaveCtx); return; }
    let out = ch, won = null;
    if (ch.p) { won = rand() < Math.min(.95, Math.max(.05, ch.p(S))); out = won ? ch.win : ch.lose; }
    applyFx(out.fx);
    if (ev.flag) S.flags[ev.flag] = true;
    if (ch.set) Object.assign(S.flags, ch.set);
    if (out.set) Object.assign(S.flags, out.set);
    const hl = out.hl || ch.hl;
    if (hl) addHighlight(hl);
    if (ev.onChoose) ev.onChoose(S, ch);
    const title = val(ev.title, S);
    addLog(`${title} — ${out.text}`, !!hl);
    if (won === true) SFX.reveal('R'); else if (won === false) SFX.bad();
    G.pending = { ev, phase: 'result' };
    renderFocus({
      tag: '결과', title, text: val(ev.text, S), kind: 'result', chips: chipsHtml(out.fx),
      result: (won === true ? '성공! ' : won === false ? '아쉽게 실패… ' : '') + out.text,
      choices: [{ label: '계속하기 ▶', cont: true, fn: afterEvent }],
    });
    scheduleAuto(afterEvent, 1700);
  }

  /* 휴가 메뉴 */
  const RETURN_LINES = [
    '복귀 전날은 군필자라면 누구나 아는 그 기분이다. 군번줄을 다시 목에 거니 현실로 돌아온다.',
    '복귀 시간은 저녁 점호 전까지. 정문이 보이자 심장이 철렁했다.',
    '복귀 버스에서 창밖만 바라보았다. 시간은 왜 이리 빠른가.',
    '군복을 다시 입는 순간 정신이 번쩍 들었다.',
    '"다녀왔습니다!" 동기들의 환영에 어쩐지 마음이 놓인다.',
  ];
  /* ctx: { days, free, label } — free면 정기휴가 일수를 쓰지 않는 휴가(신병위로휴가 등) */
  function openLeaveMenu(ev, ctx) {
    ctx = ctx || { days: Math.min(8, Math.floor(S.leave)), free: false, label: '휴가' };
    G.pending = { ev, phase: 'choose' };
    const plans = LEAVE_PLANS.filter(p => !p.need || p.need(S));
    renderFocus({
      tag: '휴가', title: `${ctx.label} 계획`, text: `${ctx.days}일간의 자유. 어떻게 쓸까요?`, kind: 'choice',
      choices: plans.map(p => ({ label: p.t, fn: () => leavePlan(ev, p, ctx) })),
    });
    scheduleAuto(() => leavePlan(ev, pick(plans), ctx), 1300);
  }
  function leavePlan(ev, p, ctx) {
    clearTimeout(G.autoTimer);
    const used = ctx.days;
    if (!ctx.free) S.leave = Math.max(0, S.leave - used);
    S.lastLeaveWeek = S.week;
    applyFx(p.fx);
    if (ctx.free) addHighlight('자대 배치 후 처음 나간 신병위로휴가, 사회의 공기가 낯설고 달았다');
    const text = `${p.text} ${pick(RETURN_LINES)}`;
    addLog(`${ctx.label} ${used}일 — ${text}`, !!ctx.free);
    G.pending = { ev, phase: 'result' };
    renderFocus({
      tag: '결과', title: `${ctx.label} ${used}일`, text: p.t, kind: 'result', chips: chipsHtml(Object.assign({}, p.fx, ctx.free ? {} : { leave: -used })), result: text,
      choices: [{ label: '계속하기 ▶', cont: true, fn: afterEvent }],
    });
    scheduleAuto(afterEvent, 1800);
  }

  function afterEvent() {
    if (!G.pending || G.pending.phase !== 'result') return;
    clearTimeout(G.autoTimer);
    G.pending = null; S.cool = 1;
    updateAll();
    processQueue();
  }

  /* ---------- 이정표 이벤트 ---------- */
  const MS = {
    arrive: {
      id: 'ms_arrive', milestone: true, scene: null,
      title: s => (s.branch === 'civil' ? '첫 출근' : '자대 첫날'),
      text: s => (s.branch === 'civil'
        ? `${U().place}에 첫 출근했다. 담당 주무관님이 자리를 안내해 준다. 어디부터 익혀야 할지 막막하다.`
        : `${U().place}에 도착했다. 낯선 얼굴들이 일제히 나를 쳐다본다. 첫인상이 한 달을 좌우한다.`),
      choices: [
        { t: '큰 소리로 인사한다', p: () => .6, win: { fx: { rep: 5, bond: 2 }, text: '"잘 부탁드립니다!" 목소리가 쩌렁쩌렁 울렸다. 분위기가 한결 부드러워졌다.' }, lose: { fx: { rep: -1, mind: -2 }, text: '긴장해서 목소리가 삑사리 났다. 모두가 웃었지만 어쩐지 정겹다.' } },
        { t: '조용히 메모하며 따라다닌다', fx: { skill: 2, bond: 1 }, text: '배울 건 많고 모르는 건 더 많다. 일단 받아 적는다.' },
        { t: '눈치를 보며 분위기부터 살핀다', fx: { mind: 1, rep: -1 }, text: '누구에게 무엇을 물어야 하는지 파악하느라 하루가 갔다.' },
      ],
    },
    breakup: {
      id: 'ms_breakup', milestone: true, auto: true, title: '고무신 거꾸로 신다', text: '한참 연락이 뜸하던 끝에, 장문의 메시지가 도착했다. 읽는 내내 손끝이 차가워진다.',
      fx: { mind: -14, bond: 2 }, result: '그렇게 곰신과의 인연은 끝났다. 동기가 말없이 초코파이를 건넨다. "나도 그랬어. 괜찮아질 거야."', hl: '곰신이 고무신을 거꾸로 신어 마음이 무너졌던 시기',
      onShow: s => { s.gf = false; },
    },
    promo: i => ({
      id: 'ms_promo' + i, milestone: true, auto: true,
      title: S.branch === 'civil' ? ['', '적응 완료', '중견 복무자', '말년 복무'][i] : `${RANK_NAMES[i]} 진급`,
      text: ['', S.branch === 'civil' ? '이제 업무가 손에 붙었다. 담당자도 자주 믿고 맡긴다.' : '일병 계급장을 단다. 막내 티를 벗고 슬슬 요령이 생긴다.', S.branch === 'civil' ? '이제 제법 선배 복무자가 되었다. 후임 복무자도 들어왔다.' : '상병 진급! 후임들이 들어오고 책임도 늘었다. 월급도 올랐다.', S.branch === 'civil' ? '남은 기간이 한 손에 꼽힌다. 마지막 스퍼트를 준비한다.' : '병장 진급! 군 생활의 마지막 단계. 전역이 눈앞에 있다.'][i],
      fx: { mind: 3, rep: 1 }, result: ['', '이제 달력의 날짜가 더 선명하게 보인다.', '"상병 OOO, 이상 무!" 목소리에 자신감이 붙었다.', '병장이 되니 거울 속 얼굴이 한결 여유롭다.'][i], hl: i === 3 ? '병장 계급장을 단 날' : false,
    }),
    d100: { id: 'ms_d100', milestone: true, auto: true, title: '전역 D-100', text: '전역이 100일 앞으로 다가왔다. 부대 안에서 소소한 100일 기념 파티가 열렸다.', fx: { mind: 7, bond: 3, money: -3 }, result: '케이크 대신 초코파이를 쌓아 올렸다. 그래도 그 어떤 파티보다 즐겁다.', hl: '전역 D-100, 초코파이 탑을 쌓은 소박한 파티' },
    d30: {
      id: 'ms_d30', milestone: true, auto: true, title: '말년 휴가', text: '전역을 한 달 앞두고 남은 휴가를 한꺼번에 쓰는 시간이다.', fx: {}, result: '',
      onShow(s) {
        const used = Math.min(15, Math.floor(s.leave)); // 말년휴가는 한 번에 15일을 넘기지 못한다
        if (used >= 3) { applyFx({ mind: 9, body: 4, money: -10 }); s.leave = Math.max(0, s.leave - used); this.result = `말출(말년휴가) ${used}일. 사회 공기를 흠뻑 마시고 돌아오는 길, 달력이 한 페이지 남은 걸 보고 실감했다.`; }
        else { applyFx({ mind: 2 }); this.result = '남은 휴가가 거의 없다. 대신 부대에서 소소한 여유를 즐기며 마지막 한 달을 보낸다.'; }
        this.fx = used >= 3 ? { mind: 9, body: 4, money: -10, leave: -used } : { mind: 2 };
      },
    },
    d1: {
      id: 'ms_d1', milestone: true, auto: true, hl: '전역 전날 밤, 동기들과 나눈 마지막 인사',
      title: s => (s.branch === 'civil' ? '마지막 근무일' : '마지막 점호'),
      text: s => (s.branch === 'civil'
        ? '내일이면 복무가 끝난다. 책상을 정리하고 담당자들과 인사를 나눈다. 늘 보던 사무실이 오늘따라 낯설다.'
        : '내일이면 전역이다. 마지막 점호를 마치고 소등된 생활관에서 천장을 바라본다. 법적으로는 전역 당일 자정까지가 복무일이라 마음을 놓을 수는 없다.'),
      fx: { mind: 6, bond: 4 },
      result: '"고생했다." 동기와 후임들이 하나씩 다가와 어깨를 두드린다. 눈가가 시큰해진다.',
    },
    grad: {
      id: 'ms_grad', milestone: true, auto: true, scene: null,
      title: s => (s.branch === 'civil' ? '교육 수료' : '수료식'),
      text: s => (s.branch === 'civil'
        ? '기본 교육이 끝났다. 이제 근무지 배정 결과가 발표된다.'
        : `${BRANCH[s.branch].trainName}에서의 훈련이 끝났다. 수료식 날에는 가족과 만나 짧은 면회 시간도 허락된다. 그리고 곧, 자대 배치 결과가 발표된다.`),
      fx: { mind: 4, rep: 2 }, result: '',
    },
    /* 신병위로휴가(신병위로외박): 정기휴가 일수와 별개의 3박 4일 */
    firstLeave: {
      id: 'ms_firstleave', milestone: true,
      title: '신병위로휴가',
      text: '자대에 와서 처음 받는 휴가, 흔히 "백일 휴가"라고 부르는 신병위로외박이다. 3박 4일. 이병들이 가장 간절히 기다리는 순간이 마침내 왔다.',
      choices: [{ t: '휴가를 나간다!', leaveMenu: true, leaveCtx: { days: 4, free: true, label: '신병위로휴가' }, text: '' }],
    },
  };
  const DRAW_SUB = {
    army: '퇴소 주 목요일, 인사정보체계의 난수 추첨으로 자대가 정해집니다.',
    sangun: '기초군사훈련을 마친 뒤, 집에서 출퇴근할 부대가 정해집니다.',
    katusa: '카투사교육대 수료 뒤 자대와 보직이 정해집니다.',
    navy: '후반기 교육을 마치고 함정 또는 육상 부대로 실무 배치를 받습니다.',
    af: '교육 성적순으로 희망 부대를 고릅니다. (이 게임에선 운이지만요.)',
    marine: '교육훈련단 수료 뒤 실무 부대로 배치됩니다.',
    civil: '근무지는 직접 선택하거나 결원이 생긴 곳으로 자동 배치됩니다.',
  };

  /* ============================================================
     시간 진행
     ============================================================ */
  const REVERT = { body: 55, mind: 55, rep: 50, bond: 50, skill: 45 }; // 시간이 지나면 되돌아가는 기준점
  const BASE_DRIFT = { body: 0, mind: -1.15, rep: -.22, bond: -.26, skill: -.1 }; // 군 생활의 기본 소모(이벤트 보상과 균형)
  const delay = () => (window.__fastSim ? 0 : G.skipping ? 22 : 2300 / G.speed);
  function loop() {
    clearTimeout(G.timer);
    if (!S || !G.running || G.inGacha || G.pending || G.paused || G.busy) return;
    G.timer = setTimeout(() => { tick(); }, delay());
  }

  function tick() {
    if (!S || G.pending || G.inGacha || G.busy) return;
    S.week++;
    const prevRank = S.rankIdx, prevMonth = S.month;
    refresh();
    S.month = Math.floor(S.week * 7 / 30.4375);

    // 월급·휴가
    if (S.month > prevMonth && S.phase === 'service') {
      S.money += PAY[S.rankIdx] * .315; // 봉급 중 저축되는 비율(PX·외출 지출 반영한 게임용 값)
      // 정기휴가(연가)는 3개월 차부터 복무기간에 걸쳐 나눠 쌓인다. GOP 같은 보상휴가 보직은 추가분이 붙는다.
      if (S.month >= 3) S.leave += LEAVE_TOTAL[S.branch] / Math.max(1, B().months - 2) + ((C() && C().leaveRate) || 0) + ((U() && U().leaveBonus) || 0);
    }
    // passive drift
    if (S.phase === 'service') {
      STAT_KEYS.forEach(k => {
        let d = (S.drift[k] || 0) + BASE_DRIFT[k] + (rand() - .5) * .5;
        if (k === 'mind' && S.rankIdx === 0) d -= .12;
        if (k === 'bond' && S.rankIdx === 0) d += .1;
        if (k === 'mind' && S.rankIdx === 3) d += .05;
        S.stats[k] = clamp(S.stats[k] + d + (REVERT[k] - S.stats[k]) * .015);
      });
      if (S.gf) {
        S.gfLove = clamp(S.gfLove - .35);
        const drifting = S.rankIdx >= 1 && S.gfLove < 40 && rand() < (40 - S.gfLove) / 40 * .05;
        if ((drifting || S.gfLove <= 6) && !S.flags.breakup) { S.flags.breakup = true; G.queue.push({ type: 'event', ev: MS.breakup }); }
      }
    }

    // 진급
    if (S.phase === 'service' && S.rankIdx > prevRank) G.queue.push({ type: 'event', ev: MS.promo(S.rankIdx) });

    // 훈련소 일정
    if (S.phase === 'train') {
      (S.sched[S.week] || []).forEach(id => {
        const ev = TRAIN_EVENTS.find(e => e.id === id);
        if (ev) G.queue.push({ type: 'event', ev: Object.assign({ train: true }, ev, { auto: ev.auto || !ev.choices }) });
      });
      if (S.week >= S.trainWeeks) {
        G.queue.push({ type: 'event', ev: MS.grad });
        G.queue.push({ type: 'draw' });
      }
    } else if (S.phase === 'service') {
      if (S.week === S.trainWeeks + 1 && !S.seen.ms_arrive) G.queue.push({ type: 'event', ev: MS.arrive });
      // 입대 100일 무렵(자대 배치 약 9주 뒤) 신병위로휴가. 사회복무·상근예비역은 해당 없음
      if (S.week === S.trainWeeks + 9 && !S.seen.ms_firstleave && B().id !== 'civil' && B().id !== 'sangun') G.queue.push({ type: 'event', ev: MS.firstLeave });
      // 전역 이정표
      if (S.daysLeft <= 100 && !S.seen.ms_d100) G.queue.push({ type: 'event', ev: MS.d100 });
      if (S.daysLeft <= 30 && !S.seen.ms_d30) G.queue.push({ type: 'event', ev: MS.d30 });
      if (S.week >= S.totalWeeks - 1 && !S.seen.ms_d1) G.queue.push({ type: 'event', ev: MS.d1 });
      // 랜덤 이벤트
      if (S.cool > 0) S.cool--;
      else if (!G.queue.length && S.week > S.trainWeeks + 1 && S.week < S.totalWeeks - 1) {
        const ev = chooseRandomEvent();
        if (ev) G.queue.push({ type: 'event', ev });
        else if (rand() < .4) {
          const g = rand() < .55 ? pick(GLOSSARY) : null;
          G.queue.push({ type: 'event', ev: { id: 'quiet' + S.week, repeat: true, auto: true, title: g ? '오늘의 군대 용어' : '한가한 한 주', text: g ? `"${g[0]}" — ${g[1]}.` : pick(QUIET_LINES), fx: { mind: .5 }, result: '' } });
        }
      }
      if (S.week >= S.totalWeeks) G.queue.push({ type: 'end' });
    }
    updateAll();
    processQueue();
  }

  async function processQueue() {
    if (G.busy) return;
    G.busy = true;
    let stop = false;
    try {
      while (G.queue.length && !stop) {
        const q = G.queue.shift();
        if (q.type === 'event') {
          const blocked = showEvent(q.ev);
          updateAll();
          if (blocked) { stop = true; break; }
          if (G.queue.length) await sleep(G.skipping ? 30 : 1300 / G.speed);
        } else if (q.type === 'draw') {
          await sleep(G.skipping ? 30 : 900);
          await runUnitDraw();
          S.phase = 'service';
          G.ovl = null; refresh(); applyScene(); updateAll(); renderCard();
          addLog(`${U().place} ${U().name}(으)로 배치. ${C().name}, ${BO().name}.`, true);
        } else if (q.type === 'end') {
          finishRun(); stop = true;
        }
      }
    } finally { G.busy = false; }
    if (!stop && S && G.running) { persist(); loop(); }
  }

  function persist() {
    if (!S || G.inGacha || G.pending) return;
    if (S.phase === 'train' || S.phase === 'service') Store.set(SAVE_KEY, S);
  }

  /* ============================================================
     UI 갱신
     ============================================================ */
  const STAT_COLORS = { body: '#3f8f5c', mind: '#d09a2a', rep: '#5b6f8a', bond: '#c0504d', skill: '#2a8c8c' };
  let lastStats = null;
  function buildStats() {
    $('stat-bars').innerHTML = STAT_KEYS.map(k => `
      <div class="bar" data-k="${k}"><span class="b-name">${STAT_NAME[k]}</span>
        <span class="b-track"><i style="background:${STAT_COLORS[k]}"></i></span><b class="b-val">0</b></div>`).join('');
    lastStats = null;
  }
  function updateStats(fx) {
    STAT_KEYS.forEach(k => {
      const el = document.querySelector(`.bar[data-k="${k}"]`); if (!el) return;
      const v = Math.round(S.stats[k]);
      el.querySelector('i').style.width = v + '%';
      el.querySelector('.b-val').textContent = v;
      if (fx && fx[k]) { el.classList.remove('up', 'down'); void el.offsetWidth; el.classList.add(fx[k] > 0 ? 'up' : 'down'); }
    });
    updateWallet();
  }
  function updateWallet() {
    $('w-money').textContent = Math.round(S.money) + '만원';
    $('w-leave').textContent = Math.floor(S.leave) + '일';
    $('w-ticket').textContent = '🎫 ' + S.tickets;
  }
  function renderTop() {
    refresh();
    const t = S.phase === 'intake' ? '병역판정검사' : S.phase === 'train' ? `훈련 ${Math.min(S.week + 1, S.trainWeeks)}주차` : rankLabel();
    $('top-rank').textContent = t;
    const dt = dateAt(S.week);
    $('top-date').textContent = `${dt.y}년 ${dt.m + 1}월` + (S.branch ? ` · ${B().name}` : '');
    if (S.branch) {
      $('dd-num').textContent = 'D-' + String(S.daysLeft).padStart(3, '0');
      $('prog').style.width = Math.min(100, S.week / S.totalWeeks * 100) + '%';
      [.111, .444, .778].forEach((f, i) => { $('prog-promo' + (i + 1)).style.left = (f * 100) + '%'; });
    } else { $('dd-num').textContent = 'D-???'; $('prog').style.width = '0%'; }
    const cap = [];
    if (S.unitId) cap.push(U().place, U().name);
    else if (S.branch) cap.push(B().trainName);
    else cap.push('병무청');
    cap.push(`${dt.y}.${String(dt.m + 1).padStart(2, '0')}`);
    $('caption').textContent = cap.join(' · ');
  }
  function renderCard() {
    $('id-serial').textContent = S.serial;
    $('id-name').textContent = S.name;
    $('id-unit').textContent = S.branch ? (S.unitId ? `${B().name} · ${U().name}` : `${B().name} (배치 전)`) : '미정';
    $('id-rank').textContent = S.branch ? (S.phase === 'train' ? '훈련병' : rankLabel()) : '—';
    const d0 = dateAt(0);
    $('id-enlist').textContent = `${d0.y}.${String(d0.m + 1).padStart(2, '0')}`;
    $('id-fit').textContent = S.fit ? `${S.fit.name} · ${S.fit.label}` : '검사 전';
    $('id-major').textContent = S.majorName;
    $('id-gf').textContent = S.gf ? `있음 (${Math.round(S.gfLove)}%)` : (S.gfStart ? '이별' : '없음');
    const tags = [];
    if (S.cultureId) tags.push(`<span class="g-chip" style="--c:${gradeOf(C().g).c}">${C().name}</span>`);
    if (S.bossId) tags.push(`<span class="g-chip" style="--c:${gradeOf(BO().g).c}">${BO().name}</span>`);
    $('id-tags').innerHTML = tags.join('');
    Art.portrait($('id-photo'), S.branch ? B().uni : 'civil', S.shirt);
  }
  function renderLog() {
    const ul = $('log');
    const items = S.log.slice(0, 60);
    ul.innerHTML = items.map(l => `<li class="${l.hl ? 'hl' : ''}"><span class="lw">${l.r ? l.r + ' · ' : ''}${l.w}주</span>${l.t}</li>`).join('');
    $('log-count').textContent = S.log.length ? `${S.log.length}건` : '';
  }
  function updateAll() { refresh(); renderTop(); updateStats(); renderCard(); applyScene(); }

  /* ============================================================
     진행 시작
     ============================================================ */
  async function startRun(name) {
    clearTimeout(G.timer); G.queue = []; G.pending = null; G.ovl = null; G.paused = false; G.skipping = false; G.running = true;
    S = newRun(name); applyMajorMods();
    Store.del(SAVE_KEY);
    enterGameUI();
    renderFocus({ tag: '입대 전', title: '병무청', text: `${S.name}, ${S.majorBlurb}. 오늘 병역판정검사를 받으러 병무청에 왔다. 이제 모든 건 운에 달렸다.`, kind: 'auto' });
    const fit = await runIntake();
    if (fit.kind === 'exempt' || fit.kind === 'exempt5') { endExempt(fit); return; }
    S.stats.body = clamp(S.stats.body + (fit.body || 0));
    await runBranch();
    beginService();
  }
  function beginService() {
    S.phase = 'train'; S.week = 0; S.month = 0;
    S.trainWeeks = B().train; S.totalWeeks = Math.round(daysTotal() / 7);
    // 훈련 일정
    const evs = TRAIN_EVENTS.filter(e => (e.br || ['army', 'navy', 'af', 'marine', 'katusa', 'sangun', 'civil']).includes(S.branch) && !(S.branch === 'civil' && !(e.br && e.br.includes('civil')) && e.id !== 't_enlist')).sort((a, b) => a.order - b.order);
    S.sched = {};
    evs.forEach((e, i) => {
      const w = Math.min(S.trainWeeks - 1, Math.round(i * (S.trainWeeks - 1) / Math.max(1, evs.length - 1)));
      (S.sched[w] = S.sched[w] || []).push(e.id);
    });
    refresh(); updateAll();
    addLog(`${B().trainName} 입소. 이제부터 ${B().months}개월의 복무가 시작된다.`, true);
    // 0주차 이벤트(입영식)부터
    (S.sched[0] || []).forEach(id => { const ev = TRAIN_EVENTS.find(e => e.id === id); G.queue.push({ type: 'event', ev: Object.assign({ train: true }, ev, { auto: ev.auto || !ev.choices }) }); });
    processQueue();
  }
  function resumeRun() {
    const sv = Store.get(SAVE_KEY, null);
    if (!sv) return;
    S = sv; G.queue = []; G.pending = null; G.ovl = null; G.paused = false; G.skipping = false; G.running = true;
    enterGameUI(); updateAll(); renderLog();
    renderFocus({ tag: '이어하기', title: '복귀', text: `${S.name}의 군 생활을 이어서 진행합니다.`, kind: 'auto' });
    loop();
  }
  function enterGameUI() {
    showScreen('game');
    buildStats(); renderLog(); updateAll();
    $('c-pause').textContent = '⏸ 멈춤';
    document.querySelectorAll('.sp').forEach(b => b.classList.toggle('active', +b.dataset.sp === G.speed));
    $('c-auto').classList.toggle('active', G.auto);
    $('c-sound').classList.toggle('active', SFX.on);
  }

  /* ============================================================
     엔딩
     ============================================================ */
  function dexGet() { return Store.get(DEX_KEY, { runs: 0, units: {}, branches: {}, cultures: {}, bosses: {}, titles: {}, endings: {}, best: 0 }); }
  function dexSave(d) { Store.set(DEX_KEY, d); }
  const GRADE_ORDER = ['D', 'C', 'B', 'A', 'S'];

  function endExempt(fit) {
    G.running = false; Store.del(SAVE_KEY);
    const d = dexGet(); d.runs++; d.endings[fit.kind] = true; dexSave(d);
    const isEx = fit.kind === 'exempt';
    $('end-wrap').innerHTML = `
      <div class="cert exempt">
        <div class="cert-ur">UR 엔딩</div>
        <div class="cert-head">${isEx ? '병 역 면 제' : '전 시 근 로 역'}</div>
        <div class="cert-name">${S.name}</div>
        <p class="cert-text">${isEx ? '신체검사 결과 6급 판정. 입영 통지서는 영영 오지 않습니다.' : '신체검사 결과 5급 판정. 평시에는 병역 의무 이행 대상이 아닙니다.'}<br>이 결과가 나올 확률은 <b>${fmtPct(S.probs.fit)}</b>.</p>
        <p class="cert-sub">…하지만 게임은 아직 시작도 못 했습니다. 다시 뽑으러 갈까요?</p>
      </div>
      <div class="end-actions"><button class="btn primary big" id="e-again">다시 뽑기</button><button class="btn big" id="e-dex">뽑기 도감</button><button class="btn big" id="e-title">처음으로</button></div>`;
    bindEndButtons(); showScreen('end');
  }

  function calcScore() {
    const st = S.stats;
    const avg = (st.body + st.mind + st.rep + st.bond + st.skill) / 5;
    const score = avg + Math.min(10, S.money / 70) + (S.gf ? 2 : 0);
    return { score, grade: score >= 78 ? 'S' : score >= 69 ? 'A' : score >= 60 ? 'B' : score >= 51 ? 'C' : 'D' };
  }
  function finishRun() {
    G.running = false; clearTimeout(G.timer); G.pending = null;
    Store.del(SAVE_KEY);
    S.week = S.totalWeeks; refresh();
    const { score, grade } = calcScore();
    const title = TITLES.find(t => t.test(S));
    const pAll = Object.values(S.probs).reduce((a, p) => a * p, 1);
    if (window.__onFinish) window.__onFinish(S, { score, grade, title: title.id });
    const d = dexGet();
    d.runs++; d.units[S.unitId] = (d.units[S.unitId] || 0) + 1; d.branches[S.branch] = true; d.cultures[S.cultureId] = true; d.bosses[S.bossId] = true; d.titles[title.id] = true;
    d.best = Math.max(d.best, GRADE_ORDER.indexOf(grade) + 1); dexSave(d);

    const u = U(), b = B(), c = C(), bo = BO(), st = S.stats;
    const dt = dateAt(S.totalWeeks);
    const hls = S.highlights.slice().sort(() => rand() - .5).slice(0, 3);
    const lines = [];
    lines.push(`${u.place}에서 ${b.months}개월, ${S.fit.name} 판정으로 시작한 복무를 마쳤습니다.`);
    lines.push(S.gfStart ? (S.gf ? '입대할 때 곁에 있던 곰신은 끝까지 기다려 주었습니다.' : '입대할 때 곁에 있던 곰신은 어느새 고무신을 거꾸로 신었습니다.') : '입대 전엔 연인이 없었지만, 전역 후 새 인연을 만날 시간은 충분합니다.');
    lines.push(`통장에는 약 ${Math.round(S.money)}만원이 쌓였습니다.`);
    const plan = { study: '전역 후에는 복학해서 학업에 집중할 계획입니다.', job: '전역 후에는 곧바로 취업 준비에 뛰어들 계획입니다.', travel: '전역 후에는 먼저 여행으로 머리를 식힐 계획입니다.' }[S.flags.plan];
    if (plan) lines.push(plan);
    if (S.flags.jinnu) lines.push('진급누락을 한 번 겪었지만, 끝내 계급장을 달고 전역했습니다.');
    if (b.id !== 'civil') lines.push('전역 뒤에는 약 8년간 예비군에 편성되고, 이후 만 40세까지 민방위 의무가 이어집니다.');
    const quote = pick([
      '"군대 얘기는 안 한다더니, 사흘 만에 군대 얘기를 시작했습니다."',
      '"다시 가라면 가겠냐"는 질문의 정답은 아직 아무도 모릅니다.',
      '전역 후 첫 밥은 어머니의 집밥, 두 번째는 치킨이었습니다.',
      '꿈에서 아직도 불침번을 서는 건 비밀입니다.',
      '"자기 군생활이 가장 힘든 법." 예비역들의 오래된 정답입니다.',
      '땡보냐 헬이냐는 보직보다 부대가 정합니다. Case by case.',
      '"국방부 시계는 거꾸로 매달아 놔도 돌아간다." 정말로 돌아갔습니다.',
    ]);
    const endWord = b.id === 'civil' ? '완료' : '전역';

    const row = (k, label, name, p) => `<tr><td>${label}</td><td>${name}</td><td class="r">${fmtPct(p)}</td></tr>`;
    $('end-wrap').innerHTML = `
      <div class="cert">
        <div class="cert-head">${b.id === 'civil' ? '소 집 해 제 증' : '전 역 증'}</div>
        <div class="cert-name">${S.name}</div>
        <div class="cert-line">${b.name} · ${u.name} · ${b.id === 'civil' ? '복무 완료' : '병장'} · 군번 ${S.serial}</div>
        <p class="cert-text">${b.id === 'civil'
          ? `사회복무요원 ${S.name}은(는) ${dt.y}년 ${dt.m + 1}월부로 ${b.months}개월의 복무를 마쳤음을 신고합니다.`
          : `병장 ${S.name}은(는) ${dt.y}년 ${dt.m + 1}월부로 전역을 명받았습니다.<br>이에 신고합니다. 충성!`}</p>
        <div class="cert-stamp">${endWord}</div>
      </div>
      <div class="end-grid">
        <div class="card grade-box"><small>복무 평점</small><b class="gr-${grade}">${grade}</b><span>${Math.round(score)}점</span></div>
        <div class="card title-box"><small>획득 칭호</small><h2>${title.name}</h2><p>${title.line}</p></div>
      </div>
      <div class="card end-stats">
        <h3>전역 시점 상태</h3>
        ${STAT_KEYS.map(k => `<div class="bar"><span class="b-name">${STAT_NAME[k]}</span><span class="b-track"><i style="width:${Math.round(st[k])}%;background:${STAT_COLORS[k]}"></i></span><b class="b-val">${Math.round(st[k])}</b></div>`).join('')}
      </div>
      <div class="card draw-box">
        <h3>내 뽑기 기록</h3>
        <table class="draws">
          ${row('fit', '신체등급', `${S.fit.name} · ${S.fit.label}`, S.probs.fit)}
          ${b.id === 'civil' ? '' : row('br', '군종', b.name, S.probs.branch)}
          ${row('u', b.id === 'civil' ? '근무지' : '보직', `${u.name} ${stars(u.g)}`, S.probs.unit)}
          ${row('c', '분위기', `${c.name} ${stars(c.g)}`, S.probs.culture)}
          ${row('b', '간부 운', `${bo.name} ${stars(bo.g)}`, S.probs.boss)}
        </table>
        <p class="onein">당신과 똑같은 군 생활이 나올 확률 <b>1 / ${Math.round(1 / pAll).toLocaleString('ko-KR')}</b></p>
      </div>
      ${hls.length ? `<div class="card"><h3>기억에 남는 순간</h3><ul class="plain">${hls.map(h => `<li>${h}</li>`).join('')}</ul></div>` : ''}
      <div class="card"><h3>후일담</h3><ul class="plain">${lines.map(l => `<li>${l}</li>`).join('')}</ul><p class="quote">${quote}</p></div>
      <div class="end-actions">
        <button class="btn primary big" id="e-again">다시 뽑기</button>
        <button class="btn big" id="e-copy">결과 복사</button>
        <button class="btn big" id="e-dex">뽑기 도감</button>
        <button class="btn big" id="e-title">처음으로</button>
      </div>`;
    const shareText = `[군대 뽑기] ${S.name} — ${title.name}\n${S.fit.name} → ${b.name} → ${u.name}\n분위기 ${c.name} / 간부 ${bo.name}\n복무 평점 ${grade} · 같은 군 생활이 나올 확률 1/${Math.round(1 / pAll).toLocaleString('ko-KR')}`;
    bindEndButtons(shareText); showScreen('end');
  }
  function bindEndButtons(shareText) {
    const again = $('e-again'), copy = $('e-copy'), dex = $('e-dex'), title = $('e-title');
    if (again) again.onclick = () => startRun(S.name && !$('inp-name').value ? S.name : $('inp-name').value.trim());
    if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(shareText); toast('결과를 복사했어요'); } catch (e) { toast('복사에 실패했어요'); } };
    if (dex) dex.onclick = openDex;
    if (title) title.onclick = goTitle;
  }

  /* ============================================================
     도감
     ============================================================ */
  function openDex() {
    const d = dexGet();
    const groups = ['army', 'navy', 'af', 'marine', 'katusa', 'sangun', 'civil'].map(bid => {
      const list = UNITS.filter(u => u.br === bid);
      const found = list.filter(u => d.units[u.id]).length;
      return `<h4>${BRANCH[bid].name} <small>${found}/${list.length}</small></h4><div class="dex-grid">${list.map(u => {
        const ok = d.units[u.id];
        const p = probOf(list, u);
        return `<div class="dex-item ${ok ? 'ok rar-' + rarityOf(p).cls : ''}"><b>${ok ? u.name : '???'}</b><small>${ok ? `${gradeOf(u.g).n} · ${fmtPct(p)}` : fmtPct(p)}</small></div>`;
      }).join('')}</div>`;
    }).join('');
    const titles = `<h4>칭호 <small>${Object.keys(d.titles).length}/${TITLES.length}</small></h4><div class="dex-grid">${TITLES.map(t => `<div class="dex-item ${d.titles[t.id] ? 'ok' : ''}"><b>${d.titles[t.id] ? t.name : '???'}</b></div>`).join('')}</div>`;
    const ends = `<h4>특별 엔딩</h4><div class="dex-grid"><div class="dex-item ${d.endings.exempt ? 'ok rar-ur' : ''}"><b>${d.endings.exempt ? '병역 면제' : '???'}</b></div><div class="dex-item ${d.endings.exempt5 ? 'ok rar-ssr' : ''}"><b>${d.endings.exempt5 ? '전시근로역' : '???'}</b></div></div>`;
    $('dex-body').innerHTML = `<p class="dex-sum">플레이 ${d.runs}회 · 최고 평점 ${d.best ? GRADE_ORDER[d.best - 1] : '—'}</p>${groups}${titles}${ends}`;
    $('dex').classList.remove('hidden');
  }

  /* ============================================================
     컨트롤
     ============================================================ */
  function goTitle() {
    clearTimeout(G.timer); clearTimeout(G.autoTimer);
    G.running = false; G.pending = null; G.skipping = false; G.queue = []; G.inGacha = false;
    $('gacha').classList.add('hidden');
    showScreen('title'); refreshTitle();
  }
  function refreshTitle() { $('btn-resume').classList.toggle('hidden', !Store.get(SAVE_KEY, null)); }
  function setPaused(p) {
    G.paused = p; $('c-pause').textContent = p ? '▶ 재개' : '⏸ 멈춤';
    if (!p) loop(); else clearTimeout(G.timer);
  }
  function bindUI() {
    $('btn-start').onclick = () => { SFX.init(); startRun($('inp-name').value.trim()); };
    $('btn-resume').onclick = () => { SFX.init(); resumeRun(); };
    $('btn-dex').onclick = openDex;
    $('dex-close').onclick = () => $('dex').classList.add('hidden');
    $('dex').onclick = e => { if (e.target.id === 'dex') $('dex').classList.add('hidden'); };
    $('inp-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-start').click(); });
    $('c-pause').onclick = () => { G.skipping = false; setPaused(!G.paused); };
    document.querySelectorAll('.sp').forEach(b => b.onclick = () => {
      G.speed = +b.dataset.sp; G.skipping = false; if (G.paused) setPaused(false);
      document.querySelectorAll('.sp').forEach(x => x.classList.toggle('active', x === b)); loop();
    });
    $('c-skip').onclick = () => { G.skipping = true; if (G.paused) setPaused(false); loop(); };
    $('c-auto').onclick = () => {
      G.auto = !G.auto; $('c-auto').classList.toggle('active', G.auto); Store.set(PREF_KEY, { auto: G.auto, sound: SFX.on });
      if (G.auto) {
        if (G.pending && G.pending.phase === 'result') scheduleAuto(afterEvent, 800);
        else if (G.pending && G.pending.phase === 'choose') { const btns = document.querySelectorAll('#f-choices .choice'); if (btns.length) scheduleAuto(() => pick([...btns]).click(), 800); }
      }
    };
    $('c-sound').onclick = () => { SFX.on = !SFX.on; $('c-sound').classList.toggle('active', SFX.on); Store.set(PREF_KEY, { auto: G.auto, sound: SFX.on }); SFX.init(); };
    $('c-exit').onclick = () => { if (confirm('타이틀로 나갈까요? 진행 상황은 자동 저장됩니다.')) { persist(); goTitle(); } };
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ' && G.running && !G.inGacha && !G.pending) { e.preventDefault(); $('c-pause').click(); }
      if ((e.key === 'Enter') && G.pending && G.pending.phase === 'result') { e.preventDefault(); afterEvent(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (G.running && !G.paused) { G.hiddenPause = true; setPaused(true); } }
      else if (G.hiddenPause) { G.hiddenPause = false; setPaused(false); }
    });
  }

  /* ---------- 초기화 ---------- */
  function init() {
    const pref = Store.get(PREF_KEY, { auto: false, sound: true });
    G.auto = !!pref.auto; SFX.on = pref.sound !== false;
    titleArt = Art.create($('title-canvas'), { scene: 'bureau', season: 'spring', uni: 'civil' });
    sceneArt = Art.create($('scene'), { scene: 'bureau', season: 'spring', uni: 'civil' });
    sceneArt.stop();
    bindUI(); refreshTitle(); showScreen('title');
    window.__ag = { get S() { return S; }, G, tick, MS, showEvent, choose, afterEvent }; // 개발·테스트용 훅
  }
  init();
})();
