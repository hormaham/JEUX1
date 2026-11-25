/* واجهة التطبيق: ملفات التلاميذ، الصفحات، التدريب والمكافآت. كل البيانات تحفظ على الجهاز. */
(() => {
"use strict";
const KEY = "hisab-app-v2";
const ROUND = 10, CHALLENGE = 60;
const COIN = "أوقية ذهبية";
const RANKS = [[0, "مبتدئ"], [100, "متعلّم"], [350, "ماهر"], [900, "متقن"], [2000, "بطل"], [4500, "عبقري الحساب"]];
const MEDALS = ["", "برونزية", "فضية", "ذهبية"];
const GIFTS = [["balloon", "🎈", "بالون", 30], ["pen", "✏️", "قلم المتفوق", 60], ["book", "📚", "مكتبة صغيرة", 120], ["ball", "⚽", "كرة", 200],
  ["kite", "🪁", "طائرة ورقية", 300], ["bike", "🚲", "دراجة", 500], ["camel", "🐪", "جمل أصيل", 800], ["scope", "🔭", "منظار فلكي", 1200], ["rocket", "🚀", "رحلة إلى الفضاء", 2500]];
const BADGES = [
  ["first", "الانطلاقة", "أكمل أول جولة", p => p.totals.rounds >= 1],
  ["streak10", "عشرة متتالية", "10 إجابات صحيحة دون خطأ", p => p.totals.bestStreak >= 10],
  ["streak30", "التركيز الحديدي", "30 إجابة صحيحة دون خطأ", p => p.totals.bestStreak >= 30],
  ["c100", "المثابر", "100 إجابة صحيحة", p => p.totals.right >= 100],
  ["c500", "الخبير", "500 إجابة صحيحة", p => p.totals.right >= 500],
  ["perfect", "الدقة التامة", "جولة من 10 أسئلة دون خطأ ولا تلميح", p => p.totals.perfect >= 1],
  ["fast", "البرق", "ميدالية ذهبية في 3 فنيات", p => Object.values(p.skills).filter(s => s.medal === 3).length >= 3],
  ["progress", "التقدم", "تحسّن زمنك في فنية دون أن تقل دقتك", p => p.totals.improved >= 1],
  ["days3", "المواظبة", "تدرّب في 3 أيام مختلفة", p => p.days.length >= 3],
  ...CATS.map(c => ["cat-" + c.id, "فارس " + c.title, "ميدالية في كل فنيات: " + c.title,
    p => SKILLS.filter(s => s.cat === c.id).every(s => p.skills[s.id] && p.skills[s.id].medal)])
];

/* ---------- التخزين ---------- */
let db = { profiles: {}, current: null }, storageOk = true;
try { const x = JSON.parse(localStorage.getItem(KEY)); if (x && x.profiles) db = x; } catch (e) { storageOk = false; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; } catch (e) { storageOk = false; } };
const blank = name => ({ name, digits: "w", coins: 0, xp: 0, skills: {}, badges: {}, gifts: [], sessions: [], ops: [], days: [],
  totals: { right: 0, total: 0, rounds: 0, perfect: 0, bestStreak: 0, streak: 0, improved: 0 } });
const me = () => db.profiles[db.current] || null;

/* ---------- أدوات العرض ---------- */
const main = document.getElementById("view"), nav = document.getElementById("nav"), who = document.getElementById("who");
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kids.flat(Infinity).filter(x => x != null && x !== false));
  return el;
}
const eastern = () => me() && me().digits === "e";
const tr = s => eastern() ? String(s).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]) : String(s);
const num = n => tr(String(n).replace(".", eastern() ? "٫" : ","));
function tok(t) {
  if (typeof t === "number") return num(t);
  if (typeof t === "object") return "p" in t ? num(t.p) + "²" : (t.rt != null ? "√" + num(t.rt) : "∛" + num(t.cb));
  if (eastern()) return t === "(" ? ")" : t === ")" ? "(" : t === "?" ? "؟" : t;
  return t;
}
// مع الأرقام المشرقية تُكتب العملية من اليمين إلى اليسار
const math = (tokens, cls) => h("span", { class: "eq " + (cls || ""), dir: eastern() ? "rtl" : "ltr" }, tokens.map(t => h("bdi", {}, tok(t))));
const questionTokens = q => q.q.includes("?") ? q.q : [...q.q, "=", "?"];
function questionView(q, small) {
  if (q.ask) return h("div", { class: "ask" }, h("strong", {}, tr(q.ask)), q.q.length ? math(q.q, small ? "" : "big") : null);
  if (q.column && !small) return h("div", { class: "column" }, q.column.map(x => h("bdi", {}, num(x))));
  return math(questionTokens(q), (small ? "" : "big") + (q.q.length > 5 ? " long" : ""));
}
const stepsView = (steps, n) => h("ol", { class: "steps" }, steps.slice(0, n || steps.length).map(s => h("li", {}, s.t ? h("span", {}, tr(s.t)) : null, s.m ? math(s.m) : null)));
const answerText = a => typeof a === "number" ? num(a) : a;
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };
const bar = (value, max) => h("div", { class: "bar", role: "img", "aria-label": Math.round(value / max * 100) + "%" }, h("i", { style: "width:" + Math.min(100, value / max * 100) + "%" }));
const rankOf = xp => { let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++; return i; };
const medalDot = m => h("span", { class: "medal m" + m, title: m ? "ميدالية " + MEDALS[m] : "لا ميدالية بعد" }, m ? MEDALS[m] : "—");
const stat = (value, label) => h("div", {}, h("b", {}, value), h("small", {}, label));
const levelName = l => ["", "سهل", "متوسط", "متقدم"][l];

