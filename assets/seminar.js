// ECN7020 interactive problem sets — shared engine.
// Each problem-set page defines window.SEMINAR (title, data, steps) and then loads this file.
// R runs in the browser through WebR, so students need no installation.

const S = window.SEMINAR;
const WEBR_URL = S.webrUrl || "https://webr.r-wasm.org/latest/webr.mjs";
const KEY = "ecn7020-" + S.id + "-";
// Seconds before a hint unlocks, counted from when the previous one is opened: [second hint, third hint].
const HINT_DELAYS = S.hintDelays || [10, 10];
const delayFor = (lvl) => HINT_DELAYS[lvl - 2] || 0;

let webR = null;
let rReady = false;
const done = new Set();
const editors = {};
const timers = {};
const steps = S.items.filter((it) => it.type === "r" || it.type === "write"); // solution and sim cards are not counted
const SHOW_PROGRESS = S.progress !== false;
const SHOW_NUMBERS = S.numbers !== false; // false: no numbered circles (used by the R guide page)
steps.forEach((s, i) => { s.n = i + 1; });

// Saved answers live only in this browser. Everything still works if storage is unavailable.
const store = {
  get(k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* ignore */ } },
  clear() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  },
};

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function esc(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPage() {
  document.title = S.title + " — ECN7020, SOAS Economics";
  const wrap = el("div", "wrap");
  wrap.appendChild(el("div", "topline",
    '<div class="brand">SOAS<span>Economics</span></div>' +
    '<div class="module">ECN7020 Statistical Methods and Machine Learning</div>'));
  const hero = el("header", "hero",
    '<div class="eyebrow">' + esc(S.eyebrow) + "</div>" +
    "<h1>" + esc(S.title) + "</h1>" +
    '<p class="lead">' + S.lead + "</p>" +
    '<div class="status" id="status" role="status"><span class="dot"></span><span id="status-text">Starting R… this can take a minute or two the first time.</span></div>');
  wrap.appendChild(hero);
  if (SHOW_PROGRESS) {
    wrap.appendChild(el("div", "progress",
      '<div class="row"><span id="progress-text"></span><button class="linkbtn" id="reset">Clear my answers</button></div>' +
      '<div class="bar"><div class="fill" id="progress-fill"></div></div>'));
  }
  if (S.note) wrap.appendChild(el("div", "note", S.note));
  if (S.items.some((it) => it.type === "solution")) wrap.appendChild(buildSolTools());
  const main = el("main");
  wrap.appendChild(main);
  S.items.forEach((it) => {
    if (it.type === "section") main.appendChild(buildSection(it));
    else if (it.type === "text") main.appendChild(buildText(it));
    else if (it.type === "solution") main.appendChild(buildSolution(it));
    else if (it.type === "sim") main.appendChild(buildSimCard(it));
    else main.appendChild(buildStep(it));
  });
  wrap.appendChild(el("footer", "",
    "<span>" + esc(S.footer || S.title) + "</span>" +
    '<span><a href="' + (S.home || "../") + '">All problem sets</a> · <a href="' + (S.guide || "../r-guide/") + '">R guide</a></span>'));
  document.body.appendChild(wrap);
  if (SHOW_PROGRESS) document.getElementById("reset").addEventListener("click", () => {
    if (window.confirm("Clear all your saved answers and code for this problem set?")) {
      store.clear();
      window.location.reload();
    }
  });
  updateProgress();
  buildQuickGuide();
  renderMath(document.body);
}

// Maths written as \( ... \) or \[ ... \] is typeset with KaTeX when the page loads it.
function renderMath(node) {
  if (window.renderMathInElement) {
    window.renderMathInElement(node, {
      delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
  }
}

// The "R quick guide" side panel. Its text is in quickguide.js, shared by every page.
async function buildQuickGuide() {
  if (S.quickGuide === false) return;
  let html;
  try {
    html = (await import("./quickguide.js?v=3")).default;
  } catch (e) {
    return; // the page works without it
  }
  const btn = el("button", "qg-open", "R quick guide");
  btn.id = "qg-open";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "qg-panel");
  const panel = el("aside", "qg-panel",
    '<button class="qg-close" id="qg-close" aria-label="Close the R quick guide">Close ✕</button>' +
    '<div class="qg-body prose">' + html +
    '<p><a href="' + (S.guide || "../r-guide/") + '" target="_blank" rel="noopener">Open the full R guide, with examples you can run</a></p></div>');
  panel.id = "qg-panel";
  panel.setAttribute("aria-label", "R quick guide");
  panel.hidden = true;
  document.body.appendChild(btn);
  document.body.appendChild(panel);
  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("qg-is-open", open);
    if (open) document.getElementById("qg-close").focus(); else btn.focus();
  };
  btn.addEventListener("click", () => setOpen(panel.hidden));
  document.getElementById("qg-close").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
}

function buildSection(it) {
  const sec = el("section", "section");
  sec.appendChild(el("div", "barmark"));
  sec.appendChild(el("div", "body",
    '<div class="eyebrow">' + esc(it.eyebrow) + "</div><h2>" + esc(it.title) + "</h2>" + (it.text || "")));
  return sec;
}

// A plain reading card: { type: "text", title, html }
function buildText(it) {
  const card = el("article", "step text");
  card.innerHTML = '<div class="step-head"><div class="step-title">' + it.title + "</div></div>" +
    '<div class="step-body prose">' + it.html + "</div>";
  return card;
}

function buildStep(s) {
  const isR = s.type === "r";
  const hasHints = s.hints !== false; // { type: "r", hints: false } is a runnable example with no hints
  const card = el("article", "step");
  card.id = "step-" + s.n;
  const labels = isR ? ["Hint", "Functions", "Solution"] : ["Hint", "Pointers", "Model answer"];
  const lock = (lvl) => (delayFor(lvl) > 0 ? ' <span class="timer" id="t' + lvl + "-" + s.n + '">' + delayFor(lvl) + "s</span>" : "");
  const dis = (lvl) => (delayFor(lvl) > 0 ? " disabled" : "");
  let html =
    '<div class="step-head">' + (SHOW_NUMBERS ? '<div class="step-num">' + s.n + "</div>" : "") + '<div class="step-title">' + s.title + "</div>" +
    '<div class="step-tag">' + (!hasHints ? "Try it" : isR ? "R code" : "Written") + "</div></div>" +
    '<div class="step-body"><div class="step-desc">' + s.desc + "</div>";
  if (hasHints) html +=
    '<div class="hints">' +
    '<button class="hint-btn" id="hb1-' + s.n + '">' + labels[0] + "</button>" +
    '<button class="hint-btn" id="hb2-' + s.n + '"' + dis(2) + ">" + labels[1] + lock(2) + "</button>" +
    '<button class="hint-btn" id="hb3-' + s.n + '"' + dis(3) + ">" + labels[2] + lock(3) + "</button></div>" +
    '<div class="hint h1" id="hc1-' + s.n + '"><span class="label">' + labels[0] + "</span>" + s.h1 + "</div>" +
    '<div class="hint h2" id="hc2-' + s.n + '"><span class="label">' + labels[1] + "</span>" + s.h2 + "</div>" +
    '<div class="hint h3" id="hc3-' + s.n + '"><span class="label">' + labels[2] + "</span>" +
    (isR ? "<pre>" + esc(s.h3) + "</pre>" + (s.h3note ? "<p>" + s.h3note + "</p>" : "") : s.h3) + "</div>";
  if (isR) {
    html +=
      '<div class="editor"><div class="editor-bar"><span>R</span>' +
      '<button class="run-btn" id="rb-' + s.n + '" disabled>&#9654; Run</button></div>' +
      '<textarea id="ta-' + s.n + '" spellcheck="false" aria-label="R code for step ' + s.n + '"></textarea></div>' +
      '<div class="output" id="out-' + s.n + '"></div><div class="plots" id="plt-' + s.n + '"></div>';
  } else {
    html +=
      '<textarea class="answer" id="ans-' + s.n + '" placeholder="Write your answer here. It is saved in this browser only." aria-label="Your answer for step ' + s.n + '"></textarea>' +
      '<label class="done-row"><input type="checkbox" id="chk-' + s.n + '"> I have answered this</label>';
  }
  html += "</div>";
  card.innerHTML = html;

  // Wire up after the card is in the document
  queueMicrotask(() => {
    if (hasHints) [1, 2, 3].forEach((lvl) =>
      document.getElementById("hb" + lvl + "-" + s.n).addEventListener("click", () => showHint(s.n, lvl)));
    if (isR) {
      const ta = document.getElementById("ta-" + s.n);
      ta.value = store.get("code-" + s.n) || s.code;
      if (window.CodeMirror) {
        const cm = window.CodeMirror.fromTextArea(ta, {
          mode: "r", lineNumbers: true, lineWrapping: true,
          extraKeys: { "Ctrl-Enter": () => runCode(s), "Cmd-Enter": () => runCode(s) },
        });
        cm.setSize(null, "auto");
        cm.on("change", () => store.set("code-" + s.n, cm.getValue()));
        editors[s.n] = { get: () => cm.getValue() };
      } else {
        ta.addEventListener("input", () => store.set("code-" + s.n, ta.value));
        ta.addEventListener("keydown", (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runCode(s); }
        });
        editors[s.n] = { get: () => ta.value };
      }
      document.getElementById("rb-" + s.n).addEventListener("click", () => runCode(s));
    } else {
      const ans = document.getElementById("ans-" + s.n);
      const chk = document.getElementById("chk-" + s.n);
      ans.value = store.get("ans-" + s.n) || "";
      ans.addEventListener("input", () => store.set("ans-" + s.n, ans.value));
      chk.checked = store.get("done-" + s.n) === "1";
      if (chk.checked) markDone(s.n, true);
      chk.addEventListener("change", () => {
        store.set("done-" + s.n, chk.checked ? "1" : "0");
        markDone(s.n, chk.checked);
      });
    }
  });
  return card;
}

