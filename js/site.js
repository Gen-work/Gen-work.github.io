/* genn.work — 站点脚本
   职责:语言切换(i18n)、导航当前页高亮、About 标签页、
        第三方嵌入的「点击再加载」、联系页二维码弹窗、Work 页两个小 demo。
   不依赖任何库。 */
(function () {
  "use strict";

  var DICT = window.GENWORK_I18N || { en: {} };
  var SUPPORTED = ["zh", "ja", "en"];
  var STORAGE_KEY = "genwork-lang";
  var HTML_LANG = { zh: "zh-Hans", ja: "ja", en: "en" };

  /* ---------- 语言:检测 ---------- */
  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function writeStored(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* 隐私模式等情况下忽略 */ }
  }
  function fromBrowser() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i]).toLowerCase().split("-")[0];
      if (SUPPORTED.indexOf(code) !== -1) return code;
    }
    return "en"; // 不支持的语言回退到英文
  }
  function detectLang() {
    var q = null;
    try { q = new URLSearchParams(location.search).get("lang"); } catch (e) { /* 旧浏览器 */ }
    if (q && SUPPORTED.indexOf(q) !== -1) return q;
    var stored = readStored();
    if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    return fromBrowser();
  }

  /* ---------- 语言:查找与应用 ---------- */
  var current = "en";
  function t(key, lang) {
    lang = lang || current;
    var table = DICT[lang] || {};
    if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    if (Object.prototype.hasOwnProperty.call(DICT.en, key)) return DICT.en[key]; // 缺翻译时回退到英文
    return key; // 连英文都没有:显示键名,便于发现
  }

  function applyLang(lang, persist) {
    if (SUPPORTED.indexOf(lang) === -1) lang = "en";
    current = lang;
    document.documentElement.lang = HTML_LANG[lang];
    if (persist) writeStored(lang);

    var nodes, i, el;
    nodes = document.querySelectorAll("[data-i18n]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      el.textContent = t(el.getAttribute("data-i18n"));
    }
    nodes = document.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    }
    // data-i18n-attr="title:key;aria-label:key2"
    nodes = document.querySelectorAll("[data-i18n-attr]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      var pairs = el.getAttribute("data-i18n-attr").split(";");
      for (var p = 0; p < pairs.length; p++) {
        var kv = pairs[p].split(":");
        if (kv.length === 2) el.setAttribute(kv[0].trim(), t(kv[1].trim()));
      }
    }
    var buttons = document.querySelectorAll("button[data-lang]");
    for (i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var on = b.getAttribute("data-lang") === lang;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
    document.dispatchEvent(new CustomEvent("genwork:lang", { detail: { lang: lang } }));
  }

  function initLangSwitch() {
    var buttons = document.querySelectorAll("button[data-lang]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        applyLang(this.getAttribute("data-lang"), true);
      });
    }
  }

  /* ---------- 导航:当前页 ---------- */
  function initNav() {
    var page = document.body.getAttribute("data-page");
    if (!page) return;
    var links = document.querySelectorAll(".nav a[data-nav]");
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute("data-nav") === page) links[i].setAttribute("aria-current", "page");
    }
  }

  /* ---------- About:标签页(支持 #now / #training 深链接与方向键) ---------- */
  function initTabs() {
    var list = document.querySelector("[role=tablist]");
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll("[role=tab]"));
    function select(tab, focus) {
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(x.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      var hash = tab.getAttribute("data-hash");
      if (hash && history.replaceState) history.replaceState(null, "", "#" + hash);
    }
    tabs.forEach(function (tab, idx) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    function fromHash() {
      var h = location.hash.replace("#", "");
      var match = tabs.filter(function (x) { return x.getAttribute("data-hash") === h; })[0];
      select(match || tabs[0], false);
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* ---------- 嵌入:点击再加载(省流量、减少第三方请求) ---------- */
  function initEmbeds() {
    var boxes = document.querySelectorAll(".embed[data-src]");
    for (var i = 0; i < boxes.length; i++) {
      (function (box) {
        var btn = box.querySelector("button[data-load]");
        if (!btn) return;
        btn.addEventListener("click", function () {
          var iframe = document.createElement("iframe");
          iframe.src = box.getAttribute("data-src");
          iframe.title = t(box.getAttribute("data-title-key") || "hobby.embed.title.video");
          iframe.loading = "lazy";
          iframe.setAttribute("allowfullscreen", "");
          iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
          iframe.setAttribute("allow", "fullscreen; picture-in-picture");
          var facade = box.querySelector(".facade");
          if (facade) facade.remove();
          box.appendChild(iframe);
          iframe.focus();
        });
      })(boxes[i]);
    }
  }

  /* ---------- Contact:二维码弹窗 ---------- */
  function initQr() {
    var dlg = document.getElementById("qr-dialog");
    var open = document.getElementById("qr-open");
    if (!dlg || !open) return;
    open.addEventListener("click", function () {
      if (typeof dlg.showModal === "function") dlg.showModal();
      else window.open(dlg.querySelector("img").src, "_blank", "noopener"); // 没有 <dialog> 的老浏览器
    });
    var close = dlg.querySelector("[data-close]");
    if (close) close.addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); // 点背景关闭
  }

  /* ---------- Demo 1:Claude Usage Monitor 的光晕(模拟) ---------- */
  function initHaloDemo() {
    var root = document.getElementById("demo-halo");
    if (!root) return;
    var range = root.querySelector("#halo-range");
    var typing = root.querySelector("#halo-typing");
    var dark = root.querySelector("#halo-dark");
    var stage = root.querySelector(".halo-stage");
    var composer = root.querySelector(".composer");
    var text = root.querySelector(".composer .text");
    var meta = root.querySelector(".composer .meta");
    var pctOut = root.querySelector("#halo-pct");
    var resetAt = Date.now() + (2 * 60 + 10) * 60 * 1000; // 模拟:2 小时 10 分后重置

    function colorFor(pct) { // 100% 绿 → 0% 红,中间走黄
      var hue = Math.round(140 * (pct / 100));
      return "hsl(" + hue + " 70% 45%)";
    }
    function estimateTokens(s) { // 与扩展 README 一致的粗略规则
      var cjk = (s.match(/[　-鿿가-힯＀-￯]/g) || []).length;
      var rest = s.length - cjk;
      return Math.max(1, Math.round(cjk * 1.3 + rest / 4));
    }
    function fmtCountdown() {
      var ms = Math.max(0, resetAt - Date.now());
      var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
      return h + "h " + (m < 10 ? "0" : "") + m + "m";
    }
    function render() {
      var pct = Number(range.value);
      var on = typing.checked;
      composer.style.setProperty("--halo", colorFor(pct));
      composer.style.setProperty("--fill", pct + "%");
      composer.style.boxShadow = on
        ? "0 0 0 1px var(--halo), 0 0 28px 6px var(--halo)"
        : "0 0 0 1px var(--halo), 0 0 12px 1px var(--halo)";
      stage.classList.toggle("dark", dark.checked);
      pctOut.textContent = pct + "%";
      var sample = t("work.cum.demo.sample");
      text.textContent = on ? sample : t("work.cum.demo.placeholder");
      meta.textContent = on
        ? t("work.cum.demo.resets") + " " + fmtCountdown() + " · ≈ " + estimateTokens(sample) + " " + t("work.cum.demo.tokens")
        : "";
    }
    range.addEventListener("input", render);
    typing.addEventListener("change", render);
    dark.addEventListener("change", render);
    document.addEventListener("genwork:lang", render);
    setInterval(function () { if (typing.checked) render(); }, 30000);
    render();
  }

  /* ---------- Demo 2:Commute Calibrator 的校准循环(模拟) ---------- */
  function initCalibDemo() {
    var root = document.getElementById("demo-calib");
    if (!root) return;
    var DEFAULT = [12, 12];
    var TRAIN = 7 * 60 + 37; // 07:37,分钟数
    // 模拟观测值:按情境预设的序列,循环取用。不是真实数据。
    var SIM = {
      alone: [14, 13, 15, 14, 16, 13],
      with: [17, 16, 18, 19, 17, 16],
      shop: [19, 21, 20, 22, 19, 21]
    };
    var state;
    function reset() {
      state = { ctx: "alone", samples: { alone: [], with: [], shop: [] }, cursor: { alone: 0, with: 0, shop: 0 }, model: { range: DEFAULT.slice(), source: "default" }, proposal: null, dismissed: {} };
      render();
    }
    var ctxSel = root.querySelector("#calib-ctx");
    var tapBtn = root.querySelector("#calib-tap");
    var resetBtn = root.querySelector("#calib-reset");
    var samplesEl = root.querySelector("#calib-samples");
    var modelEl = root.querySelector("#calib-model");
    var modelSrc = root.querySelector("#calib-model-src");
    var planEl = root.querySelector("#calib-plan");
    var propBox = root.querySelector("#calib-proposal");
    var propRange = root.querySelector("#calib-proposal-range");
    var applyBtn = root.querySelector("#calib-apply");
    var keepBtn = root.querySelector("#calib-keep");

    function hhmm(min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
    function rangeOf(arr) { return [Math.min.apply(null, arr), Math.max.apply(null, arr)]; }
    function render() {
      var ctx = state.ctx;
      var arr = state.samples[ctx];
      samplesEl.innerHTML = "";
      if (!arr.length) {
        samplesEl.textContent = t("work.commute.demo.none");
      } else {
        arr.forEach(function (v) { var s = document.createElement("span"); s.textContent = v + " " + t("work.commute.demo.min"); samplesEl.appendChild(s); });
        var n = document.createElement("span"); n.className = "muted"; n.style.border = "0"; n.style.background = "transparent";
        var r = rangeOf(arr); n.textContent = r[0] + "–" + r[1] + " " + t("work.commute.demo.min") + " · " + arr.length + " " + t("work.commute.demo.n");
        samplesEl.appendChild(n);
      }
      var mr = state.model.range;
      modelEl.textContent = mr[0] + "–" + mr[1] + " " + t("work.commute.demo.min");
      modelSrc.textContent = state.model.source === "default" ? t("work.commute.demo.default") : t("work.commute.demo.applied");
      planEl.textContent = t("work.commute.demo.leave") + " " + hhmm(TRAIN - mr[1]) + "–" + hhmm(TRAIN - mr[0]);
      // 同一情境累积 3 个样本后提出建议;只提议,不自动生效
      var pr = state.proposal;
      if (pr && pr.ctx === ctx) {
        propBox.hidden = false;
        propRange.textContent = pr.range[0] + "–" + pr.range[1] + " " + t("work.commute.demo.min") + " (" + ctxLabel(ctx) + ")";
      } else {
        propBox.hidden = true;
      }
    }
    function ctxLabel(c) { return t("work.commute.demo.ctx." + c); }
    ctxSel.addEventListener("change", function () { state.ctx = ctxSel.value; render(); });
    tapBtn.addEventListener("click", function () {
      var ctx = state.ctx, seq = SIM[ctx];
      var v = seq[state.cursor[ctx] % seq.length];
      state.cursor[ctx]++;
      state.samples[ctx].push(v);
      // 同一情境累积 3 个样本后提出建议;被拒绝过的话,再多一个样本才会重新提议
      if (state.samples[ctx].length >= 3 && state.samples[ctx].length !== state.dismissed[ctx]) {
        state.proposal = { ctx: ctx, range: rangeOf(state.samples[ctx]) };
      }
      render();
    });
    applyBtn.addEventListener("click", function () {
      if (!state.proposal) return;
      state.model = { range: state.proposal.range.slice(), source: "measured" };
      state.proposal = null;
      render();
    });
    keepBtn.addEventListener("click", function () {
      if (!state.proposal) return;
      state.dismissed[state.proposal.ctx] = state.samples[state.proposal.ctx].length;
      state.proposal = null;
      render();
    });
    resetBtn.addEventListener("click", reset);
    document.addEventListener("genwork:lang", render);
    reset();
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initLangSwitch();
    initNav();
    initTabs();
    initEmbeds();
    initQr();
    initHaloDemo();
    initCalibDemo();
    applyLang(detectLang(), false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.GENWORK = { t: t, setLang: function (l) { applyLang(l, true); }, getLang: function () { return current; } };
})();