/* ---------- الصفحات ---------- */
function pageStudents() {
  const input = h("input", { id: "name", maxlength: "24", autocomplete: "off", placeholder: "مثال: أحمد" }), err = h("p", { class: "error", role: "alert" });
  const list = Object.entries(db.profiles).map(([id, p]) => h("button", { type: "button", class: "student" + (id === db.current ? " on" : ""), onclick: () => { db.current = id; save(); go("#home"); } },
    h("b", {}, p.name), h("small", {}, RANKS[rankOf(p.xp)][1] + " · " + num(p.coins) + " " + COIN)));
  return [h("h1", {}, "من سيتدرب اليوم؟"),
    list.length ? h("div", { class: "grid" }, list) : h("p", { class: "muted" }, "أنشئ حسابك باسمك ليُحفظ سجل عملياتك وجوائزك."),
    h("form", { class: "panel", onsubmit: e => {
      e.preventDefault(); const name = input.value.trim().replace(/\s+/g, " ");
      if (!name) { err.textContent = "اكتب اسمك أولاً."; return; }
      if (Object.values(db.profiles).some(p => p.name === name)) { err.textContent = "هذا الاسم موجود. اضغط عليه أو اختر اسماً آخر."; return; }
      const id = "p" + Date.now().toString(36); db.profiles[id] = blank(name); db.current = id; save(); go("#home");
    } }, h("label", { for: "name" }, "تلميذ جديد: الاسم أو اللقب"), input, err, h("button", { class: "primary", type: "submit" }, "إنشاء الحساب")),
    h("p", { class: "muted small" }, "تُحفظ الحسابات على هذا الجهاز فقط، دون كلمة مرور.")];
}
function pageHome() {
  const p = me(), r = rankOf(p.xp), next = RANKS[r + 1];
  return [h("section", { class: "panel hero" },
      h("h1", {}, "مرحباً " + p.name),
      h("p", {}, "رتبتك: " + RANKS[r][1] + (next ? "، والتالية: " + next[1] : "")),
      next ? bar(p.xp - RANKS[r][0], next[0] - RANKS[r][0]) : null,
      h("div", { class: "stats" }, stat(num(p.coins), COIN), stat(num(Object.values(p.skills).filter(s => s.medal).length), "ميدالية"), stat(num(Object.keys(p.badges).length), "وسام"))),
    h("h2", {}, "اختر صفحة التدريب"),
    h("div", { class: "grid" }, CATS.map(c => {
      const list = SKILLS.filter(s => s.cat === c.id), done = list.filter(s => p.skills[s.id] && p.skills[s.id].medal).length;
      return h("a", { class: "tile", href: "#cat-" + c.id }, h("span", { class: "mark", dir: "ltr" }, tr(c.mark)), h("b", {}, tr(c.title)), h("small", {}, tr(c.desc)),
        h("small", {}, "ميداليات: " + num(done) + " من " + num(list.length)), bar(done, list.length));
    }))];
}
function pageCat(c) {
  const p = me();
  return [h("a", { href: "#home", class: "back" }, "→ كل الصفحات"), h("h1", {}, tr(c.title)), h("p", { class: "muted" }, tr(c.desc) + ". ابدأ بالأسهل."),
    h("div", { class: "list" }, SKILLS.filter(s => s.cat === c.id).sort((a, b) => a.level - b.level).map(s =>
      h("a", { class: "row-link", href: "#s-" + s.id }, h("span", {}, h("b", {}, tr(s.title)), h("small", {}, levelName(s.level))), medalDot((p.skills[s.id] || {}).medal || 0))))];
}
function pageSkill(s) {
  const p = me(), st = p.skills[s.id], box = h("div", { class: "panel" });
  const example = () => { const q = s.gen(); box.replaceChildren(h("h2", {}, "مثال محلول"), questionView(q, true), stepsView(q.steps),
    h("p", { class: "result" }, "الجواب: ", h("bdi", {}, answerText(q.a))), h("button", { type: "button", onclick: example }, "مثال آخر")); };
  example();
  return [h("a", { href: "#cat-" + s.cat, class: "back" }, "→ رجوع"), h("h1", {}, tr(s.title)), h("p", { class: "rule" }, tr(s.rule)), box,
    h("p", { class: "muted" }, "للميدالية الذهبية: دقة " + tr("90%") + " ومتوسط " + num(s.target) + " ثوانٍ للسؤال أو أقل، في 10 أسئلة على الأقل."),
    st ? h("div", { class: "stats panel" }, stat(num(Math.round(st.right / st.total * 100)) + (eastern() ? "٪" : "%"), "دقتك"), stat(st.bestAvg ? num(st.bestAvg) : "—", "أفضل متوسط (ثانية)"), stat(medalDot(st.medal || 0), "ميداليتك")) : null,
    h("div", { class: "actions" }, h("button", { type: "button", class: "primary", onclick: () => start(s, false) }, "تدريب من 10 أسئلة"),
      s.noTimed ? null : h("button", { type: "button", onclick: () => start(s, true) }, "تحدي 60 ثانية"))];
}