function showHint(n, lvl) {
  [1, 2, 3].forEach((i) => {
    document.getElementById("hc" + i + "-" + n).classList.toggle("show", i === lvl);
    document.getElementById("hb" + i + "-" + n).classList.toggle("active", i === lvl);
  });
  if (lvl < 3 && delayFor(lvl + 1) > 0) startTimer(n, lvl + 1);
}

function startTimer(n, lvl) {
  const key = n + "_" + lvl;
  if (timers[key]) return;
  const badge = document.getElementById("t" + lvl + "-" + n);
  const btn = document.getElementById("hb" + lvl + "-" + n);
  let left = delayFor(lvl);
  timers[key] = setInterval(() => {
    left -= 1;
    if (badge) badge.textContent = left + "s";
    if (left <= 0) {
      clearInterval(timers[key]);
      btn.disabled = false;
      if (badge) badge.remove();
    }
  }, 1000);
}

function markDone(n, isDone) {
  if (isDone) done.add(n); else done.delete(n);
  document.getElementById("step-" + n).classList.toggle("done", isDone);
  updateProgress();
}

function updateProgress() {
  if (!SHOW_PROGRESS) return;
  document.getElementById("progress-fill").style.width = (done.size / steps.length) * 100 + "%";
  document.getElementById("progress-text").textContent = done.size + " of " + steps.length + " steps completed";
}

