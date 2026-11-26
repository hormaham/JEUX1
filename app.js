/* واجهة التطبيق: ملفات التلاميذ، الصفحات، التدريب والمكافآت. كل البيانات تحفظ على الجهاز. */
(() => {
"use strict";
const KEY = "hisab-app-v2";
const ROUND = 10;
const LENGTHS = [["q10", "10 أسئلة"], ["q20", "20 سؤالاً"], ["t60", "دقيقة"], ["t120", "دقيقتان"], ["t300", "5 دقائق"], ["free", "بلا وقت"]];
// عبارات التشجيع: [للولد، للبنت]
const SAY = {
  fast: [["ممتاز وسريع يا {n}!", "ممتاز وسريعة يا {n}!"], ["برافو يا {n}، سرعة رائعة!"], ["مذهل يا {n}!"]],
  ok: [["أحسنت يا {n}!", "أحسنتِ يا {n}!"], ["جيد جداً يا {n}"], ["إجابة موفقة يا {n}"], ["صحيح، واصل يا {n}", "صحيح، واصلي يا {n}"]],
  streak: [["{k} متتالية! أنت رائع يا {n}", "{k} متتالية! أنت رائعة يا {n}"], ["{k} متتالية، تركيز ممتاز يا {n}"]],
  wrong: [["لا تقلق يا {n}، افهم الخطوات", "لا تقلقي يا {n}، افهمي الخطوات"], ["محاولة جيدة يا {n}، التالية لك"], ["لا بأس يا {n}، من الخطأ نتعلم"], ["واصل يا {n}، أنت تتعلم", "واصلي يا {n}، أنت تتعلمين"]],
  great: [["ممتاز يا {n}!"], ["رائع يا {n}!"]],
  good: [["جيد يا {n}، اقتربت من التميز"], ["عمل جيد يا {n}"]],
  keep: [["واصل يا {n}، التدريب يصنع الفرق", "واصلي يا {n}، التدريب يصنع الفرق"]],
  fixed: [["صحيح بعد التصحيح يا {n}"], ["أحسنت التصحيح يا {n}", "أحسنتِ التصحيح يا {n}"]],
  party: [["تصفيق حار لك يا {n}!"], ["أبدعت يا {n}!", "أبدعتِ يا {n}!"], ["نجاح كبير يا {n}!"]],
  calm: [["لا تقلق يا {n}، كل بطل بدأ هكذا", "لا تقلقي يا {n}، كل بطلة بدأت هكذا"], ["لا بأس يا {n}، جرّب مستوى أسهل ثم تقدم", "لا بأس يا {n}، جرّبي مستوى أسهل ثم تقدمي"]]
};
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
const blank = name => ({ name, digits: "w", girl: false, startLevel: 1, cfg: {}, coins: 0, xp: 0, skills: {}, badges: {}, gifts: [], sessions: [], ops: [], days: [],
  totals: { right: 0, total: 0, rounds: 0, perfect: 0, bestStreak: 0, streak: 0, improved: 0 } });
const me = () => db.profiles[db.current] || null;
function say(kind, p, k) {
  const list = SAY[kind], x = list[Math.floor(Math.random() * list.length)];
  return (x[p.girl && x[1] ? 1 : 0]).replace("{n}", p.name).replace("{k}", tr(k));
}

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
  if (/^\d+$/.test(t)) return num(t);
  if (eastern()) return t === "(" ? ")" : t === ")" ? "(" : t === "?" ? "؟" : t;
  return t;
}
// مع الأرقام المشرقية تُكتب العملية من اليمين إلى اليسار
const math = (tokens, cls) => h("span", { class: "eq " + (cls || ""), dir: eastern() ? "rtl" : "ltr" }, tokens.map(t => h("bdi", {}, tok(t))));
const questionTokens = q => q.q.includes("?") ? q.q : [...q.q, "=", "?"];
function questionView(q, small) {
  if (q.ask) return h("div", { class: "ask" }, h("strong", {}, tr(q.ask)), q.q.length ? math(q.q, small ? "" : "big") : null);
  if (q.column && !small) return h("div", { class: "column" }, q.column.map(x => h("bdi", {}, num(x))));
  return math(questionTokens(q), (small ? "" : "big") + (q.q.length > 5 || q.q.join("").length > 11 ? " long" : ""));
}
const stepsView = (steps, n) => h("ol", { class: "steps" }, steps.slice(0, n || steps.length).map(s => h("li", {}, s.t ? h("span", {}, tr(s.t)) : null, s.m ? math(s.m) : null)));
const answerText = a => typeof a === "number" || /^\d+$/.test(a) ? num(a) : a;
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };
const bar = (value, max) => h("div", { class: "bar", role: "img", "aria-label": Math.round(value / max * 100) + "%" }, h("i", { style: "width:" + Math.min(100, value / max * 100) + "%" }));
const rankOf = xp => { let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++; return i; };
const medalDot = (m, level) => h("span", { class: "medal m" + m, title: m ? "ميدالية " + MEDALS[m] : "لا ميدالية بعد" }, m ? MEDALS[m] + (level ? " · " + LEVELS[level] : "") : "—");
const stat = (value, label) => h("div", {}, h("b", {}, value), h("small", {}, label));

// أزرار اختيار واحد
const choice = (type, name, value, label, checked, aria) => h("label", {},
  h("input", { type, name, id: name + "-" + value, value, checked, "aria-label": aria || false }), h("span", {}, label));
const group = (title, cls, items) => h("fieldset", { class: "group" }, h("legend", {}, title), h("div", { class: "choices " + cls }, items));
const levelGroup = current => group("المستوى", "five", [1, 2, 3, 4, 5].map(l => choice("radio", "level", l, LEVELS[l], current === l)));
const digitsGroup = (p, after) => h("fieldset", { class: "seg" }, h("legend", {}, "شكل الأرقام"), [["w", "1 2 3"], ["e", "١ ٢ ٣"]].map(([v, l]) =>
  h("button", { type: "button", class: p.digits === v ? "primary" : "", "aria-pressed": String(p.digits === v), onclick: () => { p.digits = v; save(); after(); } }, h("bdi", {}, l))));
