(function () {
  "use strict";

  var SESSION_KEY = "kaspi_admin_session";
  var state = {
    login: "",
    password: "",
    isSuper: false,
    tab: "keys",
    period: "30d",
    activityPeriod: "30d",
    items: [],
    stats: null,
    selectedUserId: null,
    selectedAdminLogin: null,
  };

  var DURATIONS = [
    { v: "7d", l: "7 дней" },
    { v: "30d", l: "30 дней" },
    { v: "6m", l: "6 месяцев" },
    { v: "1y", l: "1 год" },
    { v: "forever", l: "Навсегда" },
  ];

  function $(id) { return document.getElementById(id); }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function durLabel(v) {
    var f = DURATIONS.find(function (x) { return x.v === v; });
    return f ? f.l : v;
  }

  function showMsg(text, ok) {
    var el = $("msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = ok ? "msg ok" : "msg";
  }

  function saveSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      login: state.login,
      password: state.password,
      isSuper: state.isSuper,
    }));
  }

  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      state.login = s.login || "";
      state.password = s.password || "";
      state.isSuper = !!s.isSuper;
      return !!(state.login && state.password);
    } catch (_) {
      return false;
    }
  }

  async function api(action, extra) {
    var r = await fetch("/.netlify/functions/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({
        login: state.login,
        password: state.password,
        action: action,
      }, extra || {})),
    });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      var err = data.error === "wrong_password" ? "Неверный логин или пароль" : (data.message || data.error || "Ошибка");
      throw new Error(err);
    }
    return data;
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("hidden", p.dataset.panel !== tab);
    });
    if (tab === "activity") loadActivity();
    if (tab === "admin-activity") loadAdminActivity();
    if (tab === "admins") loadAdmins();
  }

  function renderTabs() {
    var tabs = $("tabs");
    tabs.innerHTML = "";
    var list = [
      { id: "keys", label: "Выдать ключи" },
      { id: "activity", label: "Активность" },
    ];
    if (state.isSuper) {
      list.push({ id: "admins", label: "Админы" });
      list.push({ id: "admin-activity", label: "Активность админов" });
      list.push({ id: "notify", label: "Уведомления" });
    }
    list.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab" + (state.tab === t.id ? " active" : "");
      btn.dataset.tab = t.id;
      btn.textContent = t.label;
      btn.onclick = function () { setTab(t.id); };
      tabs.appendChild(btn);
    });
  }

  function renderStats(stats) {
    var el = $("statsGrid");
    if (!el || !stats) return;
    var rows = [
      ["total", "Всего"],
      ["7d", "7д"],
      ["30d", "30д"],
      ["6m", "6м"],
      ["1y", "1г"],
      ["forever", "∞"],
    ];
    el.innerHTML = rows.map(function (r) {
      return '<div class="stat"><b>' + (stats[r[0]] || 0) + '</b>' + r[1] + "</div>";
    }).join("");
  }

  function renderHistory(items) {
    var el = $("historyList");
    if (!el) return;
    el.innerHTML = "";
    var mine = items.filter(function (i) {
      return i.createdBy === state.login || i.issuedBy === state.login;
    }).slice(0, 25);
    if (!mine.length) {
      el.innerHTML = '<div class="row-meta">Пока нет ключей</div>';
      return;
    }
    mine.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "row";
      var status = item.blocked ? "badge-red" : item.used ? "badge-gray" : item.expiredUnused ? "badge-gray" : "badge-green";
      var statusText = item.blocked ? "Заблок." : item.used ? "Использ." : item.expiredUnused ? "Истёк" : "Активен";
      row.innerHTML =
        '<div class="row-main">' +
        '<div class="row-title">' + (item.label || "Без названия") + "</div>" +
        '<div class="row-meta">' + fmtDate(item.createdAt) + " · " + item.code + "</div>" +
        '<div class="pills" style="justify-content:flex-start;margin:6px 0 0">' +
        '<span class="pill">' + durLabel(item.duration) + "</span>" +
        '<span class="badge ' + status + '">' + statusText + "</span>" +
        (item.createdBy ? '<span class="pill">Создал: ' + item.createdBy + "</span>" : "") +
        "</div></div>";
      var actions = document.createElement("div");
      actions.className = "row-actions";
      if (!item.blocked && !item.used && !item.expiredUnused) {
        var blockBtn = document.createElement("button");
        blockBtn.className = "btn btn-ghost";
        blockBtn.textContent = "Блок";
        blockBtn.onclick = async function () {
          await api("block", { code: item.code });
          refreshList();
        };
        actions.appendChild(blockBtn);
      }
      if (!item.used) {
        var delBtn = document.createElement("button");
        delBtn.className = "btn btn-ghost";
        delBtn.textContent = "Удал.";
        delBtn.onclick = async function () {
          await api("delete", { code: item.code });
          refreshList();
        };
        actions.appendChild(delBtn);
      }
      row.appendChild(actions);
      el.appendChild(row);
    });
  }

  async function refreshList() {
    var data = await api("list");
    state.items = data.items || [];
    state.stats = data.stats || null;
    state.isSuper = !!data.isSuper;
    renderStats(state.stats);
    renderHistory(state.items);
    $("loginBar").innerHTML = 'Ты вошёл как: <b>' + state.login + "</b>" + (state.isSuper ? " · главный админ" : "");
  }

  async function loadActivity() {
    var el = $("activityList");
    el.innerHTML = '<div class="row-meta">Загрузка...</div>';
    var data = await api("activity", { period: state.activityPeriod });
    el.innerHTML = "";
    (data.users || []).slice(0, 20).forEach(function (u, idx) {
      var row = document.createElement("div");
      row.className = "row";
      row.style.cursor = "pointer";
      row.innerHTML =
        '<div class="row-main">' +
        '<div class="row-title">#' + (idx + 1) + " " + (u.label || "Пользователь") + "</div>" +
        '<div class="row-meta">Входов: ' + u.loginCount + " · Активность: " + u.score + " · " + fmtDate(u.lastSeen) + "</div>" +
        "</div>" +
        '<span class="badge badge-green">Открыть</span>';
      row.onclick = function () { openUserProfile(u.id); };
      el.appendChild(row);
    });
    if (!(data.users || []).length) el.innerHTML = '<div class="row-meta">Нет активности</div>';
  }

  async function openUserProfile(userId) {
    state.selectedUserId = userId;
    var data = await api("user_profile", { userId: userId });
    var u = data.user;
    var html =
      '<div class="pills" style="justify-content:flex-start">' +
      '<span class="pill">Код: ' + (u.code || "—") + "</span>" +
      '<span class="pill">' + durLabel(u.duration) + "</span>" +
      '<span class="pill">Входов: ' + (u.loginCount || 0) + "</span>" +
      "</div>" +
      '<p class="row-meta">Выдал: ' + (u.issuedBy || u.createdBy || "—") + "<br>Последний визит: " + fmtDate(u.lastSeen) + "</p>" +
      '<label style="margin-top:12px">Продлить срок</label>' +
      '<select id="extendDur">' + DURATIONS.map(function (d) {
        return '<option value="' + d.v + '">' + d.l + "</option>";
      }).join("") + "</select>" +
      '<div class="flex-btns"><button class="btn btn-dark" id="extendBtn">Продлить</button></div>' +
      '<label style="margin-top:14px">Личное уведомление</label>' +
      '<input id="uNotifyTitle" placeholder="Заголовок" />' +
      '<textarea id="uNotifyText" placeholder="Текст уведомления" style="margin-top:8px"></textarea>' +
      '<button class="btn btn-blue" id="uNotifyBtn" style="margin-top:8px">Отправить пользователю</button>';
    if (u.code) {
      html += '<button class="btn btn-red" id="blockUserBtn" style="margin-top:10px">Заблокировать пользователя</button>';
    }
    html +=
      '<div style="margin-top:14px"><b>Активность на сайте</b></div>' +
      '<div id="userActLog">' + ((u.activity || []).slice(0, 15).map(function (a) {
        return '<div class="log-item">' + fmtDate(a.at) + " · " + (a.page || "site") + "</div>";
      }).join("")) || '<div class="row-meta">Пока пусто</div>' + "</div>";
    $("userModalTitle").textContent = u.label || "Профиль";
    $("userModalBody").innerHTML = html;
    $("userModal").classList.remove("hidden");
    $("extendBtn").onclick = async function () {
      await api("extend", { userId: userId, duration: $("extendDur").value });
      showMsg("Срок продлён", true);
      openUserProfile(userId);
      refreshList();
    };
    $("uNotifyBtn").onclick = async function () {
      await api("send_user_notify", {
        userId: userId,
        title: $("uNotifyTitle").value,
        text: $("uNotifyText").value,
      });
      showMsg("Уведомление отправлено", true);
    };
    var blockBtn = $("blockUserBtn");
    if (blockBtn) {
      blockBtn.onclick = async function () {
        await api("block", { code: u.code });
        showMsg("Пользователь заблокирован", true);
        $("userModal").classList.add("hidden");
        refreshList();
      };
    }
  }

  async function loadAdmins() {
    var data = await api("list_admins");
    var el = $("adminsList");
    el.innerHTML = (data.admins || []).map(function (a) {
      return '<div class="row"><div class="row-main"><div class="row-title">' + a.login +
        '</div><div class="row-meta">Создан: ' + fmtDate(a.createdAt) + " · " + (a.createdBy || "—") +
        '</div></div><button class="btn btn-ghost" data-del-admin="' + a.login + '">Удалить</button></div>';
    }).join("") || '<div class="row-meta">Нет доп. админов</div>';
    el.querySelectorAll("[data-del-admin]").forEach(function (btn) {
      btn.onclick = async function () {
        await api("delete_admin", { targetLogin: btn.getAttribute("data-del-admin") });
        loadAdmins();
      };
    });
  }

  async function loadAdminActivity() {
    var chips = $("adminChips");
    var adminsData = await api("list_admins");
    var logins = ["admin"].concat((adminsData.admins || []).map(function (a) { return a.login; }));
    chips.innerHTML = logins.map(function (l) {
      return '<span class="admin-chip' + (state.selectedAdminLogin === l ? " selected" : "") + '" data-admin="' + l + '">' + l + "</span>";
    }).join("");
    if (!state.selectedAdminLogin) state.selectedAdminLogin = "admin";
    chips.querySelectorAll(".admin-chip").forEach(function (chip) {
      chip.onclick = function () {
        state.selectedAdminLogin = chip.getAttribute("data-admin");
        loadAdminActivity();
      };
    });
    var data = await api("admin_activity", { targetLogin: state.selectedAdminLogin });
    var el = $("adminActList");
    el.innerHTML =
      "<b>Ключи (" + (data.codes || []).length + ")</b>" +
      (data.codes || []).slice(0, 15).map(function (c) {
        return '<div class="log-item">' + c.code + " · " + (c.label || "—") + " · " + durLabel(c.duration) + "</div>";
      }).join("") +
      "<b style='display:block;margin-top:12px'>Журнал</b>" +
      (data.logs || []).slice(0, 20).map(function (l) {
        return '<div class="log-item">' + fmtDate(l.at) + " · " + l.type + (l.targetCode ? " · " + l.targetCode : "") + "</div>";
      }).join("");
  }

  function enterApp() {
    $("loginCard").classList.add("hidden");
    $("app").classList.remove("hidden");
    renderTabs();
    setTab("keys");
    refreshList();
  }

  async function login() {
    var loginVal = $("loginInput").value.trim();
    var passVal = $("passwordInput").value;
    if (!loginVal || !passVal) return showMsg("Введите логин и пароль");
    var data = await api("login", { login: loginVal, password: passVal });
    state.login = loginVal;
    state.password = passVal;
    state.isSuper = !!data.isSuper;
    saveSession();
    showMsg("", true);
    enterApp();
  }

  function bindEvents() {
    $("loginBtn").onclick = function () { login().catch(function (e) { showMsg(e.message); }); };
    $("createBtn").onclick = async function () {
      try {
        var data = await api("create", {
          label: $("labelInput").value.trim(),
          duration: $("durationSelect").value,
        });
        $("newCode").textContent = data.item.code;
        $("newCodeBox").classList.remove("hidden");
        $("newPills").innerHTML =
          '<span class="pill">Срок: ' + durLabel(data.item.duration) + "</span>" +
          '<span class="pill">Выдал: ' + state.login + "</span>";
        refreshList();
      } catch (e) { showMsg(e.message); }
    };
    $("copyBtn").onclick = async function () {
      await navigator.clipboard.writeText($("newCode").textContent);
      showMsg("Скопировано!", true);
    };
    $("closeUserModal").onclick = function () { $("userModal").classList.add("hidden"); };
    $("userModal").onclick = function (e) { if (e.target === $("userModal")) $("userModal").classList.add("hidden"); };
    $("addAdminBtn").onclick = async function () {
      try {
        await api("add_admin", {
          newLogin: $("newAdminLogin").value.trim(),
          newPassword: $("newAdminPass").value,
        });
        $("newAdminLogin").value = "";
        $("newAdminPass").value = "";
        showMsg("Админ добавлен", true);
        loadAdmins();
      } catch (e) { showMsg(e.message); }
    };
    $("sendBroadcastBtn").onclick = async function () {
      try {
        await api("send_broadcast", {
          title: $("broadcastTitle").value,
          text: $("broadcastText").value,
        });
        showMsg("Рассылка отправлена всем", true);
      } catch (e) { showMsg(e.message); }
    };
    document.querySelectorAll("[data-period]").forEach(function (btn) {
      btn.onclick = function () {
        state.activityPeriod = btn.getAttribute("data-period");
        document.querySelectorAll("[data-period]").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        loadActivity();
      };
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    if (loadSession()) {
      api("login").then(enterApp).catch(function () {
        sessionStorage.removeItem(SESSION_KEY);
      });
    }
  });
})();