/* ---------- الجولة ---------- */
let game = null;
const timers = new Set();
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); if (game) clearInterval(game.tick); };

function start(skill, timed) {
  clearTimers();
  game = { skill, timed, pid: db.current, n: 0, right: 0, secs: 0, coins: 0, hints: 0, left: CHALLENGE * 1000, tick: 0, q: null, last: "", result: null };
  go("#play");
}
function pagePlay() {
  const s = game.skill, g = game;
  const info = h("p", { class: "muted", "aria-live": "off" }), card = h("div", { class: "card" }), pad = h("div", { class: "pad" }), extra = h("div", { class: "actions" });
  const rod = g.timed ? h("div", { class: "rod", "aria-hidden": "true" }, Array.from({ length: 30 }, () => h("i"))) : null;
  g.ui = { info, card, pad, extra, rod };
  if (g.timed) g.tick = setInterval(() => {
    if (g.waiting || !g.since) return;
    const now = Date.now(); g.left -= now - g.since; g.since = now; paintClock();
    if (g.left <= 0) finish();
  }, 200);
  later(nextQuestion, 0);
  return [h("h1", { class: "small-title" }, tr(s.title)), info, rod, card, pad, extra, h("button", { type: "button", class: "quiet", onclick: finish }, "إنهاء الجولة")];
}
function paintClock() {
  const g = game, sec = Math.max(0, Math.ceil(g.left / 1000));
  g.ui.info.textContent = g.timed ? "الوقت: " + num(sec) + " ثانية · صحيحة: " + num(g.right) : "السؤال " + num(Math.min(g.n + 1, ROUND)) + " من " + num(ROUND) + " · صحيحة: " + num(g.right);
  if (g.ui.rod) [...g.ui.rod.children].forEach((b, i) => b.classList.toggle("spent", i >= Math.ceil(g.left / (CHALLENGE * 1000) * 30)));
}
function nextQuestion() {
  const g = game; if (!g) return;
  if (!g.timed && g.n >= ROUND) return finish();
  let q, k = 0; do { q = g.skill.gen(); } while (JSON.stringify([q.q, q.ask]) === g.last && ++k < 20);
  g.last = JSON.stringify([q.q, q.ask]); g.q = q; g.typed = ""; g.hint = false; g.locked = true; g.since = 0; g.waiting = false;
  paintClock(); g.ui.pad.replaceChildren(); g.ui.extra.replaceChildren(); g.ui.card.className = "card";
  if (q.flash) {
    const screen = h("div", { class: "flash" }, "استعد");
    g.ui.card.replaceChildren(screen);
    q.flash.forEach((v, i) => { later(() => { screen.textContent = num(v); }, 900 + i * 1200); later(() => { screen.textContent = ""; }, 900 + i * 1200 + 950); });
    later(() => ready(h("div", { class: "ask" }, h("strong", {}, "ما المجموع؟"))), 900 + q.flash.length * 1200);
  } else ready(questionView(q));
}
function ready(view) {
  const g = game, q = g.q;
  g.locked = false; g.started = g.since = Date.now();
  g.ui.answer = h("div", { class: "answer", "aria-label": "جوابك", dir: "ltr" });
  g.ui.hint = h("div"); g.ui.feedback = h("p", { class: "feedback", "aria-live": "polite" });
  g.ui.card.replaceChildren(view, q.choices ? "" : g.ui.answer, g.ui.hint, g.ui.feedback);
  if (q.choices) { g.ui.pad.className = "pad choices"; g.ui.pad.replaceChildren(...q.choices.map(c => h("button", { type: "button", onclick: () => judge(c) }, c))); }
  else {
    g.ui.pad.className = "pad";
    g.ui.pad.replaceChildren(...["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "del", "ok"].map(k =>
      h("button", { type: "button", class: k === "ok" ? "primary wide" : "", "aria-label": k === "del" ? "امسح" : k === "," ? "الفاصلة" : false, onclick: () => press(k) },
        k === "del" ? "⌫" : k === "ok" ? "تأكيد الجواب" : k === "," ? (eastern() ? "٫" : ",") : tr(k))));
  }
  g.ui.extra.replaceChildren(h("button", { type: "button", onclick: e => { if (g.locked) return; g.hint = true; e.currentTarget.disabled = true;
    g.ui.hint.replaceChildren(q.steps.length > 1 ? stepsView(q.steps, 1) : h("p", { class: "rule" }, tr(g.skill.rule))); } }, "تلميح"),
    h("button", { type: "button", onclick: () => judge(null) }, "لا أعرف"));
}
function press(k) {
  const g = game; if (!g || g.locked || g.q.choices) return;
  if (k === "ok") { if (/\d/.test(g.typed)) judge(Number(g.typed.replace(",", "."))); return; }
  if (k === "del") g.typed = g.typed.slice(0, -1);
  else if (k === ",") { if (!g.typed.includes(",")) g.typed += g.typed ? "," : "0,"; }
  else if (g.typed.length < 9) g.typed += k;
  g.ui.answer.textContent = num(g.typed);
}
function judge(given) {
  const g = game; if (!g || g.locked) return;
  const p = db.profiles[g.pid], q = g.q, s = g.skill;
  g.locked = true;
  const secs = Math.max(.1, (Date.now() - g.started) / 1000);
  const ok = given !== null && (typeof q.a === "number" ? Math.abs(given - q.a) < 1e-9 : given === q.a);
  g.n++; g.secs += secs; if (g.hint) g.hints++;
  let coins = 0;
  if (ok) {
    g.right++; p.totals.streak++; p.totals.bestStreak = Math.max(p.totals.bestStreak, p.totals.streak);
    coins = g.hint ? 1 : s.level * 2 + (secs <= s.target ? s.level : 0);
    p.xp += g.hint ? 1 : s.level * 2;
  } else p.totals.streak = 0;
  g.coins += coins; p.coins += coins; p.totals.total++; if (ok) p.totals.right++;
  p.ops.unshift({ t: Date.now(), s: s.id, q: q.q, ask: q.ask || "", a: q.a, g: given, ok, sec: Math.round(secs * 10) / 10 });
  p.ops.length = Math.min(p.ops.length, 300);
  save();
  g.ui.card.className = "card " + (ok ? "right" : "wrong");
  g.ui.feedback.textContent = ok ? "أحسنت! +" + num(coins) + " " + COIN + (!g.hint && secs <= s.target ? " (مكافأة السرعة)" : "") : "";
  paintClock();
  g.ui.extra.replaceChildren();
  if (ok) { later(nextQuestion, 800); return; }
  g.waiting = true;
  g.ui.feedback.replaceChildren("الجواب الصحيح: ", h("bdi", {}, answerText(q.a)));
  if (q.flash) g.ui.card.prepend(math(questionTokens(q), "long"));
  g.ui.hint.replaceChildren(stepsView(q.steps));
  g.ui.pad.replaceChildren();
  const b = h("button", { type: "button", class: "primary", onclick: nextQuestion }, "فهمت، التالي");
  g.ui.extra.append(b); b.focus({ preventScroll: true });
}
function finish() {
  const g = game; if (!g || g.result) return;
  clearTimers(); g.locked = true;
  const p = db.profiles[g.pid], s = g.skill;
  if (!g.n) { game = null; go("#s-" + s.id); return; }
  const acc = g.right / g.n, avg = Math.round(g.secs / g.n * 10) / 10;
  const st = p.skills[s.id] || (p.skills[s.id] = { right: 0, total: 0, medal: 0, bestAvg: 0, bestAcc: 0 });
  const notes = [];
  let medal = 0, bonus = 0;
  if (g.n >= ROUND) {
    p.totals.rounds++;
    if (acc >= .9 && avg <= s.target) medal = 3; else if (acc >= .8 && avg <= s.target * 1.5) medal = 2; else if (acc >= .7) medal = 1;
    if (g.hints) medal = Math.min(medal, 1);
    if (acc === 1 && !g.hints) { p.totals.perfect++; bonus += 10 * s.level; notes.push("جولة كاملة دون خطأ"); }
    if (st.bestAvg && avg < st.bestAvg && acc >= st.bestAcc) { p.totals.improved++; bonus += 5 * s.level; notes.push("تقدّم: صرت أسرع من أفضل جولة لك"); }
    if (acc > st.bestAcc || (acc === st.bestAcc && (!st.bestAvg || avg < st.bestAvg))) { st.bestAcc = acc; st.bestAvg = avg; }
    if (medal > st.medal) { st.medal = medal; bonus += medal * 10; notes.push("ميدالية " + MEDALS[medal] + " جديدة"); }
  } else notes.push("أكمل 10 أسئلة لتنافس على ميدالية");
  st.right += g.right; st.total += g.n;
  p.coins += bonus; g.coins += bonus;
  const today = new Date().toLocaleDateString("en-CA"); if (!p.days.includes(today)) p.days.push(today);
  p.sessions.unshift({ t: Date.now(), s: s.id, n: g.n, right: g.right, avg, medal, coins: g.coins, timed: g.timed });
  p.sessions.length = Math.min(p.sessions.length, 100);
  const fresh = BADGES.filter(b => !p.badges[b[0]] && b[3](p));
  fresh.forEach(b => { p.badges[b[0]] = Date.now(); });
  save();
  g.result = { acc, avg, medal, notes, fresh };
  go("#result");
}
function pageResult() {
  const g = game, r = g.result, s = g.skill;
  const title = r.acc >= .9 ? "رائع!" : r.acc >= .7 ? "عمل جيد" : "واصل التدريب";
  return [h("h1", {}, title), h("p", { class: "muted" }, tr(s.title)),
    h("div", { class: "stats panel" }, stat(num(g.right) + " / " + num(g.n), "صحيحة"), stat(num(r.avg), "ثانية للسؤال"), stat("+" + num(g.coins), COIN)),
    r.medal ? h("p", { class: "award" }, medalDot(r.medal), " نلت ميدالية هذه الجولة") : null,
    r.notes.length ? h("ul", { class: "notes" }, r.notes.map(n => h("li", {}, tr(n)))) : null,
    r.fresh.map(b => h("p", { class: "award" }, h("span", { class: "badge" }, "وسام جديد"), " " + tr(b[1]) + ": " + tr(b[2]))),
    h("div", { class: "actions" }, h("button", { type: "button", class: "primary", onclick: () => start(s, g.timed) }, "جولة أخرى"),
      h("button", { type: "button", onclick: () => go("#s-" + s.id) }, "راجع الشرح"), h("button", { type: "button", onclick: () => go("#me") }, "سجلي"))];
}