const girlGroup = girl => group("صيغة الخطاب", "", [["m", "ولد"], ["f", "بنت"]].map(([v, l]) => choice("radio", "girl", v, l, (v === "f") === !!girl)));
// أعلى مستوى نيلت فيه ميدالية
const topMedal = st => {
  if (!st) return [0, 0];
  for (let l = 5; l; l--) if (st.by && st.by[l] && st.by[l].medal) return [st.by[l].medal, l];
  return [st.medal || 0, 0];
};

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
      const id = "p" + Date.now().toString(36), f = new FormData(e.currentTarget);
      db.profiles[id] = Object.assign(blank(name), { girl: f.get("girl") === "f", startLevel: Number(f.get("level")) }); db.current = id; save(); go("#home");
    } }, h("label", { for: "name" }, "تلميذ جديد: الاسم أو اللقب"), input, girlGroup(false), group("مستواك عند الانطلاقة", "five", [1, 2, 3, 4, 5].map(l => choice("radio", "level", l, LEVELS[l], l === 1))), err, h("button", { class: "primary", type: "submit" }, "إنشاء الحساب")),
    h("p", { class: "muted small" }, "تُحفظ الحسابات على هذا الجهاز فقط، دون كلمة مرور.")];
}
function pageHome() {
  const p = me(), r = rankOf(p.xp), next = RANKS[r + 1];
  return [h("section", { class: "panel hero" },
      h("h1", {}, "مرحباً " + p.name),
      h("p", {}, "رتبتك: " + RANKS[r][1] + (next ? "، والتالية: " + next[1] : "")),
      next ? bar(p.xp - RANKS[r][0], next[0] - RANKS[r][0]) : null,
      h("div", { class: "stats" }, stat(num(p.coins), COIN), stat(num(Object.values(p.skills).filter(s => s.medal).length), "ميدالية"), stat(num(Object.keys(p.badges).length), "وسام"))),
    h("a", { class: "tile free", href: "#classic" }, h("b", {}, "التحدي الحر"), h("small", {}, "للمبتدئين وكل الأعمار: اختر العمليات والمستوى (سهل، متوسط، صعب) والمدة")),
    h("h2", {}, "صفحات الفنيات"),
    h("div", { class: "grid" }, CATS.map(c => {
      const list = SKILLS.filter(s => s.cat === c.id), done = list.filter(s => p.skills[s.id] && p.skills[s.id].medal).length;
      return h("a", { class: "tile", href: "#cat-" + c.id }, h("span", { class: "mark", dir: "ltr" }, tr(c.mark)), h("b", {}, tr(c.title)), h("small", {}, tr(c.desc)),
        h("small", {}, "ميداليات: " + num(done) + " من " + num(list.length)), bar(done, list.length));
    }))];
}
function pageCat(c) {
  const p = me();
  return [h("h1", {}, tr(c.title)), h("p", { class: "muted" }, tr(c.desc) + ". ابدأ بالأسهل."),
    h("div", { class: "list" }, SKILLS.filter(s => s.cat === c.id).sort((a, b) => a.level - b.level).map(s =>
      h("a", { class: "row-link", href: "#s-" + s.id }, h("span", {}, h("b", {}, tr(s.title)), h("small", {}, "مستواك: " + LEVELS[cfgOf(p, s).level])), medalDot(...topMedal(p.skills[s.id])))))];
}
function cfgOf(p, s) {
  p.cfg = p.cfg || {};
  const c = Object.assign({ level: p.startLevel || 1, len: "q10" }, p.cfg[s.id]);
  if (s.id === "flash") c.flash = Object.assign({}, FLASH[c.level - 1], c.flash);
  return c;
}
function pageSkill(s) {
  const p = me(), box = h("div", { class: "panel" }), info = h("div", { class: "stack" }), settings = h("form", { class: "panel", onsubmit: e => e.preventDefault() });
  let cfg = cfgOf(p, s);
  const example = () => {
    const q = s.gen(cfg.level, cfg.flash);
    box.replaceChildren(h("h2", {}, "مثال محلول: " + LEVELS[cfg.level]), questionView(q, true), stepsView(q.steps),
      h("p", { class: "result" }, "الجواب: ", h("bdi", {}, answerText(q.a))), h("button", { type: "button", onclick: example }, "مثال آخر"));
  };
  const paintInfo = () => {
    const st = p.skills[s.id], at = st && st.by && st.by[cfg.level];
    info.replaceChildren(h("p", { class: "muted" }, "للميدالية الذهبية في هذا المستوى: دقة " + tr("90%") + " ومتوسط " + num(targetOf(s, cfg.level)) + " ثانية للسؤال أو أقل، في " + tr("10") + " أسئلة على الأقل."),
      at ? h("div", { class: "stats panel" }, stat(num(Math.round(at.bestAcc * 100)) + (eastern() ? "٪" : "%"), "أفضل دقة"), stat(num(at.bestAvg), "متوسط أفضل جولة"), stat(medalDot(at.medal), "ميداليتك")) : "");
  };
  const flashSelect = (key, label, text) => h("label", { class: "pick" }, h("span", {}, label),
    h("select", { name: key, id: "flash-" + key }, FLASH_OPTIONS[key].map(v => h("option", { value: v, selected: cfg.flash[key] === v }, text(v)))));
  const paintSettings = () => settings.replaceChildren(h("h2", {}, "إعدادات التدريب"), levelGroup(cfg.level),
    group("المدة", "three", LENGTHS.map(([v, l]) => choice("radio", "len", v, tr(l), cfg.len === v))),
    s.id === "flash" ? h("div", { class: "picks" }, flashSelect("speed", "مدة كل ومضة", v => num(v) + " ث"), flashSelect("count", "عدد الأعداد", v => num(v)), flashSelect("digits", "أرقام كل عدد", v => num(v))) : "",
    digitsGroup(p, () => render()));
  settings.addEventListener("change", e => {
    const f = new FormData(settings), level = Number(f.get("level"));
    const next = { level, len: f.get("len") };
    // تغيير المستوى يعيد إعدادات الومضات المناسبة له
    if (s.id === "flash") next.flash = e.target.name === "level" ? Object.assign({}, FLASH[level - 1]) : { speed: Number(f.get("speed")), count: Number(f.get("count")), digits: Number(f.get("digits")) };
    const redo = level !== cfg.level || e.target.name === "count" || e.target.name === "digits";
    cfg = next; p.cfg[s.id] = next; save();
    if (e.target.name === "level") { paintSettings(); settings.querySelector("#level-" + level).focus({ preventScroll: true }); }
    if (redo) example();
    paintInfo();
  });
  paintSettings(); example(); paintInfo();
  return [h("h1", {}, tr(s.title)), h("p", { class: "rule" }, tr(s.rule)), settings,
    h("button", { type: "button", class: "primary big-start", onclick: () => start(s, cfg) }, "ابدأ التدريب"), info, box];
}

