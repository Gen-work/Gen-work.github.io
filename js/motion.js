/* genn.work — Anime.js 动效层；内容和导航不依赖动效加载成功。 */
(function () {
  "use strict";
  if (!window.anime || !window.matchMedia) return;

  var animate = window.anime.animate;
  var stagger = window.anime.stagger;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var disabled = false;
  try { disabled = localStorage.getItem("genwork-motion") === "off"; } catch (e) { /* 存储不可用时跟随系统 */ }
  var enabled = false;
  var animations = new Map();
  var observers = [];
  var button;
  var labels = {
    en: { on: "Motion on", off: "Motion off", system: "Motion off · system" },
    zh: { on: "动效开启", off: "动效关闭", system: "动效关闭 · 跟随系统" },
    ja: { on: "動きあり", off: "動きなし", system: "動きなし · システム設定" }
  };

  // 同一元素只保留一个实例，快速反复操作不会叠加动画。
  function play(target, options) {
    var previous = animations.get(target);
    if (previous) previous.revert();
    var animation = animate(target, options);
    animations.set(target, animation);
    return animation;
  }

  function renderControl() {
    var lang = window.GENWORK ? window.GENWORK.getLang() : "en";
    var text = labels[lang] || labels.en;
    button.textContent = reduced.matches ? text.system : enabled ? text.on : text.off;
    button.setAttribute("aria-pressed", String(enabled));
    button.disabled = reduced.matches;
  }

  function stop() {
    observers.forEach(function (observer) { observer.revert(); });
    observers = [];
    animations.forEach(function (animation) { animation.revert(); });
    animations.clear();
    document.body.classList.remove("motion-enabled");
  }

  function enterHome() {
    var title = document.querySelectorAll(".hello > span");
    if (!title.length) return;
    play(title, { opacity: [0, 1], y: [18, 0], delay: stagger(100), duration: 780, ease: "outExpo" });
    play(document.querySelectorAll(".welcome-text"), {
      opacity: [0, 1], y: [8, 0], delay: stagger(90, { start: 280 }), duration: 600, ease: "outCubic"
    });
    play(document.querySelector(".ring-logo"), {
      opacity: [0, 1], scale: [0.88, 1], rotate: [-12, 0], delay: 420, duration: 950, ease: "outExpo"
    });
    // 保留原来的点线弧，只用遮罩揭示它，不把点线改成实线。
    var reveal = document.querySelector("#ring-reveal");
    if (reveal) play(reveal, { strokeDashoffset: [200, 0], delay: 540, duration: 1100, ease: "inOutCubic" });
    play(document.querySelectorAll(".ring-lang"), {
      opacity: [0, 1], y: [10, 0], delay: stagger(120, { start: 650 }), duration: 650, ease: "outExpo"
    });
    play(document.querySelectorAll(".welcome-nav a"), {
      opacity: [0, 1], y: [8, 0], delay: stagger(65, { start: 800 }), duration: 550, ease: "outCubic"
    });
  }

  function start() {
    stop();
    enabled = !disabled && !reduced.matches;
    renderControl();
    if (!enabled) return;
    document.body.classList.add("motion-enabled");
    enterHome();
    var heading = document.querySelector(".page-head");
    if (heading) play(heading, { opacity: [0, 1], y: [12, 0], duration: 650, ease: "outCubic" });
    // 到达视口才显现一次；不预先隐藏正文，锚点跳转也始终可读。
    document.querySelectorAll(".project, .timeline li, main .grid > .card, .embed").forEach(function (element) {
      observers.push(window.anime.onScroll({
        target: element, enter: "bottom-=32 top", repeat: false,
        onEnter: function () {
          play(element, { opacity: [0, 1], y: [16, 0], duration: 650, ease: "outCubic" });
        }
      }));
    });
  }

  function boot() {
    button = document.createElement("button");
    button.type = "button";
    button.className = "motion-toggle";
    (document.querySelector(".welcome-main") || document.querySelector(".site-footer .wrap") || document.body).appendChild(button);
    button.addEventListener("click", function () {
      disabled = !disabled;
      try { localStorage.setItem("genwork-motion", disabled ? "off" : "on"); } catch (e) { /* 不妨碍切换 */ }
      start();
    });
    document.addEventListener("genwork:lang", function () {
      renderControl();
      if (!enabled) return;
      var active = document.querySelector(".ring-lang[aria-pressed=true] .mark");
      if (active) play(active, { scale: [0.85, 1], duration: 430, ease: "outBack" });
    });
    document.addEventListener("genwork:tab", function (event) {
      if (enabled) play(event.detail.panel, { opacity: [0, 1], y: [8, 0], duration: 380, ease: "outCubic" });
    });
    function feedback(event, entering) {
      if (!enabled || (event.type.indexOf("pointer") === 0 && (!finePointer.matches || event.pointerType === "touch"))) return;
      var target = event.target.closest(".welcome-nav a, .ring-lang .mark, .btn, .nav a");
      if (!target || (event.relatedTarget && target.contains(event.relatedTarget))) return;
      play(target, { y: entering ? -3 : 0, duration: entering ? 240 : 360, ease: "outCubic" });
    }
    document.addEventListener("pointerover", function (e) { feedback(e, true); });
    document.addEventListener("pointerout", function (e) { feedback(e, false); });
    document.addEventListener("focusin", function (e) { feedback(e, true); });
    document.addEventListener("focusout", function (e) { feedback(e, false); });
    if (reduced.addEventListener) reduced.addEventListener("change", start);
    else reduced.addListener(start);
    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", function (event) { if (event.persisted) start(); });
    start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
