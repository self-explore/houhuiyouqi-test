/* ============================================================
   《后会友期》· 你是里面的谁    逻辑层
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let idx = 0;
let answers = new Array(QS.length).fill(null);
let cur = null;
let demoKey = null;

/* ---------------- 分页 ---------------- */
function showPage(name) {
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'pg-' + name));
  window.scrollTo(0, 0);
  const sc = $('#result-scroll');
  if (sc) sc.scrollTop = 0;
}

/* ---------------- 选项乱序 ---------------- */
function shuffled(arr, seed) {
  const a = arr.slice();
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- 渲染题目 ---------------- */
function renderQ() {
  const q = QS[idx];
  const keys = questionKeys(idx);
  const opts = shuffled(keys.map(k => ({ k, t: q.o[k] })), idx + 3);

  $('#q-idx').textContent = String(idx + 1).padStart(2, '0');
  $('#q-total').textContent = '/ ' + QS.length;
  $('#q-bar').style.width = ((idx) / QS.length * 100) + '%';
  $('#q-text').textContent = q.q;
  $('#q-opts').innerHTML = opts.map((o, i) => {
    const on = answers[idx] === o.k ? ' on' : '';
    return `<button class="opt${on}" data-k="${o.k}">
      <span class="ok">${'ABCD'[i]}</span>
      <span class="ot">${o.t}</span>
    </button>`;
  }).join('');

  $$('#q-opts .opt').forEach(b => {
    b.addEventListener('click', () => pick(b.dataset.k));
  });
  $('#btn-back').style.visibility = idx === 0 ? 'hidden' : 'visible';
}

function pick(k) {
  answers[idx] = k;
  $$('#q-opts .opt').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  setTimeout(() => {
    if (idx < QS.length - 1) { idx++; renderQ(); }
    else finish();
  }, 180);
}

function finish() {
  showPage('loading');
  const steps = ['读取你的作答轨迹', '测算七维友情光谱', '比对节目里的八种人', '生成你的那一幕'];
  steps.forEach((t, i) => {
    setTimeout(() => {
      const el = $('#ld-step');
      if (el) el.textContent = t;
      $$('.ld-dot').forEach((d, j) => d.classList.toggle('on', j <= i));
    }, i * 620);
  });
  setTimeout(() => { cur = compute(); renderResult(); showPage('result'); }, steps.length * 620 + 320);
}

/* ---------------- 计算 ---------------- */
function compute() {
  const cnt = {};
  DIMS.forEach(d => { cnt[d.k] = 0; });
  answers.forEach(k => { if (k && cnt[k] !== undefined) cnt[k]++; });

  const ranked = DIMS.map(d => ({ d, raw: cnt[d.k] }))
    .sort((a, b) => b.raw - a.raw || a.d.i - b.d.i);

  const main = ranked[0].d;
  const sub = ranked[1].d;
  return buildResult(main, sub, cnt);
}

function buildResult(main, sub, cnt) {
  const SLOTS = 16, EXP = 4, SD = Math.sqrt(SLOTS * 0.25 * 0.75);
  const z = ((cnt ? cnt[main.k] : SLOTS) - EXP) / SD;
  let fit = Math.round(62 + z * 7.5);
  fit = Math.max(45, Math.min(99, fit));

  const dims = FRIEND_DIMS.map((fd, i) => {
    const v = main.d7[i] * 0.78 + sub.d7[i] * 0.22;
    const val = Math.round(Math.max(12, Math.min(99, v)));
    const tier = val >= 72 ? 'hi' : val >= 45 ? 'mid' : 'lo';
    return { ...fd, val, tier, text: DIM_ANALYSIS[fd.k][tier] };
  });

  const tier = FIT_TIERS.find(t => fit >= t.min) || FIT_TIERS[FIT_TIERS.length - 1];
  const top3 = [...dims].sort((a, b) => b.val - a.val).slice(0, 3);

  return { main, sub, fit, tier, dims, top3, counts: cnt };
}

/* ---------------- 雷达图（七轴） ---------------- */
function radarSVG(dims) {
  const cx = 200, cy = 172, R = 100, N = dims.length;
  const ang = i => (-90 + i * 360 / N) * Math.PI / 180;
  let s = `<svg viewBox="0 0 400 350" class="radar" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#e9a35c" stop-opacity=".30"/>
    <stop offset="100%" stop-color="#2b3a5c" stop-opacity=".18"/></linearGradient></defs>`;

  [0.25, 0.5, 0.75, 1].forEach(rr => {
    const p = [];
    for (let i = 0; i < N; i++) {
      const a = ang(i);
      p.push((cx + R * rr * Math.cos(a)).toFixed(1) + ',' + (cy + R * rr * Math.sin(a)).toFixed(1));
    }
    s += `<polygon points="${p.join(' ')}" fill="none" stroke="#e3ded4" stroke-width="1"/>`;
  });
  for (let i = 0; i < N; i++) {
    const a = ang(i);
    s += `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(a)).toFixed(1)}" y2="${(cy + R * Math.sin(a)).toFixed(1)}" stroke="#e3ded4" stroke-width="1"/>`;
  }

  const pts = [];
  dims.forEach((d, i) => {
    const rr = Math.max(0.16, Math.min(1, d.val / 100));
    const a = ang(i);
    pts.push((cx + R * rr * Math.cos(a)).toFixed(1) + ',' + (cy + R * rr * Math.sin(a)).toFixed(1));
  });
  s += `<polygon points="${pts.join(' ')}" fill="url(#rg)" stroke="#d4863b" stroke-width="1.8" stroke-linejoin="round"/>`;
  dims.forEach((d, i) => {
    const rr = Math.max(0.16, Math.min(1, d.val / 100));
    const a = ang(i);
    s += `<circle cx="${(cx + R * rr * Math.cos(a)).toFixed(1)}" cy="${(cy + R * rr * Math.sin(a)).toFixed(1)}" r="3.4" fill="#d4863b"/>`;
  });
  dims.forEach((d, i) => {
    const a = ang(i);
    const lx = cx + (R + 30) * Math.cos(a), ly = cy + (R + 26) * Math.sin(a);
    s += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="13" font-weight="600" fill="#4a5468">${d.label}</text>`;
  });
  s += '</svg>';
  return s;
}

/* ---------------- 结果页 ---------------- */
function renderResult() {
  const r = cur;
  const m = r.main, sb = r.sub;
  const clash = DIMS.find(d => d.k === m.clash.k) || DIMS[0];
  const fitD = DIMS.find(d => d.k === m.fit.k) || DIMS[1];

  const html = `
  <div class="hero fade-enter">
    <div class="hero-eyebrow">你 是 后 会 友 期 里 的</div>
    <div class="hero-name">${m.n}</div>
    <div class="hero-nick">${m.nick}</div>
    <div class="hero-ring">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#e6e1d8" stroke-width="7"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="${m.color}" stroke-width="7"
          stroke-linecap="round" stroke-dasharray="${(r.fit / 100 * 326.7).toFixed(1)} 326.7"
          transform="rotate(-90 60 60)"/>
      </svg>
      <div class="hero-ring-txt"><b>${r.fit}</b><span>%</span><i>契合度</i></div>
    </div>
    <div class="hero-tag">${r.tier.t}</div>
    <div class="hero-tags">${m.tags.map(t => `<span class="tg">${t}</span>`).join('')}</div>
    <div class="hero-line">${m.line}</div>
    <div class="hero-role">在友情里，你是那个「${m.role.replace('友情里的', '')}」</div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你在友情里的位置</div>
    <div class="card"><p class="para">${m.core}</p></div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你的七维友情光谱</div>
    <div class="card">
      ${radarSVG(r.dims)}
      <div class="top3">
        ${r.top3.map((d, i) => `
          <div class="t3">
            <div class="t3-h"><span class="t3n">${['最强', '次强', '第三'][i]} · ${d.label}</span><span class="t3v">${d.val}</span></div>
            <div class="t3-bar"><i style="width:${d.val}%"></i></div>
          </div>`).join('')}
      </div>
      <p class="note">七维刻度描述的是你在关系里的倾向，不是能力高低。任何一格偏高或偏低，都有它自己的代价和礼物。</p>
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>逐维读你</div>
    <div class="card">
      ${r.dims.map(d => `
        <div class="dim-row">
          <div class="dim-head"><span class="dim-name">${d.label}</span><span class="dim-val">${d.val}</span></div>
          <div class="dim-bar"><i style="width:${d.val}%"></i></div>
          <p class="dim-txt">${d.text}</p>
        </div>`).join('')}
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>节目里，你对应这一幕</div>
    <div class="card scene-card">
      <div class="scene-mark">“</div>
      <p class="para">${m.scene}</p>
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你的亮面与暗面</div>
    <div class="card">
      <div class="ls-label good">你的亮面</div>
      <p class="para">${m.light}</p>
      <div class="ls-label warn">你的暗面</div>
      <p class="para">${m.shadow}</p>
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你爱一个人的方式</div>
    <div class="card"><p class="para">${m.loveStyle}</p></div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你和谁最容易走散</div>
    <div class="card">
      <div class="who-row">
        <div class="who-ava" style="background:${clash.color}">${clash.n.slice(0, 1)}</div>
        <div class="who-info"><div class="who-name">${clash.n} · ${clash.nick}</div><div class="who-sub">你们是同一件事的两种解法</div></div>
      </div>
      <p class="para">${m.clash.why}</p>
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你和谁能处一辈子</div>
    <div class="card">
      <div class="who-row">
        <div class="who-ava" style="background:${fitD.color}">${fitD.n.slice(0, 1)}</div>
        <div class="who-info"><div class="who-name">${fitD.n} · ${fitD.nick}</div><div class="who-sub">你的天然盟友</div></div>
      </div>
      <p class="para">${m.fit.why}</p>
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>给你的三条建议</div>
    <div class="card">
      ${m.advice.map((t, i) => `<div class="adv"><b>${i + 1}</b><span>${t}</span></div>`).join('')}
    </div>
  </div>

  <div class="sec fade-enter">
    <div class="sec-h"><i></i>你的副人格</div>
    <div class="card">
      <div class="sub-row">
        <span class="sub-chip" style="border-color:${sb.color};color:${sb.color}">${sb.n} · ${sb.nick}</span>
      </div>
      <p class="para">你身上还压着一层「${sb.nick}」的底色。它不会主导你的选择，但会出现在某些瞬间——比如你真的累了，或者对方恰好是你很在意的人。</p>
    </div>
  </div>

  <div class="share-box fade-enter">
    <div class="sb-title">分享这句话</div>
    <div class="sb-text">《后会友期》里，我是「${m.n}」——${m.nick}。<br>契合度 ${r.fit}%，${m.line}</div>
    <div class="sb-tip">截图保存，发给那个你还没说完话的人</div>
    <div class="sb-btns">
      <button class="btn-main" id="btn-poster">保存结果图</button>
      <button class="btn-ghost" id="btn-again">重新测一次</button>
    </div>
  </div>

  <div class="disc fade-enter">
    本测试为娱乐向内容，人物印象仅基于综艺《后会友期》公开播出的片段，不代表对任何真实人物的评价。<br>
    结果不构成任何专业结论，也不用于任何形式的评判。<br>
    全程在本地完成，不收集、不上传你的任何信息。
  </div>
  `;

  $('#result-scroll').innerHTML = html;

  // 交错动画
  const blocks = $$('#result-scroll .fade-enter');
  blocks.forEach((b, i) => { b.style.animationDelay = (0.06 + i * 0.045).toFixed(2) + 's'; });

  $('#btn-again').addEventListener('click', reset);
  $('#btn-poster').addEventListener('click', makePoster);
}

/* ---------------- 海报 ---------------- */
function makePoster() {
  const m = cur.main, r = cur;
  const W = 1080, H = 1440;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1b2233');
  g.addColorStop(0.55, '#25314a');
  g.addColorStop(1, '#3a2d33');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // 光晕
  const rg = x.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, 620);
  rg.addColorStop(0, 'rgba(233,163,92,.28)');
  rg.addColorStop(1, 'rgba(233,163,92,0)');
  x.fillStyle = rg; x.fillRect(0, 0, W, H);

  x.fillStyle = 'rgba(255,255,255,.18)';
  x.font = '400 26px "PingFang SC","Microsoft YaHei",sans-serif';
  x.textAlign = 'center';
  x.fillText('你 是 后 会 友 期 里 的', W / 2, 210);

  x.fillStyle = '#f4efe6';
  x.font = '700 118px "Songti SC","STSong",serif';
  x.fillText(m.n, W / 2, 360);

  x.fillStyle = '#e9a35c';
  x.font = '600 38px "PingFang SC","Microsoft YaHei",sans-serif';
  x.fillText(m.nick, W / 2, 428);

  // 契合度
  x.strokeStyle = 'rgba(255,255,255,.16)';
  x.lineWidth = 14;
  x.beginPath(); x.arc(W / 2, 610, 108, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = '#e9a35c';
  x.beginPath(); x.arc(W / 2, 610, 108, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r.fit / 100); x.stroke();
  x.fillStyle = '#f4efe6';
  x.font = '700 76px "Helvetica Neue",Arial,sans-serif';
  x.fillText(r.fit + '%', W / 2, 636);
  x.fillStyle = 'rgba(255,255,255,.6)';
  x.font = '400 26px "PingFang SC",sans-serif';
  x.fillText('契合度 · ' + r.tier.t, W / 2, 680);

  // 台词
  x.fillStyle = 'rgba(244,239,230,.92)';
  x.font = '400 40px "Songti SC","STSong",serif';
  wrapText(x, m.line, W / 2, 830, W - 200, 60);

  // 标签
  let tx = W / 2 - (m.tags.length * 150) / 2;
  m.tags.forEach(t => {
    x.strokeStyle = 'rgba(233,163,92,.6)';
    x.lineWidth = 2;
    roundRect(x, tx, 940, 140, 56, 28);
    x.stroke();
    x.fillStyle = 'rgba(244,239,230,.85)';
    x.font = '400 26px "PingFang SC",sans-serif';
    x.fillText(t, tx + 70, 977);
    tx += 150;
  });

  x.fillStyle = 'rgba(255,255,255,.42)';
  x.font = '400 26px "PingFang SC",sans-serif';
  x.fillText('《后会友期》人物测试 · 28 题', W / 2, 1180);
  x.font = '400 22px "PingFang SC",sans-serif';
  x.fillText('娱乐向内容，不代表对真实人物的评价', W / 2, 1230);
  x.fillStyle = 'rgba(233,163,92,.5)';
  x.fillRect(W / 2 - 40, 1300, 80, 2);

  const a = document.createElement('a');
  a.download = `后会友期-${m.n}.png`;
  a.href = c.toDataURL('image/png');
  a.click();
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const chars = text.split('');
  let line = '', lines = [];
  chars.forEach(ch => {
    if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
    else line += ch;
  });
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- 重置 ---------------- */
function reset() {
  idx = 0;
  answers = new Array(QS.length).fill(null);
  cur = null;
  showPage('cover');
}

/* ---------------- demo：直接出指定人物的结果 ---------------- */
function demoRender(key) {
  const main = key === 'wen' ? WEN : (DIMS.find(d => d.k === key) || DIMS[0]);
  const sub = key === 'wen' ? DIMS.find(d => d.k === 'wang') : DIMS.find(d => d.k !== main.k);
  const cnt = {};
  DIMS.forEach(d => { cnt[d.k] = 0; });
  cnt[main.k] = 16;
  cur = buildResult(main, sub, cnt);
  cur.fit = 96;
  cur.tier = FIT_TIERS[0];
  cur.dims = FRIEND_DIMS.map((fd, i) => {
    const v = main.d7[i] * 0.82 + sub.d7[i] * 0.18;
    const val = Math.round(Math.max(12, Math.min(99, v)));
    const tier = val >= 72 ? 'hi' : val >= 45 ? 'mid' : 'lo';
    return { ...fd, val, tier, text: DIM_ANALYSIS[fd.k][tier] };
  });
  cur.top3 = [...cur.dims].sort((a, b) => b.val - a.val).slice(0, 3);
  renderResult();
  showPage('result');
}

/* ---------------- 启动 ---------------- */
function boot() {
  const q = new URLSearchParams(location.search);
  const demo = q.get('demo');
  if (demo === 'wen' || demo === '文吉儿') { demoRender('wen'); return; }

  questionsInit();
  renderQ();
}

function questionsInit() {
  $('#q-total-all').textContent = QS.length;
  $('#btn-start').addEventListener('click', () => { showPage('quiz'); renderQ(); });
  $('#btn-back').addEventListener('click', () => {
    if (idx > 0) { idx--; renderQ(); }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