/* ---------- الجولة ---------- */
let game = null;
const timers = new Set();
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); if (game) clearInterval(game.tick); };

function start(skill, cfg, free) {
  clearTimers();
  const timed = cfg.len[0] === "t", duration = timed ? Number(cfg.len.slice(1)) : 0;
  game = { skill, cfg, level: cfg.level, timed, duration, limit: cfg.len[0] === "q" ? Number(cfg.len.slice(1)) : 0, free: free || null, score: 0, streak: 0, missed: [],
    pid: db.current, n: 0, right: 0, fixed: 0, clean: 0, secs: 0, coins: 0, hints: 0, left: duration * 1000, tick: 0, q: null, last: "", result: null };
  go("#play");
}
function pagePlay() {
  const s = game.skill, g = game;
  const toast = h("p", { class: "toast", "aria-live": "polite" });
  const info = h("p", { class: "muted info", "aria-live": "off" }), card = h("div", { class: "card" }), pad = h("div", { class: "pad" }), extra = h("div", { class: "actions" });
  const rod = g.timed ? h("div", { class: "rod", "aria-hidden": "true" }, Array.from({ length: 30 }, () => h("i"))) : null;
  g.ui = { info, card, pad, extra, rod, toast };
  if (g.timed) g.tick = setInterval(() => {
    if (g.waiting || !g.since) return;
    const now = Date.now(); g.left -= now - g.since; g.since = now; paintClock();
    if (g.left <= 0) finish();
  }, 200);
  later(nextQuestion, 0);
  return [h("div", { class: "play-top" }, h("h1", { class: "small-title" }, tr(s.title) + (g.free ? "" : " · " + LEVELS[g.level])), info, rod, toast, card),
    h("div", { class: "play-keys" }, pad, extra)];
}
// نصغّر خط العملية حتى تظهر كاملة داخل البطاقة دون تمرير
function fit(min) {
  const c = game && game.ui && game.ui.card; if (!c || !c.isConnected) return;
  game.fitMin = min;
  let k = 1; c.style.setProperty("--fs", k);
  while (k > min && (c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1)) { k -= .04; c.style.setProperty("--fs", k.toFixed(2)); }
  c.scrollTop = 0;
}
window.addEventListener("resize", () => { if (game && !game.result && game.fitMin) fit(game.fitMin); });
// يبقى التشجيع ظاهراً مدة تكفي لقراءته، حتى بعد ظهور السؤال التالي
function showToast(text) {
  const g = game, el = g.ui.toast;
  clearTimeout(g.toastTimer); el.textContent = text; el.classList.toggle("on", !!text);
  if (text) g.toastTimer = later(() => { el.textContent = ""; el.classList.remove("on"); }, 4500);
}
function paintClock() {
  const g = game, sec = Math.max(0, Math.ceil(g.left / 1000));
  if (g.free) g.ui.info.textContent = (g.timed ? "الوقت: " + num(sec) + " ثانية" : "تدريب بلا وقت") + " · النقاط: " + num(g.score) + " · متتالية: " + num(g.streak);
  else g.ui.info.textContent = (g.timed ? "الوقت: " + num(sec) + " ثانية" : g.limit ? "السؤال " + num(Math.min(g.n + 1, g.limit)) + " من " + num(g.limit) : "تدريب بلا وقت · أجبت: " + num(g.n)) + " · صحيحة: " + num(g.right);
  if (g.ui.rod) [...g.ui.rod.children].forEach((b, i) => b.classList.toggle("spent", i >= Math.ceil(g.left / (g.duration * 1000) * 30)));
}
function nextQuestion() {
  const g = game; if (!g) return;
  if (g.limit && g.n >= g.limit) return finish();
  let q, k = 0; do { q = g.skill.gen(g.level, g.cfg.flash); } while (JSON.stringify([q.q, q.ask]) === g.last && ++k < 20);
  g.last = JSON.stringify([q.q, q.ask]); g.q = q; g.typed = ""; g.hint = false; g.retried = false; g.locked = true; g.since = 0; g.waiting = false;
  paintClock(); g.ui.pad.replaceChildren(); g.ui.extra.replaceChildren(); g.ui.card.className = "card";
  if (q.flash) {
    const screen = h("div", { class: "flash" }, "استعد"), step = q.speed * 1000, shown = step - Math.max(70, step * .2);
    g.ui.card.replaceChildren(screen); fit(.4);
    q.flash.forEach((v, i) => { later(() => { screen.textContent = num(v); }, 900 + i * step); later(() => { screen.textContent = ""; }, 900 + i * step + shown); });
    later(() => ready(h("div", { class: "ask" }, h("strong", {}, "ما المجموع؟"))), 900 + q.flash.length * step);
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
    g.ui.pad.replaceChildren(...["1", "2", "3", "4", "5", "6", "7", "8", "9", ...(g.free ? ["del", "0", "ok"] : [",", "0", "del"])].map(k =>
      h("button", { type: "button", class: k === "ok" ? "primary" : "", "aria-label": k === "del" ? "امسح" : k === "," ? "الفاصلة" : k === "ok" ? "تأكيد" : false, onclick: () => press(k) },
        k === "del" ? "⌫" : k === "ok" ? "✓" : k === "," ? (eastern() ? "٫" : ",") : tr(k))));
  }
  main.classList.toggle("tall", !!(q.column && q.column.length > 5));
  if (g.free) g.ui.extra.replaceChildren(h("button", { type: "button", onclick: () => judge(null) }, "تخطَّ السؤال"));
  else g.ui.extra.replaceChildren(...[h("button", { type: "button", onclick: e => { if (g.locked) return; g.hint = true; e.currentTarget.disabled = true;
    g.ui.hint.replaceChildren(q.steps.length > 1 ? stepsView(q.steps, 1) : h("p", { class: "rule" }, tr(g.skill.rule))); fit(.55); } }, "تلميح"),
    h("button", { type: "button", onclick: () => judge(null) }, "لا أعرف"),
    q.choices ? null : h("button", { type: "button", class: "primary confirm", onclick: () => press("ok") }, "تأكيد")].filter(Boolean));
  fit(.4);
}
const digitCount = v => String(v).replace(/\D/g, "").length;
const typedValue = g => g.q.big ? g.typed.replace(/^0+(?=\d)/, "") : Number(g.typed.replace(",", "."));
const isRight = (q, v) => v !== null && (typeof q.a === "number" ? Math.abs(v - q.a) < 1e-9 : v === q.a);
function press(k) {
  const g = game; if (!g || g.locked || g.q.choices) return;
  if (k === "ok") { if (/\d/.test(g.typed)) judge(typedValue(g)); return; }
  if (k === "del") {
    // مسح جواب مكتمل وخاطئ يعني محاولة ثانية
    if (digitCount(g.typed) >= digitCount(g.q.a)) g.retried = true;
    g.typed = g.typed.slice(0, -1);
  }
  else if (k === ",") { if (!g.typed.includes(",")) g.typed += g.typed ? "," : "0,"; }
  else if (g.typed.length < 20) g.typed += k;
  g.ui.answer.textContent = num(g.typed.replace(",", "."));
  fit(.4);
  // الجواب الصحيح يُقبل فوراً دون تأكيد
  if (k !== "del" && /\d/.test(g.typed) && isRight(g.q, typedValue(g))) judge(typedValue(g));
}
function judge(given) {
  const g = game; if (!g || g.locked) return;
  const p = db.profiles[g.pid], q = g.q, s = g.skill;
  g.locked = true;
  const secs = Math.max(.1, (Date.now() - g.started) / 1000);
  const ok = isRight(q, given), fixed = ok && !g.free && g.retried;
  const L = g.level, quick = secs <= targetOf(s, L);
  g.n++; g.secs += secs; if (g.hint) g.hints++;
  let coins = 0;
  if (ok) {
    g.right++; if (fixed) g.fixed++; if (!g.hint && !fixed) g.clean++;
    p.totals.streak = fixed ? 0 : p.totals.streak + 1; p.totals.bestStreak = Math.max(p.totals.bestStreak, p.totals.streak);
    coins = g.hint || fixed ? 1 : L * 2 + s.level - 1 + (quick ? L : 0);
    p.xp += g.hint || fixed ? 1 : L * 2;
  } else p.totals.streak = 0;
  if (g.free) {
    if (ok) { g.streak++; g.score += L + (g.streak % 5 === 0 ? 5 : 0); }
    else { g.streak = 0; g.missed.push({ q: q.q, a: q.a, g: given }); }
  }
  g.coins += coins; p.coins += coins; p.totals.total++; if (ok) p.totals.right++;
  p.ops.unshift({ t: Date.now(), s: s.id, lv: L, q: q.q, ask: q.ask || "", a: q.a, g: given, ok, fix: fixed || undefined, sec: Math.round(secs * 10) / 10 });
  p.ops.length = Math.min(p.ops.length, 300);
  save();
  g.ui.card.className = "card " + (ok ? "right" : "wrong");
  const run = p.totals.streak, cheer = ok ? say(fixed ? "fixed" : run && run % 5 === 0 ? "streak" : quick && !g.hint ? "fast" : "ok", p, run) : say("wrong", p);
  showToast(ok ? cheer + " +" + num(coins) + " " + COIN : "");
  paintClock();
  g.ui.extra.replaceChildren();
  const move = () => { if (game === g && g.q === q) nextQuestion(); };
  if (ok) { later(move, 700); return; }
  g.waiting = true; // يتوقف الوقت أثناء قراءة التصحيح
  g.ui.feedback.replaceChildren(h("span", { class: "cheer" }, cheer), "الجواب الصحيح: ", h("bdi", {}, answerText(q.a)));
  g.ui.pad.replaceChildren();
  const b = h("button", { type: "button", class: "primary", onclick: move }, g.free ? "التالي" : "فهمت، التالي");
  g.ui.extra.append(b); b.focus({ preventScroll: true });
  if (g.free) { later(move, 4500); fit(.6); return; }
  if (q.flash) g.ui.card.prepend(math(questionTokens(q), "long"));
  g.ui.hint.replaceChildren(stepsView(q.steps));
  fit(.75);
}
// سجل المهارة، مع نقل السجلات القديمة إلى المستوى المتوسط
function statOf(p, id) {
  const st = p.skills[id] || (p.skills[id] = { right: 0, total: 0, medal: 0, by: {} });
  if (!st.by) { st.by = {}; if (st.bestAvg) st.by[2] = { medal: st.medal, bestAvg: st.bestAvg, bestAcc: st.bestAcc }; }
  return st;
}
// النجاح الكبير: 8 أسئلة على الأقل، و90% منها صحيحة من أول محاولة ودون تلميح
const party = (p, g) => g.n >= 8 && g.clean / g.n >= .9 ? say("party", p) : null;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audio = null, clapping = null, claps = 0;
function wake() { if (!AudioCtx) return; try { audio = audio || new AudioCtx(); if (audio.state === "suspended") audio.resume(); } catch (e) {} }
["pointerdown", "keydown"].forEach(t => document.addEventListener(t, wake, true));
// صوت التصفيق يولّده الجهاز نفسه: يعمل دون إنترنت ودون ملفات صوتية
function applauseSamples(rate) {
  const length = Math.floor(rate * 3.5), out = new Float32Array(length), burst = Math.floor(rate * .035);
  for (let hand = 0; hand < 18; hand++) {
    const w = 2 * Math.PI * (700 + Math.random() * 1800) / rate, alpha = Math.sin(w) / 2.4, a0 = 1 + alpha, a1 = -2 * Math.cos(w), a2 = 1 - alpha;
    const period = .2 + Math.random() * .13, loud = .35 + Math.random() * .65;
    for (let t = Math.random() * .3; t < 3.45; t += period * (.85 + Math.random() * .3)) {
      const from = Math.floor(t * rate); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < burst && from + i < length; i++) {
        const x = (Math.random() * 2 - 1) * Math.exp(-i / (rate * .006)), y = (alpha * x - alpha * x2 - a1 * y1 - a2 * y2) / a0;
        x2 = x1; x1 = x; y2 = y1; y1 = y; out[from + i] += y * loud;
      }
    }
  }
  let peak = 0;
  for (let i = 0; i < length; i++) { const t = i / rate; out[i] *= Math.min(1, t / .25) * (t > 2.4 ? Math.max(0, (3.5 - t) / 1.1) : 1); peak = Math.max(peak, Math.abs(out[i])); }
  for (let i = 0; i < length; i++) out[i] *= .9 / (peak || 1);
  return out;
}
function hush() { if (clapping) { try { clapping.stop(); } catch (e) {} clapping = null; } }
function applause(p) {
  hush(); if (!p || p.sound === false) return;
  wake(); if (!audio) return;
  try {
    const data = applauseSamples(audio.sampleRate), buffer = audio.createBuffer(1, data.length, audio.sampleRate);
    buffer.getChannelData(0).set(data);
    clapping = audio.createBufferSource(); clapping.buffer = buffer; clapping.connect(audio.destination); clapping.start(); claps++;
  } catch (e) {}
}
// بطاقة التشجيع تبقى حتى يضغط التلميذ «متابعة»
function celebrate(g) {
  const r = g.result, p = db.profiles[g.pid];
  if (!r.party || r.seen) return null;
  const sound = h("button", { type: "button", class: "quiet", onclick: () => { p.sound = p.sound === false; save(); label(); if (p.sound) applause(p); else hush(); } });
  const label = () => { sound.textContent = p.sound === false ? "شغّل صوت التصفيق" : "أوقف صوت التصفيق"; };
  const done = h("button", { type: "button", class: "primary", onclick: () => { r.seen = true; hush(); box.remove(); } }, "متابعة");
  const box = h("div", { class: "party", role: "dialog", "aria-modal": "true", "aria-labelledby": "party-title" },
    h("div", { class: "party-box" }, h("div", { class: "hands", "aria-hidden": "true" }, "👏👏👏"), h("h2", { id: "party-title" }, r.party),
      h("p", {}, "إجابات صحيحة: " + num(g.right) + " من " + num(g.n)),
      r.medal ? h("p", {}, medalDot(r.medal), " ميدالية هذه الجولة") : null,
      r.note ? h("p", {}, r.note) : null,
      h("p", { class: "coins" }, "+" + num(g.coins) + " " + COIN), done, sound));
  label(); applause(p); later(() => done.focus({ preventScroll: true }), 60);
  return box;
}
const headline = (p, acc) => say(acc >= .9 ? "great" : acc >= .7 ? "good" : acc >= .5 ? "keep" : "calm", p);
// اقتراح الخطوة التالية في التدرج
function advice(s, g, acc, avg, target) {
  const L = g.level, f = g.cfg.flash;
  if (g.n >= ROUND && acc >= .9 && avg <= target) {
    if (L < 5) return { text: "أنت جاهز لمستوى " + LEVELS[L + 1], cfg: { level: L + 1, len: g.cfg.len, flash: f ? Object.assign({}, FLASH[L]) : undefined } };
    const faster = f && FLASH_OPTIONS.speed.find(v => v < f.speed);
    if (faster) return { text: "جرّب ومضة أسرع: " + num(faster) + " ثانية", cfg: { level: L, len: g.cfg.len, flash: Object.assign({}, f, { speed: faster }) } };
    return { text: "أداء بمستوى عالمي!" };
  }
  if (g.n >= 5 && acc < .5 && L > 1) return { text: "تدرّب في مستوى " + LEVELS[L - 1] + " ثم ارجع", cfg: { level: L - 1, len: g.cfg.len, flash: f ? Object.assign({}, FLASH[L - 2]) : undefined } };
  return null;
}
function finish() {
  const g = game; if (!g || g.result) return;
  clearTimers(); g.locked = true;
  const p = db.profiles[g.pid], s = g.skill;
  if (!g.n) { game = null; go(g.free ? "#classic" : "#s-" + s.id); return; }
  if (g.free) return finishFree();
  // الدقة المعتمدة للميداليات: الصحيح من المحاولة الأولى
  const acc = (g.right - g.fixed) / g.n, avg = Math.round(g.secs / g.n * 10) / 10;
  const st = statOf(p, s.id), L = g.level, target = targetOf(s, L);
  const best = st.by[L] || (st.by[L] = { medal: 0, bestAvg: 0, bestAcc: 0 });
  const notes = [];
  let medal = 0, bonus = 0, better = false;
  if (g.n >= ROUND) {
    p.totals.rounds++;
    if (acc >= .9 && avg <= target) medal = 3; else if (acc >= .8 && avg <= target * 1.5) medal = 2; else if (acc >= .7) medal = 1;
    if (g.hints) medal = Math.min(medal, 1);
    if (acc === 1 && !g.hints) { p.totals.perfect++; bonus += 10 * L; notes.push("جولة كاملة دون خطأ"); }
    if (best.bestAvg && ((avg < best.bestAvg && acc >= best.bestAcc) || acc > best.bestAcc)) { better = true; p.totals.improved++; bonus += 5 * L; notes.push("أنت في تحسن يا " + p.name + ": هذه أفضل من أفضل جولة سابقة لك في هذا المستوى"); }
    if (acc > best.bestAcc || (acc === best.bestAcc && (!best.bestAvg || avg < best.bestAvg))) { best.bestAcc = acc; best.bestAvg = avg; }
    if (medal > best.medal) { best.medal = medal; bonus += medal * 5 * L; notes.push("ميدالية " + MEDALS[medal] + " جديدة في مستوى " + LEVELS[L]); }
    st.medal = Math.max(st.medal, medal);
  } else notes.push("أكمل 10 أسئلة لتنافس على ميدالية");
  if (g.fixed) notes.push("أجوبة صححتها: " + g.fixed + ". الميدالية تُحسب بالمحاولة الأولى");
  st.right += g.right; st.total += g.n;
  p.coins += bonus; g.coins += bonus;
  const fresh = closeSession(p, { t: Date.now(), s: s.id, lv: L, n: g.n, right: g.right, avg, medal, coins: g.coins, timed: g.timed });
  g.result = { acc, avg, medal, notes, fresh, head: headline(p, acc), party: party(p, g), next: advice(s, g, acc, avg, target) };
  go("#result");
}
function pageResult() {
  const g = game, r = g.result, s = g.skill;
  const follow = () => { const p = me(); p.cfg[s.id] = r.next.cfg; save(); start(s, r.next.cfg); };
  return [celebrate(g), h("h1", {}, r.head), h("p", { class: "muted" }, tr(s.title) + " · " + LEVELS[g.level]),
    h("div", { class: "stats panel" }, stat(num(g.right) + " / " + num(g.n), "صحيحة"), stat(num(r.avg), "ثانية للسؤال"), stat("+" + num(g.coins), COIN)),
    r.medal ? h("p", { class: "award" }, medalDot(r.medal), " نلت ميدالية هذه الجولة") : null,
    r.notes.length ? h("ul", { class: "notes" }, r.notes.map(n => h("li", {}, tr(n)))) : null,
    badgeNews(r.fresh),
    r.next ? h("div", { class: "panel" }, h("b", {}, r.next.text), r.next.cfg ? h("button", { type: "button", class: "primary", onclick: follow }, "هيا بنا") : null) : null,
    h("div", { class: "actions" }, h("button", { type: "button", class: r.next && r.next.cfg ? "" : "primary", onclick: () => start(s, g.cfg) }, "جولة أخرى"),
      h("button", { type: "button", onclick: () => go("#s-" + s.id) }, "الإعدادات والشرح"), h("button", { type: "button", onclick: () => go("#me") }, "سجلي"))];
}