/* ---------- السجل ---------- */
const byId = id => SKILLS.find(s => s.id === id);
const when = t => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }) + " " + new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function pageMe() {
  const p = me(), t = p.totals, pct = eastern() ? "٪" : "%";
  const medals = Object.entries(p.skills).filter(([id, s]) => s.medal && byId(id));
  const backup = h("textarea", { id: "backup", rows: "4", dir: "ltr", "aria-label": "النسخة الاحتياطية" }), msg = h("p", { class: "muted", "aria-live": "polite" });
  const restore = () => {
    try {
      const x = JSON.parse(backup.value);
      if (!x || typeof x.name !== "string" || !x.totals || !x.skills || !Array.isArray(x.ops)) throw 0;
      const found = Object.entries(db.profiles).find(([, v]) => v.name === x.name);
      const id = found ? found[0] : "p" + Date.now().toString(36);
      db.profiles[id] = Object.assign(blank(x.name), x); db.current = id; save(); render();
    } catch (e) { msg.textContent = "النص غير صالح. الصق النسخة كاملة كما نُسخت."; }
  };
  let confirmDelete = false;
  return [h("h1", {}, "سجل " + p.name),
    h("div", { class: "stats panel" }, stat(num(t.right) + " / " + num(t.total), "إجابات صحيحة"), stat(t.total ? num(Math.round(t.right / t.total * 100)) + pct : "—", "الدقة"), stat(num(t.bestStreak), "أطول سلسلة")),
    h("fieldset", { class: "seg" }, h("legend", {}, "شكل الأرقام"), [["w", "1 2 3"], ["e", "١ ٢ ٣"]].map(([v, l]) =>
      h("button", { type: "button", class: p.digits === v ? "primary" : "", "aria-pressed": String(p.digits === v), onclick: () => { p.digits = v; save(); render(); } }, h("bdi", {}, l)))),
    h("h2", {}, "ميدالياتي"), medals.length ? h("div", { class: "list" }, medals.map(([id, s]) => h("a", { class: "row-link", href: "#s-" + id }, h("b", {}, tr(byId(id).title)), medalDot(s.medal)))) : h("p", { class: "muted" }, "أكمل جولة من 10 أسئلة بدقة " + tr("70%") + " لتنال أول ميدالية."),
    h("h2", {}, "أوسمتي"), h("div", { class: "grid badges" }, BADGES.map(b => h("div", { class: "badge-card" + (p.badges[b[0]] ? " on" : "") }, h("b", {}, tr(b[1])), h("small", {}, tr(b[2])), h("small", {}, p.badges[b[0]] ? "محصَّل" : "لم يُحصَّل بعد")))),
    h("h2", {}, "جولاتي الأخيرة"), p.sessions.length ? h("div", { class: "scroll" }, h("table", {}, h("thead", {}, h("tr", {}, ["التاريخ", "الفنية", "النتيجة", "ثانية", "المكافأة"].map(x => h("th", {}, x)))),
      h("tbody", {}, p.sessions.slice(0, 20).map(x => h("tr", {}, h("td", {}, h("bdi", {}, tr(when(x.t)))), h("td", {}, tr((byId(x.s) || {}).title || x.s)), h("td", {}, num(x.right) + " / " + num(x.n)), h("td", {}, num(x.avg)), h("td", {}, num(x.coins))))))) : h("p", { class: "muted" }, "لا جولات بعد."),
    h("h2", {}, "سجل عملياتي"), p.ops.length ? h("div", { class: "list ops" }, p.ops.slice(0, 60).map(o => h("div", { class: "op " + (o.ok ? "ok" : "ko") },
      questionView({ q: o.q, ask: o.ask }, true), h("span", {}, (o.ok ? "✓ " : "✗ ") + (o.g === null ? "لم أعرف" : "جوابي: " + answerText(o.g)) + (o.ok ? "" : " · الصحيح: " + answerText(o.a)) + " · " + num(o.sec) + " ث")))) : h("p", { class: "muted" }, "ستظهر هنا كل عملية تحلها."),
    h("details", { class: "panel" }, h("summary", {}, "نسخة احتياطية ونقل الحساب"), h("p", { class: "muted small" }, "انسخ النص واحفظه، أو الصقه على جهاز آخر ثم اضغط استرجاع. الاسترجاع يستبدل الحساب الذي يحمل الاسم نفسه."), backup,
      h("div", { class: "actions" }, h("button", { type: "button", onclick: () => { backup.value = JSON.stringify(p); backup.select(); const fail = () => { msg.textContent = "حُدّد النص، انسخه يدوياً."; };
        if (navigator.clipboard) navigator.clipboard.writeText(backup.value).then(() => { msg.textContent = "نُسخت."; }, fail); else fail(); } }, "انسخ حسابي"), h("button", { type: "button", onclick: restore }, "استرجاع")), msg),
    h("button", { type: "button", class: "quiet danger", onclick: e => { if (!confirmDelete) { confirmDelete = true; e.currentTarget.textContent = "اضغط مرة ثانية لحذف الحساب نهائياً"; return; } delete db.profiles[db.current]; db.current = null; save(); go("#students"); } }, "حذف هذا الحساب")];
}
function pageShop() {
  const p = me();
  return [h("h1", {}, "متجر الهدايا"), h("p", {}, "رصيدك: " + num(p.coins) + " " + COIN + " (نقود وهمية للعب فقط)"),
    h("div", { class: "grid gifts" }, GIFTS.map(([id, icon, name, price]) => {
      const owned = p.gifts.includes(id);
      return h("div", { class: "gift" + (owned ? " on" : "") }, h("span", { class: "icon", "aria-hidden": "true" }, icon), h("b", {}, name),
        owned ? h("small", {}, "في خزانتي") : h("button", { type: "button", disabled: p.coins < price, onclick: () => { if (p.coins < price) return; p.coins -= price; p.gifts.push(id); save(); render(); } }, "اشترِ بـ " + num(price)));
    }))];
}
let installPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; if (location.hash === "#install") render(); });
function pageInstall() {
  const block = (t, items) => h("section", { class: "panel" }, h("h2", {}, t), h("ol", {}, items.map(i => h("li", {}, i))));
  return [h("h1", {}, "ضع أيقونة اللعبة على جهازك"),
    document.querySelector('link[rel="manifest"]') ? null : h("p", { class: "rule" }, "هذه نسخة للمعاينة ولا يمكن تثبيتها. التثبيت يعمل من الرابط المنشور على موقعك أو على GitHub Pages."),
    installPrompt ? h("button", { type: "button", class: "primary", onclick: async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); } }, "ثبّت اللعبة الآن") : null,
    block("هاتف Android (Chrome)", ["افتح رابط اللعبة.", "اضغط على النقاط الثلاث أعلى الشاشة.", "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."]),
    block("هاتف iPhone (Safari)", ["افتح رابط اللعبة في Safari.", "اضغط زر المشاركة.", "اختر «إضافة إلى الشاشة الرئيسية»."]),
    block("الحاسوب (Chrome أو Edge)", ["افتح رابط اللعبة.", "اضغط أيقونة التثبيت في شريط العنوان، أو من القائمة اختر تثبيت التطبيق.", "ثبّت اختصاراً على سطح المكتب إن طُلب منك."])];
}