async function runCode(s) {
  if (!rReady) return;
  const out = document.getElementById("out-" + s.n);
  const plots = document.getElementById("plt-" + s.n);
  const btn = document.getElementById("rb-" + s.n);
  const code = editors[s.n].get();
  btn.disabled = true;
  btn.textContent = "Running…";
  out.className = "output show";
  out.textContent = "Running…";
  plots.innerHTML = "";
  const size = s.plot || { width: 640, height: 440 };
  const shelter = await new webR.Shelter();
  try {
    const result = await shelter.captureR(code, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: false,
      captureGraphics: { width: size.width, height: size.height, pointsize: size.pointsize || 15 },
    });
    const text = result.output
      .filter((o) => o.type === "stdout" || o.type === "stderr")
      .map((o) => o.data)
      .join("\n");
    const failed = result.output.some((o) => o.type === "stderr" && /^Error/.test(o.data));
    out.textContent = text.trim() ? text : "(No text output. If you stored a result, type its name on a new line to print it.)";
    if (failed) out.className = "output show err";
    (result.images || []).forEach((img) => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.style.width = size.width + "px";
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Plot produced by your code in step " + s.n);
      plots.appendChild(canvas);
    });
    if (!failed) markDone(s.n, true);
  } catch (err) {
    out.className = "output show err";
    out.textContent = "Error: " + err.message;
  } finally {
    await shelter.purge();
    btn.disabled = false;
    btn.innerHTML = "&#9654; Run";
  }
}