/* ---------- التحدي الحر ---------- */
const OPS = [["+", "الجمع"], ["−", "الطرح"], ["×", "الضرب"], ["÷", "القسمة"]];
const FREE = [1, 2, 3, 4, 5].map(l => ({ id: "free-" + l, title: "التحدي الحر", level: 1, target: 0, targets: [6, 8, 14, 25, 45], rule: "", gen: null }));
const freeKey = c => c.ops.join("") + ":" + c.level + ":" + c.time;
function startFree(cfg) {
  const skill = Object.assign({}, FREE[cfg.level - 1], { gen: () => basic(cfg.level, P(cfg.ops)) });
  start(skill, { level: cfg.level, len: cfg.time ? "t" + cfg.time : "free" }, cfg);
}
function pageClassic() {
  const p = me(), cfg = Object.assign({ ops: ["+", "−"], level: p.startLevel || 1, time: 60 }, p.freeCfg);
  const err = h("p", { class: "error", role: "alert" }), best = h("p", { class: "muted" });
  let form;
  const read = () => { const f = new FormData(form); return { ops: f.getAll("op"), level: Number(f.get("level")), time: Number(f.get("time")) }; };
  const showBest = () => { const c = read(), b = c.time && (p.free || {})[freeKey(c)]; best.textContent = b ? "أفضل نتيجة لك بهذه الإعدادات: " + num(b) : ""; };
  form = h("form", { class: "stack", onchange: () => { err.textContent = ""; showBest(); }, onsubmit: e => {
      e.preventDefault(); const c = read();
      if (!c.ops.length) { err.textContent = "اختر عملية واحدة على الأقل."; return; }
      p.freeCfg = c; save(); startFree(c);
    } },
    group("العمليات", "ops", OPS.map(([v, n]) => choice("checkbox", "op", v, v, cfg.ops.includes(v), n))),
    levelGroup(cfg.level),
    group("المدة", "four", [[60, "دقيقة"], [120, "دقيقتان"], [300, tr("5 دقائق")], [0, "بلا وقت"]].map(([v, l]) => choice("radio", "time", v, l, cfg.time === v))),
    digitsGroup(p, () => { p.freeCfg = read(); save(); render(); }),
    err, h("button", { class: "primary", type: "submit" }, "ابدأ التحدي"), best);
  showBest();
  return [h("h1", {}, "التحدي الحر"), h("p", { class: "muted" }, "للمبتدئين ولكل الأعمار: احسب في رأسك، واكتب الجواب بأسرع ما تستطيع."), form];
}
function finishFree() {
  const g = game, p = db.profiles[g.pid], s = g.skill, cfg = g.free;
  const acc = g.right / g.n, avg = Math.round(g.secs / g.n * 10) / 10;
  let note = "";
  p.free = p.free || {};
  if (g.timed) {
    const k = freeKey(cfg), best = p.free[k] || 0;
    if (g.score > best) { p.free[k] = g.score; note = "رقم قياسي جديد!"; } else if (best) note = "أفضل نتيجة لك: " + num(best);
  }
  if (g.n >= ROUND) { p.totals.rounds++; if (acc === 1) p.totals.perfect++; }
  const fresh = closeSession(p, { t: Date.now(), s: s.id, lv: g.level, n: g.n, right: g.right, avg, medal: 0, coins: g.coins, timed: g.timed });
  g.result = { acc, avg, note, fresh, head: headline(p, acc), party: party(p, g) };
  go("#result");
}
function closeSession(p, session) {
  const today = new Date().toLocaleDateString("en-CA"); if (!p.days.includes(today)) p.days.push(today);
  p.sessions.unshift(session); p.sessions.length = Math.min(p.sessions.length, 100);
  const fresh = BADGES.filter(b => !p.badges[b[0]] && b[3](p));
  fresh.forEach(b => { p.badges[b[0]] = Date.now(); });
  save();
  return fresh;
}
const badgeNews = list => list.map(b => h("p", { class: "award" }, h("span", { class: "badge" }, "وسام جديد"), " " + tr(b[1]) + ": " + tr(b[2])));
function pageFreeResult() {
  const g = game, r = g.result;
  return [celebrate(g), h("h1", {}, r.head), h("p", { class: "muted" }, "التحدي الحر · " + LEVELS[g.level]), r.note ? h("p", { class: "muted" }, r.note) : null,
    h("div", { class: "stats panel" }, stat(num(g.score), "النقاط"), stat(num(g.right) + " / " + num(g.n), "صحيحة"), stat(num(Math.round(r.acc * 100)) + (eastern() ? "٪" : "%"), "الدقة")),
    h("p", { class: "award" }, "ربحت " + num(g.coins) + " " + COIN), badgeNews(r.fresh),
    h("p", {}, g.missed.length ? "راجع هذه العمليات:" : "لا أخطاء في هذه الجولة."),
    g.missed.length ? h("div", { class: "list ops" }, g.missed.map(m => h("div", { class: "op ko" }, math([...m.q, "=", m.a]), h("span", {}, m.g === null ? "تخطيته" : "جوابك: " + num(m.g))))) : null,
    h("div", { class: "actions" }, h("button", { type: "button", class: "primary", onclick: () => startFree(g.free) }, "العب مرة أخرى"),
      h("button", { type: "button", onclick: () => go("#classic") }, "غيّر الإعدادات"))];
}

