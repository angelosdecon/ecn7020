// ECN7020 interactive problem sets — shared engine.
// Each problem-set page defines window.SEMINAR (title, data, steps) and then loads this file.
// R runs in the browser through WebR, so students need no installation.

const S = window.SEMINAR;
const WEBR_URL = S.webrUrl || "https://webr.r-wasm.org/latest/webr.mjs";
const KEY = "ecn7020-" + S.id + "-";
const HINT_DELAY = S.hintDelay === undefined ? 30 : S.hintDelay; // seconds before the next hint unlocks

let webR = null;
let rReady = false;
const done = new Set();
const editors = {};
const timers = {};
const steps = S.items.filter((it) => it.type !== "section");
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
  wrap.appendChild(el("div", "progress",
    '<div class="row"><span id="progress-text"></span><button class="linkbtn" id="reset">Clear my answers</button></div>' +
    '<div class="bar"><div class="fill" id="progress-fill"></div></div>'));
  if (S.note) wrap.appendChild(el("div", "note", S.note));
  const main = el("main");
  wrap.appendChild(main);
  S.items.forEach((it) => main.appendChild(it.type === "section" ? buildSection(it) : buildStep(it)));
  wrap.appendChild(el("footer", "",
    "<span>" + esc(S.footer || S.title) + "</span>" +
    '<span><a href="' + (S.home || "../") + '">All problem sets</a></span>'));
  document.body.appendChild(wrap);
  document.getElementById("reset").addEventListener("click", () => {
    if (window.confirm("Clear all your saved answers and code for this problem set?")) {
      store.clear();
      window.location.reload();
    }
  });
  updateProgress();
}

function buildSection(it) {
  const sec = el("section", "section");
  sec.appendChild(el("div", "barmark"));
  sec.appendChild(el("div", "body",
    '<div class="eyebrow">' + esc(it.eyebrow) + "</div><h2>" + esc(it.title) + "</h2>" + (it.text || "")));
  return sec;
}

function buildStep(s) {
  const isR = s.type === "r";
  const card = el("article", "step");
  card.id = "step-" + s.n;
  const labels = isR ? ["Hint", "Functions", "Solution"] : ["Hint", "Pointers", "Model answer"];
  const lock = (lvl) => (HINT_DELAY > 0 ? ' <span class="timer" id="t' + lvl + "-" + s.n + '">' + HINT_DELAY + "s</span>" : "");
  const dis = HINT_DELAY > 0 ? " disabled" : "";
  let html =
    '<div class="step-head"><div class="step-num">' + s.n + '</div><div class="step-title">' + s.title + "</div>" +
    '<div class="step-tag">' + (isR ? "R code" : "Written") + "</div></div>" +
    '<div class="step-body"><div class="step-desc">' + s.desc + "</div>" +
    '<div class="hints">' +
    '<button class="hint-btn" id="hb1-' + s.n + '">' + labels[0] + "</button>" +
    '<button class="hint-btn" id="hb2-' + s.n + '"' + dis + ">" + labels[1] + lock(2) + "</button>" +
    '<button class="hint-btn" id="hb3-' + s.n + '"' + dis + ">" + labels[2] + lock(3) + "</button></div>" +
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
    [1, 2, 3].forEach((lvl) =>
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
  if (lvl < 3 && HINT_DELAY > 0) startTimer(n, lvl + 1);
}

function startTimer(n, lvl) {
  const key = n + "_" + lvl;
  if (timers[key]) return;
  const badge = document.getElementById("t" + lvl + "-" + n);
  const btn = document.getElementById("hb" + lvl + "-" + n);
  let left = HINT_DELAY;
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

buildPage();
startR();