async function startR() {
  const box = document.getElementById("status");
  const text = document.getElementById("status-text");
  try {
    const { WebR } = await import(WEBR_URL);
    webR = new WebR(S.webrOptions || {});
    await webR.init();
    const pkgs = S.packages || [];
    for (let i = 0; i < pkgs.length; i++) {
      text.textContent = "Installing " + pkgs[i] + " (" + (i + 1) + " of " + pkgs.length + ")…";
      await webR.installPackages([pkgs[i]], { quiet: true });
    }
    text.textContent = "Loading the data…";
    await webR.evalRVoid(S.setup || "invisible(NULL)");
    rReady = true;
    box.className = "status ready";
    text.textContent = S.readyText || "R is ready. Click Run on any R step.";
    steps.filter((s) => s.type === "r").forEach((s) => { document.getElementById("rb-" + s.n).disabled = false; });
  } catch (err) {
    box.className = "status error";
    text.textContent = "R could not start (" + err.message + "). Reload the page, or use RStudio instead.";
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Worked solutions revealed one step at a time:
// { type: "solution", label: "1(a)", title, question, steps: [{ k: "Name the events", b: html }], sim: {...} }
// Click a solution box, then Next step, the right arrow or Page Down (a presentation clicker) reveals the next step.
// ---------------------------------------------------------------------------
const sols = [];
let activeSol = null;

function buildSolTools() {
  const bar = el("div", "soltools",
    '<button class="tool-btn" id="present-btn" aria-pressed="false">Presentation mode</button>' +
    '<button class="tool-btn" id="showall-btn">Show all solutions</button>' +
    '<button class="tool-btn" id="hideall-btn">Hide all solutions</button>' +
    '<span class="soltools-tip">Click a solution box, then press <kbd>→</kbd> or <kbd>Page Down</kbd> for the next step and <kbd>←</kbd> to go back.</span>');
  queueMicrotask(() => {
    const pb = document.getElementById("present-btn");
    pb.addEventListener("click", () => {
      const on = !document.body.classList.contains("present");
      document.body.classList.toggle("present", on);
      pb.setAttribute("aria-pressed", String(on));
      pb.textContent = on ? "Leave presentation mode" : "Presentation mode";
      sims.forEach((sm) => sm.resize());
    });
    document.getElementById("showall-btn").addEventListener("click", () => sols.forEach((so) => so.show(so.n)));
    document.getElementById("hideall-btn").addEventListener("click", () => sols.forEach((so) => so.show(0)));
  });
  return bar;
}

function buildSolution(it) {
  const k = sols.length;
  const card = el("article", "step sol");
  card.id = "sol-" + k;
  const n = it.steps.length;
  let html =
    '<div class="step-head">' + (it.label ? '<div class="sol-label">' + it.label + "</div>" : "") +
    '<div class="step-title">' + (it.title || "") + "</div>" +
    '<div class="step-tag">' + (it.tag || "Solution") + "</div></div>" +
    '<div class="step-body"><div class="sol-q">' + it.question + "</div>" +
    '<div class="sol-box" tabindex="0" id="solbox-' + k + '" aria-label="Solution to ' + (it.label || it.title || "") + '">' +
    '<div class="sol-bar"><span class="sol-count" id="solc-' + k + '">' + "0 of " + n + " steps shown</span>" +
    '<span class="sol-btns"><button class="sol-btn next" id="soln-' + k + '">Next step ▸</button>' +
    '<button class="sol-btn" id="sola-' + k + '">Show all</button>' +
    '<button class="sol-btn" id="solr-' + k + '">Hide</button></span></div>' +
    '<ol class="sol-steps" aria-live="polite">';
  it.steps.forEach((st, i) => {
    html += '<li class="sol-step" id="sols-' + k + "-" + i + '"><div class="sol-k">' + (i + 1) + (st.k ? " · " + st.k : "") + "</div>" +
      '<div class="sol-b">' + st.b + "</div></li>";
  });
  html += "</ol></div>";
  if (it.sim) html += '<button class="sim-open" id="simo-' + k + '" aria-expanded="false">▶ ' + (it.sim.button || "Check it by simulation") + "</button>" +
    '<div class="sim-holder" id="simh-' + k + '" hidden></div>';
  html += "</div>";
  card.innerHTML = html;
  const so = { k, n, shown: 0 };
  so.show = (m) => {
    so.shown = Math.max(0, Math.min(n, m));
    for (let i = 0; i < n; i++) document.getElementById("sols-" + k + "-" + i).classList.toggle("show", i < so.shown);
    document.getElementById("solc-" + k).textContent = so.shown + " of " + n + " steps shown";
    const nb = document.getElementById("soln-" + k);
    nb.disabled = so.shown >= n;
    nb.textContent = so.shown === 0 ? "Show step 1 ▸" : so.shown >= n ? "All steps shown" : "Next step ▸";
    card.classList.toggle("complete", so.shown >= n);
  };
  so.step = (d) => {
    so.show(so.shown + d);
    if (d > 0 && so.shown > 0) {
      const li = document.getElementById("sols-" + k + "-" + (so.shown - 1));
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };
  sols.push(so);
  queueMicrotask(() => {
    const box = document.getElementById("solbox-" + k);
    const activate = () => { if (activeSol !== so) { if (activeSol) activeSol.box.classList.remove("active"); activeSol = so; box.classList.add("active"); } };
    so.box = box;
    box.addEventListener("focus", activate);
    box.addEventListener("click", activate);
    document.getElementById("soln-" + k).addEventListener("click", (e) => { e.stopPropagation(); activate(); so.step(1); box.focus({ preventScroll: true }); });
    document.getElementById("sola-" + k).addEventListener("click", (e) => { e.stopPropagation(); activate(); so.show(n); });
    document.getElementById("solr-" + k).addEventListener("click", (e) => { e.stopPropagation(); activate(); so.show(0); });
    so.show(0);
    if (it.sim) {
      const ob = document.getElementById("simo-" + k);
      const holder = document.getElementById("simh-" + k);
      let built = false;
      ob.addEventListener("click", () => {
        const open = holder.hidden;
        holder.hidden = !open;
        ob.setAttribute("aria-expanded", String(open));
        ob.textContent = (open ? "▼ " : "▶ ") + (it.sim.button || "Check it by simulation");
        if (open && !built) { holder.appendChild(buildSim(it.sim)); built = true; }
      });
    }
  });
  return card;
}

document.addEventListener("keydown", (e) => {
  if (!activeSol) return;
  const t = e.target;
  if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || (t.closest && t.closest(".CodeMirror")))) return;
  if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && t === activeSol.box)) { e.preventDefault(); activeSol.step(1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); activeSol.step(-1); }
});