/* ---------- السجل ---------- */
const byId = id => SKILLS.find(s => s.id === id) || FREE.find(s => s.id === id);
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
    h("form", { class: "panel", onsubmit: e => e.preventDefault(), onchange: e => {
        const f = new FormData(e.currentTarget);
        p.girl = f.get("girl") === "f"; p.sound = f.get("sound") !== "off";
        // المستوى الجديد يطبَّق على كل الصفحات
        if (e.target.name === "level") { p.startLevel = Number(f.get("level")); Object.values(p.cfg || {}).forEach(c => { c.level = p.startLevel; delete c.flash; }); if (p.freeCfg) p.freeCfg.level = p.startLevel; }
        save();
      } }, h("h2", {}, "إعداداتي"), group("مستواي في كل الصفحات", "five", [1, 2, 3, 4, 5].map(l => choice("radio", "level", l, LEVELS[l], (p.startLevel || 1) === l))), girlGroup(p.girl), group("صوت التصفيق", "", [["on", "مسموع"], ["off", "صامت"]].map(([v, l]) => choice("radio", "sound", v, l, (v === "off") === (p.sound === false)))), digitsGroup(p, () => render())),
    h("h2", {}, "ميدالياتي"), medals.length ? h("div", { class: "list" }, medals.map(([id, s]) => h("a", { class: "row-link", href: "#s-" + id }, h("b", {}, tr(byId(id).title)), medalDot(...topMedal(s))))) : h("p", { class: "muted" }, "أكمل جولة من 10 أسئلة بدقة " + tr("70%") + " لتنال أول ميدالية."),
    h("h2", {}, "أوسمتي"), h("div", { class: "grid badges" }, BADGES.map(b => h("div", { class: "badge-card" + (p.badges[b[0]] ? " on" : "") }, h("b", {}, tr(b[1])), h("small", {}, tr(b[2])), h("small", {}, p.badges[b[0]] ? "محصَّل" : "لم يُحصَّل بعد")))),
    h("h2", {}, "جولاتي الأخيرة"), p.sessions.length ? h("div", { class: "scroll" }, h("table", {}, h("thead", {}, h("tr", {}, ["التاريخ", "الفنية", "النتيجة", "ثانية", "المكافأة"].map(x => h("th", {}, x)))),
      h("tbody", {}, p.sessions.slice(0, 20).map(x => h("tr", {}, h("td", {}, h("bdi", {}, tr(when(x.t)))), h("td", {}, tr((byId(x.s) || {}).title || x.s) + (x.lv ? " · " + LEVELS[x.lv] : "")), h("td", {}, num(x.right) + " / " + num(x.n)), h("td", {}, num(x.avg)), h("td", {}, num(x.coins))))))) : h("p", { class: "muted" }, "لا جولات بعد."),
    h("h2", {}, "سجل عملياتي"), p.ops.length ? h("div", { class: "list ops" }, p.ops.slice(0, 60).map(o => h("div", { class: "op " + (o.ok ? "ok" : "ko") },
      questionView({ q: o.q, ask: o.ask }, true), h("span", {}, (o.ok ? (o.fix ? "✓ بعد تصحيح · " : "✓ ") : "✗ ") + (o.g === null ? "لم أعرف" : "جوابي: " + answerText(o.g)) + (o.ok ? "" : " · الصحيح: " + answerText(o.a)) + " · " + num(o.sec) + " ث")))) : h("p", { class: "muted" }, "ستظهر هنا كل عملية تحلها."),
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

