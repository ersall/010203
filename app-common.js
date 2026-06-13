(function (global) {
  const NAME_KEY = "kaspi_fullName";
  const AVATAR_KEY = "kaspi_avatar";
  const DEFAULT_NAME = "Абильмажин А.";
  const DEFAULT_AVATAR = "avatar.jpg";

  function getName() {
    return localStorage.getItem(NAME_KEY) || DEFAULT_NAME;
  }

  function setName(value) {
    let name = String(value || "").trim();
    if (!name) name = DEFAULT_NAME;
    if (!name.endsWith(".")) name += ".";
    localStorage.setItem(NAME_KEY, name);
    syncRekvizit(name);
    return name;
  }

  function getAvatar() {
    return localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
  }

  function setAvatar(dataUrl) {
    if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
  }

  function syncRekvizit(name) {
    try {
      localStorage.setItem("rekvizit1", name);
    } catch (_) {}
  }

  function applyAvatarTo(img) {
    if (!img) return;
    const src = getAvatar();
    img.onerror = function () {
      this.onerror = null;
      this.src = "https://via.placeholder.com/120";
    };
    img.src = src;
  }

  function applyPinAvatar() {
    applyAvatarTo(document.querySelector(".pin-avatar img"));
  }

  function applyProfileRow() {
    const nameEl = document.getElementById("profileName");
    const avatarEl = document.getElementById("profileAvatarImg");
    if (nameEl) nameEl.textContent = getName();
    applyAvatarTo(avatarEl);
  }

  function openSettings() {
    const overlay = document.getElementById("settingsOverlay");
    if (!overlay) return;
    const nameInput = document.getElementById("settingsName");
    const preview = document.getElementById("settingsAvatarPreview");
    if (nameInput) nameInput.value = getName();
    applyAvatarTo(preview);
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSettings() {
    const overlay = document.getElementById("settingsOverlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  function saveSettings() {
    const nameInput = document.getElementById("settingsName");
    if (nameInput) setName(nameInput.value);
    applyProfileRow();
    applyPinAvatar();
    closeSettings();
  }

  function initSettingsUI() {
    const profileRow = document.getElementById("profileRow");
    const saveBtn = document.getElementById("settingsSave");
    const cancelBtn = document.getElementById("settingsCancel");
    const fileInput = document.getElementById("avatarFileInput");
    const uploadBtn = document.getElementById("avatarUploadBtn");
    const overlay = document.getElementById("settingsOverlay");

    if (profileRow) profileRow.addEventListener("click", openSettings);
    if (saveBtn) saveBtn.addEventListener("click", saveSettings);
    if (cancelBtn) cancelBtn.addEventListener("click", closeSettings);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeSettings();
      });
    }
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
          setAvatar(reader.result);
          applyAvatarTo(document.getElementById("settingsAvatarPreview"));
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function initNav(activeTab) {
    document.querySelectorAll(".nav-item[data-tab]").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const tab = item.getAttribute("data-tab");
        if (tab === activeTab) return;
        if (tab === "home") global.KaspiNav.navigateTo("/");
        else if (tab === "services") global.KaspiNav.navigateTo("/serv.html");
      });
    });
  }

  function initPageEnter() {
    if (
      sessionStorage.getItem("kaspi_page_nav") === "1" ||
      sessionStorage.getItem("kaspi_tab_nav") === "1"
    ) {
      sessionStorage.removeItem("kaspi_page_nav");
      sessionStorage.removeItem("kaspi_tab_nav");
      document.documentElement.classList.add("page-transition-in");
      window.setTimeout(function () {
        document.documentElement.classList.remove("page-transition-in");
      }, 380);
    }
  }

  function getPageRoot() {
    return document.querySelector(
      ".app-wrapper, .services-page, .pay-app, .bank-app, .msg-page"
    );
  }

  function navigateTo(url) {
    if (!url) return;
    var target = url.split("?")[0];
    var current = location.pathname.split("/").pop() || "index.html";
    if (target === "/" || target === "") target = "index.html";
    if (target === current || (target === "index.html" && (current === "" || current === "/"))) {
      return;
    }
    sessionStorage.setItem("kaspi_page_nav", "1");
    var root = getPageRoot();
    if (root) root.classList.add("page-transition-out");
    else document.body.classList.add("page-transition-out");
    window.setTimeout(function () {
      location.href = url;
    }, 260);
  }

  function initGlobalLinks() {
    document.querySelectorAll("[data-open-bank]").forEach(function (el) {
      el.onclick = function (e) {
        e.preventDefault();
        navigateTo("bank.html");
      };
    });
    document.querySelectorAll("[data-open-payments]").forEach(function (el) {
      el.onclick = function (e) {
        e.preventDefault();
        navigateTo("payments.html");
      };
    });
    document.querySelectorAll("[data-open-messages]").forEach(function (el) {
      el.onclick = function (e) {
        e.preventDefault();
        navigateTo("messages.html");
      };
    });
    document.querySelectorAll(".pay-nav a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href === "#") return;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        navigateTo(href);
      });
    });
  }

  global.KaspiNav = {
    navigateTo: navigateTo,
    initPageEnter: initPageEnter,
    initGlobalLinks: initGlobalLinks,
  };

  document.addEventListener("DOMContentLoaded", function () {
    initPageEnter();
    initGlobalLinks();
  });

  global.KaspiProfile = {
    getName,
    setName,
    getAvatar,
    setAvatar,
    applyPinAvatar,
    applyProfileRow,
    initSettingsUI,
    initNav,
    initPageEnter,
  };

  function injectNotifyStyles() {
    if (document.getElementById("kaspi-notify-style")) return;
    var s = document.createElement("style");
    s.id = "kaspi-notify-style";
    s.textContent =
      ".kaspi-notify-wrap{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:50%;z-index:2147483000;width:calc(100% - 28px);max-width:340px;transform:translateX(-50%) translateY(calc(-100% - 20px));transition:transform .36s cubic-bezier(.2,.8,.2,1);pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif}" +
      ".kaspi-notify-wrap.is-visible{transform:translateX(-50%) translateY(0);pointer-events:auto}" +
      ".kaspi-notify-banner{background:#fff;border-radius:16px;padding:13px 12px 13px 14px;box-shadow:0 10px 36px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.06);display:flex;gap:10px;align-items:flex-start}" +
      ".kaspi-notify-banner-body{flex:1;min-width:0;padding-top:1px}" +
      ".kaspi-notify-banner-title{font-size:14px;font-weight:700;margin:0 0 3px;color:#111;line-height:1.25;letter-spacing:-.01em}" +
      ".kaspi-notify-banner-text{font-size:13px;line-height:1.35;color:#636366;margin:0;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}" +
      ".kaspi-notify-banner-close{flex-shrink:0;width:28px;height:28px;border:none;border-radius:50%;background:#f2f2f7;color:#8e8e93;font-size:18px;line-height:1;cursor:pointer;margin-top:-2px}";
    document.head.appendChild(s);
  }

  var PIN_UNLOCK_KEY = "kaspi_pin_unlocked";
  var DISMISS_KEY = "kaspi_dismissed_notify";
  var pendingNotification = null;
  var pendingNotificationType = null;

  function getDismissedIds() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function isNotificationDismissed(id) {
    if (!id) return false;
    return getDismissedIds().indexOf(id) >= 0;
  }

  function markNotificationDismissed(id) {
    if (!id) return;
    try {
      var list = getDismissedIds();
      if (list.indexOf(id) < 0) list.push(id);
      if (list.length > 80) list = list.slice(-80);
      localStorage.setItem(DISMISS_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function isPinPage() {
    return !!document.getElementById("pinScreen");
  }

  function isPinLocked() {
    if (document.body && document.body.classList.contains("pin-locked")) return true;
    var pin = document.getElementById("pinScreen");
    return !!(pin && pin.classList.contains("active"));
  }

  function canShowNotificationNow() {
    if (/\/(bind|blocked|admin)\.html$/i.test(location.pathname)) return false;
    if (isPinPage()) {
      if (!global.KaspiPin || !global.KaspiPin.isUnlocked()) return false;
    }
    if (isPinLocked()) return false;
    return true;
  }

  function queueNotification(n, type) {
    if (!n || !n.id || isNotificationDismissed(n.id)) return;
    pendingNotification = n;
    pendingNotificationType = type || "global";
  }

  function applyServerBalance(data) {
    if (!data || data.balance == null) return;
    if (global.KaspiWallet && global.KaspiWallet.applyServerBalance) {
      global.KaspiWallet.applyServerBalance(data.balance);
    }
  }

  function renderNotificationBanner(n, type) {
    if (!n || !n.id || isNotificationDismissed(n.id)) return;
    injectNotifyStyles();
    var old = document.getElementById("kaspiNotifyWrap");
    if (old) old.remove();
    var wrap = document.createElement("div");
    wrap.id = "kaspiNotifyWrap";
    wrap.className = "kaspi-notify-wrap";
    wrap.innerHTML =
      '<div class="kaspi-notify-banner">' +
      '<div class="kaspi-notify-banner-body">' +
      '<h3 class="kaspi-notify-banner-title"></h3>' +
      '<p class="kaspi-notify-banner-text"></p></div>' +
      '<button type="button" class="kaspi-notify-banner-close" aria-label="Закрыть">×</button></div>';
    wrap.querySelector(".kaspi-notify-banner-title").textContent = n.title || "Уведомление";
    wrap.querySelector(".kaspi-notify-banner-text").textContent = n.text || "";
    function dismiss() {
      markNotificationDismissed(n.id);
      if (pendingNotification && pendingNotification.id === n.id) {
        pendingNotification = null;
        pendingNotificationType = null;
      }
      wrap.classList.remove("is-visible");
      setTimeout(function () { wrap.remove(); }, 320);
      fetch("/.netlify/functions/check-access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss_notify",
          type: type || "global",
          notificationId: n.id,
        }),
      }).catch(function () {});
    }
    wrap.querySelector(".kaspi-notify-banner-close").onclick = dismiss;
    document.body.appendChild(wrap);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add("is-visible");
      });
    });
  }

  function showNotification(n, type) {
    if (!n || !n.id || isNotificationDismissed(n.id)) return;
    if (!canShowNotificationNow()) {
      queueNotification(n, type);
      return;
    }
    renderNotificationBanner(n, type);
  }

  function flushPendingNotification() {
    if (!pendingNotification || !canShowNotificationNow()) return;
    if (isNotificationDismissed(pendingNotification.id)) {
      pendingNotification = null;
      pendingNotificationType = null;
      return;
    }
    var n = pendingNotification;
    var t = pendingNotificationType;
    pendingNotification = null;
    pendingNotificationType = null;
    renderNotificationBanner(n, t);
  }

  async function checkAccessAndNotify(page) {
    if (isLocalDev()) return localAccessOk();
    if (/\/(bind|blocked|admin)\.html$/i.test(location.pathname)) return null;
    try {
      var url = "/.netlify/functions/check-access?page=" + encodeURIComponent(page || "site");
      var r = await fetch(url, { credentials: "include" });
      if (!r.ok) return null;
      var data = await r.json();
      applyServerBalance(data);
      if (data.notification && !isNotificationDismissed(data.notification.id)) {
        showNotification(data.notification, data.notificationType);
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  function initNotifications(page) {
    if (isLocalDev()) return;
    if (/\/(bind|blocked|admin)\.html$/i.test(location.pathname)) return;
    if (isPinPage() && !global.KaspiPin.isUnlocked()) return;
    checkAccessAndNotify(page);
    setInterval(function () {
      checkAccessAndNotify(page);
    }, 120000);
  }

  global.KaspiNotify = {
    showNotification: showNotification,
    checkAccessAndNotify: checkAccessAndNotify,
    initNotifications: initNotifications,
    flushPending: flushPendingNotification,
  };

  global.KaspiPin = {
    isUnlocked: function () {
      try { return sessionStorage.getItem(PIN_UNLOCK_KEY) === "1"; } catch (_) { return false; }
    },
    unlock: function () {
      try { sessionStorage.setItem(PIN_UNLOCK_KEY, "1"); } catch (_) {}
      if (document.body) document.body.classList.remove("pin-locked");
      var pin = document.getElementById("pinScreen");
      if (pin) pin.classList.remove("active");
      flushPendingNotification();
      try {
        document.dispatchEvent(new CustomEvent("kaspi:pin-unlock"));
      } catch (_) {}
    },
    shouldShowPin: function () {
      return isPinPage() && !this.isUnlocked();
    },
    isLocked: isPinLocked,
  };

  function isLocalDev() {
    var h = location.hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      location.search.indexOf("dev=1") !== -1
    );
  }

  function localAccessOk() {
    return { hasAccess: true, blocked: false, expired: false, notification: null };
  }

  function applyAccessResult(data) {
    if (!data) return true;
    applyServerBalance(data);
    if (data.blocked) {
      location.href = "/blocked.html";
      return false;
    }
    if (!data.hasAccess) {
      location.href = "/bind.html";
      return false;
    }
    if (window.KaspiNotify && data.notification && !isNotificationDismissed(data.notification.id)) {
      showNotification(data.notification, data.notificationType);
    }
    return true;
  }

  async function verifyAccess(page, options) {
    options = options || {};
    if (isLocalDev()) {
      var local = localAccessOk();
      if (options.redirect === false) return local;
      return true;
    }
    try {
      var url = "/.netlify/functions/check-access?page=" +
        encodeURIComponent(page || "site");
      var r = await fetch(url, { credentials: "include" });
      if (!r.ok) {
        return options.strict ? false : true;
      }
      var data = await r.json();
      applyServerBalance(data);
      if (options.redirect === false) return data;
      return applyAccessResult(data);
    } catch (_) {
      return options.strict ? false : true;
    }
  }

  function startAccessWatch(page, intervalMs) {
    if (isLocalDev()) return;
    setInterval(function () {
      verifyAccess(page, { redirect: false }).then(function (data) {
        if (!data || typeof data !== "object") return;
        if (data.blocked) location.href = "/blocked.html";
        else if (!data.hasAccess) location.href = "/bind.html";
      }).catch(function () {});
    }, intervalMs || 60000);
  }

  global.KaspiAccess = {
    verifyAccess: verifyAccess,
    applyAccessResult: applyAccessResult,
    startAccessWatch: startAccessWatch,
  };
})(window);