// ---------------------------------------------------------------------------
// Live simulation: draw again and again, and watch the running share settle on the true probability.
// sim spec: { title, intro, target, targetLabel, xLabel, yLabel, maxDraws, tol, yRange: [lo, hi],
//             mode: "share" (default) or "mean", draw: () => ({ in: true/false, hit: true/false }) or ({ value }),
//             legend: { hit, miss, out }, condLabel }
// ---------------------------------------------------------------------------
const sims = [];

function buildSimCard(it) {
  const card = el("article", "step");
  card.innerHTML = '<div class="step-head"><div class="step-title">' + it.title + '</div><div class="step-tag">Simulation</div></div><div class="step-body"></div>';
  card.querySelector(".step-body").appendChild(buildSim(it));
  return card;
}

function fmt(v, d) { return v === null || isNaN(v) ? "–" : (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
function fmtInt(v) { return v.toLocaleString("en-GB"); }

function buildSim(sp) {
  const mean = sp.mode === "mean";
  const dec = sp.decimals !== undefined ? sp.decimals : (mean ? 1 : 3);
  const tol = sp.tol !== undefined ? sp.tol : (mean ? 1 : 0.01);
  const maxN = sp.maxDraws || 10000;
  const yr = sp.yRange || [0, 1];
  const box = el("div", "sim");
  box.innerHTML =
    (sp.intro ? '<div class="sim-intro">' + sp.intro + "</div>" : "") +
    '<div class="sim-controls">' +
    '<button class="sim-btn go">▶ Start</button><button class="sim-btn reset">↺ New run</button>' +
    '<label class="sim-speed">Speed <select><option value="0.012">Slow</option><option value="0.03" selected>Normal</option><option value="0.12">Fast</option></select></label></div>' +
    '<div class="sim-stats">' +
    '<div><span class="sl">Draws</span><span class="sv s-n">0</span></div>' +
    (sp.condLabel ? '<div><span class="sl">' + sp.condLabel + '</span><span class="sv s-c">0</span></div>' : "") +
    '<div><span class="sl">Simulated</span><span class="sv s-est">–</span></div>' +
    '<div><span class="sl">' + (sp.targetLabel || "Exact answer") + '</span><span class="sv s-t">' + fmt(sp.target, dec) + "</span></div>" +
    '<div><span class="sl">Gap</span><span class="sv s-gap">–</span></div></div>' +
    '<div class="sim-canvas"><canvas role="img" aria-label="Running ' + (mean ? "average" : "share") + ' against the number of draws"></canvas></div>' +
    (mean ? '<div class="sim-last">Last draws: <span class="s-last">–</span></div>'
      : '<div class="sim-strip" aria-hidden="true"></div><div class="sim-legend">' +
        '<span><i class="hit"></i>' + ((sp.legend && sp.legend.hit) || "Event happens") + "</span>" +
        '<span><i class="miss"></i>' + ((sp.legend && sp.legend.miss) || "Event does not happen") + "</span>" +
        (sp.legend && sp.legend.out ? '<span><i class="out"></i>' + sp.legend.out + "</span>" : "") + "</div>") +
    '<div class="sim-msg" aria-live="polite">Press Start. The dashed orange line is the exact answer; the green band is ±' + fmt(tol, mean ? 1 : (tol < 0.01 ? 3 : 2)) + " around it.</div>";
  const canvas = box.querySelector("canvas");
  const q = (c) => box.querySelector(c);
  let st, raf = null, running = false, acc = 0;
  function reset() {
    st = { n: 0, c: 0, h: 0, sum: 0, est: null, lastOut: 0, xs: [], ys: [], strip: [], last: [] };
    acc = 0; update(); draw();
    q(".sim-msg").textContent = "Press Start. The dashed orange line is the exact answer; the green band is ±" + fmt(tol, mean ? 1 : (tol < 0.01 ? 3 : 2)) + " around it.";
  }
  function one() {
    const r = sp.draw();
    st.n += 1;
    if (mean) { st.c += 1; st.sum += r.value; st.est = st.sum / st.c; st.last.push(r.value); if (st.last.length > 8) st.last.shift(); }
    else {
      const inside = r.in !== false;
      if (inside) { st.c += 1; if (r.hit) st.h += 1; st.est = st.h / st.c; }
      st.strip.push(inside ? (r.hit ? "hit" : "miss") : "out"); if (st.strip.length > 48) st.strip.shift();
    }
    if (st.est === null || Math.abs(st.est - sp.target) > tol) st.lastOut = st.n;
    if (st.est !== null) { st.xs.push(st.n); st.ys.push(st.est); }
  }
  function update() {
    q(".s-n").textContent = fmtInt(st.n);
    if (q(".s-c")) q(".s-c").textContent = fmtInt(st.c);
    q(".s-est").textContent = fmt(st.est, dec);
    q(".s-gap").textContent = st.est === null ? "–" : fmt(Math.abs(st.est - sp.target), dec);
    if (mean) q(".s-last").textContent = st.last.length ? st.last.map((v) => (v > 0 ? "+" : "") + v).join(", ") : "–";
    else q(".sim-strip").innerHTML = st.strip.map((c) => '<i class="' + c + '"></i>').join("");
  }
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 600, H = canvas.clientHeight || 280;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const fs = document.body.classList.contains("present") ? 15 : 12;
    const L = 58, R = 34, T = 14, B = 42, pw = W - L - R, ph = H - T - B;
    const X = (n) => L + (Math.log10(n) / Math.log10(maxN)) * pw;
    const Y = (v) => T + (1 - (Math.min(Math.max(v, yr[0]), yr[1]) - yr[0]) / (yr[1] - yr[0])) * ph;
    g.font = fs + "px Arial"; g.fillStyle = "#555"; g.strokeStyle = "#E3E3E3"; g.lineWidth = 1;
    const yt = sp.yTicks || [0, 0.25, 0.5, 0.75, 1];
    g.textAlign = "right"; g.textBaseline = "middle";
    yt.forEach((v) => { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(L + pw, Y(v)); g.stroke(); g.fillText(String(v), L - 8, Y(v)); });
    g.textAlign = "center"; g.textBaseline = "top";
    for (let p = 1; p <= maxN; p *= 10) { g.beginPath(); g.moveTo(X(p), T); g.lineTo(X(p), T + ph); g.stroke(); g.fillText(fmtInt(p), X(p), T + ph + 6); }
    g.fillText(sp.xLabel || "Number of draws (log scale)", L + pw / 2, T + ph + 22);
    g.save(); g.translate(14, T + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = "middle"; g.fillText(sp.yLabel || (mean ? "Running average" : "Running share"), 0, 0); g.restore();
    g.fillStyle = "rgba(60,110,47,0.28)";
    g.fillRect(L, Y(sp.target + tol), pw, Y(sp.target - tol) - Y(sp.target + tol));
    g.strokeStyle = "#E36533"; g.lineWidth = 2; g.setLineDash([7, 5]);
    g.beginPath(); g.moveTo(L, Y(sp.target)); g.lineTo(L + pw, Y(sp.target)); g.stroke(); g.setLineDash([]);
    if (st.xs.length) {
      g.strokeStyle = "#2A5A88"; g.lineWidth = 2; g.beginPath();
      let px = -1;
      for (let i = 0; i < st.xs.length; i++) {
        const x = X(st.xs[i]);
        if (i > 0 && x - px < 0.5 && i < st.xs.length - 1) continue;
        if (px < 0) g.moveTo(x, Y(st.ys[i])); else g.lineTo(x, Y(st.ys[i]));
        px = x;
      }
      g.stroke();
      const lx = X(st.xs[st.xs.length - 1]), ly = Y(st.ys[st.ys.length - 1]);
      g.fillStyle = "#2A5A88"; g.beginPath(); g.arc(lx, ly, 4, 0, 2 * Math.PI); g.fill();
    }
  }
  function frame() {
    if (!running) return;
    const rate = parseFloat(q(".sim-speed select").value);
    acc += Math.max(rate * 8, st.n * rate);
    let k = Math.floor(acc); acc -= k;
    while (k-- > 0 && st.n < maxN) one();
    update(); draw();
    if (st.n >= maxN) { stop(true); return; }
    raf = requestAnimationFrame(frame);
  }
  function stop(finished) {
    running = false; if (raf) cancelAnimationFrame(raf);
    q(".go").textContent = finished ? "▶ Start" : "▶ Resume";
    if (finished) {
      const settled = st.lastOut < st.n ? "It came inside the band for good after " + fmtInt(st.lastOut + 1) + " draws." : "It was still outside the band at the end.";
      q(".sim-msg").innerHTML = "After " + fmtInt(st.n) + " draws the simulated " + (mean ? "average" : "share") + " is <b>" + fmt(st.est, dec) +
        "</b>, against the exact " + fmt(sp.target, dec) + ". " + settled + " Press <b>New run</b> to see how much this varies.";
      q(".go").disabled = true;
    }
  }
  q(".go").addEventListener("click", () => {
    if (running) { stop(false); return; }
    running = true; q(".go").textContent = "⏸ Pause";
    q(".sim-msg").textContent = "Drawing… early on each draw moves the line a lot; later it hardly moves.";
    raf = requestAnimationFrame(frame);
  });
  q(".reset").addEventListener("click", () => { stop(false); q(".go").disabled = false; q(".go").textContent = "▶ Start"; reset(); });
  const sm = { resize: () => draw() };
  sims.push(sm);
  window.addEventListener("resize", () => draw());
  queueMicrotask(() => { reset(); renderMath(box); });
  return box;
}

buildPage();
if (steps.some((s) => s.type === "r")) startR();
else { const b = document.getElementById("status"); if (b) b.remove(); }