/* ---------- الرجوع والخروج ---------- */
let leaver = null;
function parentOf(hash) {
  if ((hash === "play" || hash === "result") && game) return game.free ? "#classic" : "#s-" + game.skill.id;
  if (hash.startsWith("s-")) { const s = byId(hash.slice(2)); return s ? "#cat-" + s.cat : "#home"; }
  return hash === "home" || hash === "" ? "#students" : "#home";
}
document.getElementById("back").addEventListener("click", () => go(parentOf(location.hash.slice(1))));
document.getElementById("end").addEventListener("click", () => finish());
document.getElementById("exit").addEventListener("click", () => {
  clearTimers();
  if (game && !game.result && game.n) finishSilently();
  game = null;
  const p = me();
  leaver = p ? { name: p.name, today: p.sessions.filter(o => new Date(o.t).toDateString() === new Date().toDateString()).reduce((a, o) => a + o.n, 0), digits: p.digits } : null;
  db.current = null; save(); go("#bye");
});
function pageBye() {
  const note = h("p", { class: "muted", "aria-live": "polite" });
  return [h("section", { class: "panel hero" }, h("h1", {}, leaver ? "إلى اللقاء يا " + leaver.name + "!" : "إلى اللقاء!"),
      leaver && leaver.today ? h("p", {}, "عمليات اليوم في سجلك: " + leaver.today + ". ننتظرك غداً.") : h("p", {}, "ننتظرك في تدريب قادم."),
      h("p", { class: "muted" }, "خرجت من حسابك وحُفظ سجلك.")),
    h("button", { type: "button", class: "primary", onclick: () => go("#students") }, "العودة إلى اللعبة"),
    h("button", { type: "button", onclick: () => { window.close(); later(() => { note.textContent = "لإغلاق التطبيق: اسحب من أسفل الشاشة إلى الأعلى، أو اضغط زر الشاشة الرئيسية في هاتفك. وعلى الحاسوب أغلق النافذة."; }, 300); } }, "إغلاق التطبيق"), note];
}

