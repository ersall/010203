(function () {
  "use strict";

  var overlay = null;
  var countdownEl = null;
  var viewing = false;
  var fingerDown = false;
  var pressStart = 0;
  var secureMode = false;
  var tapCount = 0;
  var tapResetTimer = null;
  var adsHoldTimer = null;
  var viewTimer = null;
  var pressViewTimer = null;
  var countdownRunning = false;

  var VIEW_HOLD_MS = 160;
  var VIEW_MAX_MS = 3200;
  var CLOSE_FADE_MS = 580;
  var COUNTDOWN_MS = 5000;
  var DISABLE_ANIM_MS = 1300;
  var ADS_LONG_PRESS_MS = 650;
  var SKIP_PAGES = /\/(bind|admin)\.html$/i;
  var STORAGE_KEY = "kaspi_secure_active";

  function isEditable(el) {
    return el && el.closest && el.closest("input, textarea, select, [contenteditable='true']");
  }

  function isAdsToggle(el) {
    return el && el.closest && el.closest("#secureToggleBtn");
  }

  function clearSelection() {
    try {
      var sel = window.getSelection && window.getSelection();
      if (sel && sel.rangeCount) sel.removeAllRanges();
    } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById("anti-capture-style")) return;
    var s = document.createElement("style");
    s.id = "anti-capture-style";
    s.textContent =
      "html,body{background:#fff!important;transition:background-color .55s ease}" +
      "#antiCaptureScreen{" +
      "position:fixed;inset:0;z-index:2147483646;background:#000;" +
      "opacity:1;visibility:visible;pointer-events:auto;" +
      "transition:opacity .55s ease-in;" +
      "-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}" +
      "#antiCaptureScreen.viewing{" +
      "opacity:0;pointer-events:none;transition:opacity .22s ease-out}" +
      ".secure-countdown{" +
      "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;background:rgba(255,255,255,.94);" +
      "opacity:0;visibility:hidden;transition:opacity .25s ease;" +
      "-webkit-user-select:none;user-select:none}" +
      ".secure-countdown.show{opacity:1;visibility:visible}" +
      ".secure-countdown .sc-ring{" +
      "width:120px;height:120px;border-radius:50%;border:3px solid rgba(241,70,53,.25);" +
      "display:flex;align-items:center;justify-content:center;" +
      "animation:scRingPulse 1s ease infinite}" +
      ".secure-countdown .sc-num{" +
      "font:700 64px/1 system-ui,-apple-system,sans-serif;color:#f14635;" +
      "animation:scPop .75s cubic-bezier(.2,.9,.2,1) forwards}" +
      ".secure-countdown .sc-label{" +
      "margin-top:22px;font:500 15px/1.35 system-ui,-apple-system,sans-serif;color:#8a8a8e;" +
      "animation:scFadeUp .5s .15s ease forwards}" +
      ".secure-countdown .sc-bar{" +
      "width:min(280px,70vw);height:4px;background:#eceef2;border-radius:99px;" +
      "margin-top:28px;overflow:hidden;animation:scFadeUp .4s .2s ease forwards}" +
      ".secure-countdown .sc-bar i{" +
      "display:block;height:100%;width:0;background:linear-gradient(90deg,#f14635,#ff6b5a);" +
      "border-radius:99px;transition:width 5s linear}" +
      "@keyframes scPop{0%{transform:scale(.2);opacity:0}45%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}" +
      "@keyframes scRingPulse{0%,100%{box-shadow:0 0 0 0 rgba(241,70,53,.18)}50%{box-shadow:0 0 0 14px rgba(241,70,53,0)}}" +
      "@keyframes scFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}" +
      "@media print{html,body{background:#000!important}body *{visibility:hidden!important}}";
    document.head.appendChild(s);
  }

  function injectOverlay() {
    overlay = document.getElementById("antiCaptureScreen");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "antiCaptureScreen";
      document.body.appendChild(overlay);
    }
    countdownEl = document.getElementById("secureCountdown");
    if (!countdownEl) {
      countdownEl = document.createElement("div");
      countdownEl.id = "secureCountdown";
      countdownEl.className = "secure-countdown";
      countdownEl.innerHTML =
        '<div class="sc-ring"><span class="sc-num" id="scNum">3</span></div>' +
        '<p class="sc-label" id="scLabel">Защита экрана</p>' +
        '<div class="sc-bar"><i id="scBar"></i></div>';
      document.body.appendChild(countdownEl);
    }
  }

  function applyShutterState() {
    if (!overlay) return;
    if (!secureMode) {
      overlay.classList.remove("viewing");
      overlay.style.display = "none";
      document.documentElement.style.background = "#fff";
      document.body.style.background = "#fff";
      return;
    }
    overlay.style.display = "block";
    if (viewing) {
      overlay.classList.add("viewing");
      document.documentElement.style.background = "#fff";
      document.body.style.background = "#fff";
    } else {
      overlay.classList.remove("viewing");
      document.documentElement.style.background = "#000";
      document.body.style.background = "#000";
    }
  }

  function startViewing() {
    if (!secureMode) return;
    viewing = true;
    clearTimeout(viewTimer);
    viewTimer = setTimeout(stopViewing, VIEW_MAX_MS);
    clearSelection();
    applyShutterState();
  }

  function stopViewing() {
    viewing = false;
    clearTimeout(viewTimer);
    clearTimeout(pressViewTimer);
    clearSelection();
    applyShutterState();
  }

  function registerQuickTap() {
    tapCount++;
    clearTimeout(tapResetTimer);
    tapResetTimer = setTimeout(function () { tapCount = 0; }, 1400);
    if (tapCount >= 5) {
      tapCount = 0;
      disableSecureMode(true);
    }
  }

  function onPointerDown(e) {
    if (!secureMode || isEditable(e.target) || isAdsToggle(e.target)) return;
    if (e.target.closest && e.target.closest(".secure-countdown")) return;

    fingerDown = true;
    pressStart = Date.now();
    clearTimeout(pressViewTimer);
    clearSelection();

    pressViewTimer = setTimeout(function () {
      if (fingerDown) startViewing();
    }, VIEW_HOLD_MS);
  }

  function onPointerUp(e) {
    if (!secureMode) return;

    var held = Date.now() - pressStart;
    var wasViewing = viewing;

    clearTimeout(pressViewTimer);
    fingerDown = false;

    if (wasViewing) {
      stopViewing();
      return;
    }

    if (held < VIEW_HOLD_MS && e.target === overlay) {
      registerQuickTap();
    }
  }

  function runCountdown(onDone) {
    if (countdownRunning || secureMode) return;
    countdownRunning = true;
    var numEl = document.getElementById("scNum");
    var barEl = document.getElementById("scBar");
    var labelEl = document.getElementById("scLabel");
    var steps = [3, 2, 1];
    var stepMs = Math.round(COUNTDOWN_MS / steps.length);
    var i = 0;

    countdownEl.classList.add("show");
    if (labelEl) labelEl.textContent = "Включение защиты экрана";
    if (barEl) {
      barEl.style.transition = "none";
      barEl.style.width = "0%";
      void barEl.offsetWidth;
      barEl.style.transition = "width " + COUNTDOWN_MS + "ms linear";
      barEl.style.width = "100%";
    }

    (function step() {
      if (i >= steps.length) {
        countdownEl.classList.remove("show");
        countdownRunning = false;
        if (barEl) {
          barEl.style.transition = "none";
          barEl.style.width = "0%";
        }
        onDone();
        return;
      }
      var n = steps[i++];
      if (numEl) {
        numEl.textContent = String(n);
        numEl.style.animation = "none";
        void numEl.offsetWidth;
        numEl.style.animation = "";
      }
      setTimeout(step, stepMs);
    })();
  }

  function enableSecureMode() {
    secureMode = true;
    viewing = false;
    fingerDown = false;
    clearSelection();
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
    applyShutterState();
  }

  function disableSecureMode(fromTaps) {
    secureMode = false;
    viewing = false;
    fingerDown = false;
    tapCount = 0;
    clearSelection();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    document.documentElement.style.background = "#fff";
    document.body.style.background = "#fff";
    applyShutterState();
    if (fromTaps) {
      var numEl = document.getElementById("scNum");
      var labelEl = document.getElementById("scLabel");
      var barEl = document.getElementById("scBar");
      countdownEl.classList.add("show");
      if (labelEl) labelEl.textContent = "Защита отключена";
      if (numEl) {
        numEl.textContent = "✓";
        numEl.style.fontSize = "52px";
        numEl.style.animation = "none";
        void numEl.offsetWidth;
        numEl.style.animation = "";
      }
      if (barEl) {
        barEl.style.transition = "none";
        barEl.style.width = "0%";
      }
      setTimeout(function () {
        countdownEl.classList.remove("show");
        if (numEl) numEl.style.fontSize = "";
      }, DISABLE_ANIM_MS);
    }
  }

  function bindTouchView() {
    document.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    document.addEventListener("pointerup", onPointerUp, { passive: false, capture: true });
    document.addEventListener("pointercancel", function () {
      fingerDown = false;
      clearTimeout(pressViewTimer);
      if (viewing) stopViewing();
    }, { passive: true, capture: true });

    document.addEventListener("visibilitychange", function () {
      if (!secureMode) return;
      fingerDown = false;
      stopViewing();
    });
    window.addEventListener("blur", function () {
      if (!secureMode) return;
      fingerDown = false;
      stopViewing();
    });
  }

  function bindNoSelect() {
    document.addEventListener("selectstart", function (e) {
      if (!isEditable(e.target)) e.preventDefault();
    }, true);

    document.addEventListener("copy", function (e) {
      if (!isEditable(e.target)) e.preventDefault();
    }, true);

    document.addEventListener("cut", function (e) {
      if (!isEditable(e.target)) e.preventDefault();
    }, true);

    document.addEventListener("contextmenu", function (e) {
      if (!isEditable(e.target)) e.preventDefault();
    }, true);

    document.addEventListener("selectionchange", function () {
      if (isEditable(document.activeElement)) return;
      clearSelection();
    });
  }

  function bindLongPressToggle() {
    var btn = document.getElementById("secureToggleBtn");
    if (!btn || btn.dataset.secureBound) return;
    btn.dataset.secureBound = "1";

    function clearAdsHold() {
      clearTimeout(adsHoldTimer);
      adsHoldTimer = null;
      btn.classList.remove("holding");
    }

    function onAdsPress(e) {
      if (secureMode || countdownRunning) return;
      e.preventDefault();
      e.stopPropagation();
      clearSelection();
      clearAdsHold();
      adsHoldTimer = setTimeout(function () {
        adsHoldTimer = null;
        btn.classList.remove("holding");
        if (navigator.vibrate) try { navigator.vibrate(30); } catch (_) {}
        runCountdown(enableSecureMode);
      }, ADS_LONG_PRESS_MS);
      btn.classList.add("holding");
    }

    btn.addEventListener("touchstart", onAdsPress, { passive: false, capture: true });
    btn.addEventListener("pointerdown", onAdsPress, { passive: false, capture: true });
    btn.addEventListener("pointerup", clearAdsHold, { capture: true });
    btn.addEventListener("pointercancel", clearAdsHold, { capture: true });
    btn.addEventListener("pointerleave", clearAdsHold, { capture: true });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  function init() {
    if (SKIP_PAGES.test(location.pathname)) return;
    injectStyles();
    injectOverlay();
    bindNoSelect();
    bindTouchView();
    bindLongPressToggle();
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") enableSecureMode();
    } catch (_) {}
    applyShutterState();
  }

  window.KaspiSecureView = {
    isActive: function () { return secureMode; },
    enable: function () { runCountdown(enableSecureMode); },
    disable: function () { disableSecureMode(false); },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