/* ---------- التوجيه ---------- */
function render() {
  clearTimers();
  let hash = location.hash.slice(1) || "home";
  if (game && hash !== "play" && hash !== "result") { if (!game.result && game.n) { finishSilently(); } game = null; }
  if (!me() && hash !== "install") hash = "students";
  let page;
  if (hash === "students") page = pageStudents();
  else if (hash === "install") page = pageInstall();
  else if (hash === "me") page = pageMe();
  else if (hash === "shop") page = pageShop();
  else if (hash === "play" && game && !game.result) page = pagePlay();
  else if (hash === "result" && game && game.result) page = pageResult();
  else if (hash.startsWith("cat-") && CATS.some(c => "cat-" + c.id === hash)) page = pageCat(CATS.find(c => "cat-" + c.id === hash));
  else if (hash.startsWith("s-") && byId(hash.slice(2))) page = pageSkill(byId(hash.slice(2)));
  else page = pageHome();
  main.replaceChildren(...page.flat(Infinity).filter(Boolean));
  if (!storageOk) main.prepend(h("p", { class: "error" }, "المتصفح يمنع الحفظ: لن يبقى سجلك بعد إغلاق الصفحة."));
  who.textContent = me() ? me().name + " · " + num(me().coins) : "";
  nav.querySelectorAll("a").forEach(a => a.toggleAttribute("aria-current", a.hash === "#" + hash));
  window.scrollTo(0, 0);
}
// مغادرة الجولة من القائمة: نحفظ ما أُنجز دون عرض صفحة النتيجة
function finishSilently() {
  const g = game, p = db.profiles[g.pid]; if (!p) return;
  const st = p.skills[g.skill.id] || (p.skills[g.skill.id] = { right: 0, total: 0, medal: 0, bestAvg: 0, bestAcc: 0 });
  st.right += g.right; st.total += g.n;
  const today = new Date().toLocaleDateString("en-CA"); if (!p.days.includes(today)) p.days.push(today);
  p.sessions.unshift({ t: Date.now(), s: g.skill.id, n: g.n, right: g.right, avg: Math.round(g.secs / g.n * 10) / 10, medal: 0, coins: g.coins, timed: g.timed });
  p.sessions.length = Math.min(p.sessions.length, 100); save();
}
window.addEventListener("hashchange", render);
document.addEventListener("keydown", e => {
  if (!game || game.result || game.locked || e.ctrlKey || e.metaKey || e.altKey || game.q.choices) return;
  const k = e.key.replace(/[٠-٩]/, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  if (/^\d$/.test(k)) press(k);
  else if (k === "," || k === "." || k === "٫") press(",");
  else if (k === "Backspace") press("del");
  else if (k === "Enter" && !e.target.closest(".actions, .quiet, nav")) press("ok");
  else return;
  e.preventDefault();
});
if (document.querySelector('link[rel="manifest"]') && "serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
window.__game = () => game;
render();
})();