/* ---------- التوجيه ---------- */
function render() {
  clearTimers(); hush();
  let hash = location.hash.slice(1) || "home";
  if (game && hash !== "play" && hash !== "result") { if (!game.result && game.n) { finishSilently(); } game = null; }
  if (!me() && hash !== "install" && hash !== "bye") hash = "students";
  let page;
  document.getElementById("back").hidden = !me();
  document.getElementById("exit").hidden = !me();
  if (hash === "bye") page = pageBye();
  else if (hash === "students") page = pageStudents();
  else if (hash === "install") page = pageInstall();
  else if (hash === "me") page = pageMe();
  else if (hash === "shop") page = pageShop();
  else if (hash === "classic") page = pageClassic();
  else if (hash === "play" && game && !game.result) page = pagePlay();
  else if (hash === "result" && game && game.result) page = game.free ? pageFreeResult() : pageResult();
  else if (hash.startsWith("cat-") && CATS.some(c => "cat-" + c.id === hash)) page = pageCat(CATS.find(c => "cat-" + c.id === hash));
  else if (hash.startsWith("s-") && SKILLS.some(s => s.id === hash.slice(2))) page = pageSkill(byId(hash.slice(2)));
  else page = pageHome();
  const playing = hash === "play" && !!game && !game.result;
  document.body.classList.toggle("playing", playing);
  document.getElementById("end").hidden = !playing;
  main.classList.remove("tall");
  main.replaceChildren(...page.flat(Infinity).filter(Boolean));
  if (!storageOk) main.prepend(h("p", { class: "error" }, "المتصفح يمنع الحفظ: لن يبقى سجلك بعد إغلاق الصفحة."));
  who.textContent = me() ? me().name + " · " + num(me().coins) : "";
  nav.querySelectorAll("a").forEach(a => a.toggleAttribute("aria-current", a.hash === "#" + hash));
  window.scrollTo(0, 0);
}
// مغادرة الجولة من القائمة: نحفظ ما أُنجز دون عرض صفحة النتيجة
function finishSilently() {
  const g = game, p = db.profiles[g.pid]; if (!p) return;
  if (!g.free) {
    const st = statOf(p, g.skill.id);
    st.right += g.right; st.total += g.n;
  }
  const today = new Date().toLocaleDateString("en-CA"); if (!p.days.includes(today)) p.days.push(today);
  p.sessions.unshift({ t: Date.now(), s: g.skill.id, lv: g.level, n: g.n, right: g.right, avg: Math.round(g.secs / g.n * 10) / 10, medal: 0, coins: g.coins, timed: g.timed });
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
window.__claps = () => claps;
window.__applause = applauseSamples;
if (document.fonts) document.fonts.ready.then(() => { if (game && !game.result && game.fitMin) fit(game.fitMin); });
render();
})();
