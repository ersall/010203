(function (global) {
  "use strict";

  var GOLD_ACTIONS = [
    { icon: "qr", title: "Kaspi QR" },
    { icon: "transfer", title: "Перевести" },
    { icon: "topup", title: "Пополнить Kaspi Gold" },
    { icon: "web", title: "Оплата в интернете" },
    { icon: "subs", title: "Платные сервисы и подписки", action: "balance" },
    { icon: "atm", title: "Заказать сумму на снятие", sub: "более 4 000 000 ₸" },
    { icon: "pin", title: "Сменить ПИН-код" },
    { icon: "lock", title: "Заблокировать карту" },
    { icon: "phone", title: "Снять деньги без карты" },
    { icon: "close", title: "Закрыть Kaspi Gold" },
  ];

  var GOLD_INFO = [
    { icon: "analytics", title: "Аналитика покупок" },
    { icon: "limit", title: "Лимит на снятие наличных" },
    { icon: "details", title: "Реквизиты карты и счета" },
    { icon: "cert", title: "Справки", sub: "О наличии счета, о доступном остатке" },
    { icon: "terms", title: "Условия Kaspi Gold" },
    { icon: "map", title: "Терминалы и банкоматы" },
    { icon: "tips", title: "Полезные советы" },
    { icon: "visa", title: "Пополнения с Visa", sub: "Из другого банка по номеру телефона" },
  ];

  function renderBank() {
    var w = global.KaspiWallet;
    if (!w) return;

    var balance = w.formatMoney(w.getBalance());
    var suffix = "• " + w.getCardSuffix();
    var cardMask = "*" + w.getCardSuffix();
    var bonus = w.getBonus() + " Б";

    var balEl = document.getElementById("goldBalance");
    var bonusEl = document.getElementById("bonusBalance");
    var suffixEl = document.getElementById("cardSuffix");
    var heroTitle = document.getElementById("goldHeroTitle");
    var heroBalance = document.getElementById("goldHeroBalance");

    if (balEl) balEl.textContent = balance;
    if (bonusEl) bonusEl.textContent = bonus;
    if (suffixEl) suffixEl.textContent = suffix;
    if (heroTitle) heroTitle.textContent = "Kaspi Gold " + cardMask;
    if (heroBalance) heroBalance.textContent = balance;
  }

  function renderMenu(containerId, items) {
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = items.map(function (item) {
      return (
        '<button type="button" class="gold-row"' +
          (item.action ? ' data-action="' + item.action + '"' : "") +
        ">" +
          '<span class="gold-row-icon">' +
            '<img src="icons/actions/' + item.icon + '.svg" width="32" height="32" alt="" draggable="false">' +
          "</span>" +
          '<span class="gold-row-text">' +
            '<span class="gold-row-title">' + item.title + "</span>" +
            (item.sub ? '<span class="gold-row-sub">' + item.sub + "</span>" : "") +
          "</span>" +
          '<span class="gold-chevron">›</span>' +
        "</button>"
      );
    }).join("");
  }

  function refreshBalanceModal() {
    var w = global.KaspiWallet;
    var val = document.getElementById("balanceModalValue");
    if (w && val) val.textContent = w.formatMoney(w.getBalance());
  }

  function openBalanceSheet() {
    var overlay = document.getElementById("balanceOverlay");
    var input = document.getElementById("balanceAmount");
    if (!overlay) return;
    refreshBalanceModal();
    if (input) {
      input.value = "";
    }
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeBalanceSheet() {
    var overlay = document.getElementById("balanceOverlay");
    if (!overlay) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function parseBalanceInput() {
    var input = document.getElementById("balanceAmount");
    if (!input) return 0;
    var n = parseFloat(String(input.value).replace(",", "."));
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function bindBalanceSheet() {
    var overlay = document.getElementById("balanceOverlay");
    if (!overlay) return;

    var closeBtn = document.getElementById("balanceClose");
    if (closeBtn) closeBtn.onclick = closeBalanceSheet;

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeBalanceSheet();
    });

    var addBtn = document.getElementById("balanceAdd");
    if (addBtn) {
      addBtn.onclick = function () {
        var w = global.KaspiWallet;
        var input = document.getElementById("balanceAmount");
        if (!w) return;
        var amount = parseBalanceInput();
        if (amount <= 0) return;
        w.adjustBalance(amount);
        refreshBalanceModal();
        renderBank();
        if (input) input.value = "";
      };
    }

    var subBtn = document.getElementById("balanceSub");
    if (subBtn) {
      subBtn.onclick = function () {
        var w = global.KaspiWallet;
        var input = document.getElementById("balanceAmount");
        if (!w) return;
        var amount = parseBalanceInput();
        if (amount <= 0) return;
        w.adjustBalance(-amount);
        refreshBalanceModal();
        renderBank();
        if (input) input.value = "";
      };
    }

    var resetBtn = document.getElementById("balanceReset");
    if (resetBtn) {
      resetBtn.onclick = function () {
        var w = global.KaspiWallet;
        var input = document.getElementById("balanceAmount");
        if (!w) return;
        w.resetBalance();
        refreshBalanceModal();
        renderBank();
        if (input) input.value = "";
      };
    }

    var actionsMenu = document.getElementById("goldActionsMenu");
    if (actionsMenu) {
      actionsMenu.addEventListener("click", function (e) {
        var row = e.target.closest(".gold-row");
        if (!row) return;
        if (row.getAttribute("data-action") === "balance") {
          openBalanceSheet();
        }
      });
    }

    document.addEventListener("kaspi:balance", function () {
      refreshBalanceModal();
      renderBank();
    });
  }

  function showScreen(id) {
    var list = document.getElementById("screenBankList");
    var gold = document.getElementById("screenGold");
    if (!list || !gold) return;

    if (id === "screenGold") {
      gold.classList.add("is-open");
      list.classList.add("is-hidden");
    } else {
      gold.classList.remove("is-open");
      list.classList.remove("is-hidden");
    }
    window.scrollTo(0, 0);
  }

  function setGoldTab(name) {
    document.querySelectorAll("[data-gold-tab]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-gold-tab") === name);
    });
    document.querySelectorAll("[data-gold-panel]").forEach(function (panel) {
      var active = panel.getAttribute("data-gold-panel") === name;
      panel.classList.toggle("active", active);
      if (active) {
        panel.classList.remove("gold-panel--fade");
        void panel.offsetWidth;
        panel.classList.add("gold-panel--fade");
      }
    });
  }

  function updateStmtDates() {
    var el = document.getElementById("stmtDateRange");
    if (!el) return;
    var now = new Date();
    var from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    var months = ["января", "февраля", "марта", "апреля", "мая", "июня",
      "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    el.textContent = from.getDate() + " " + months[from.getMonth()] +
      " – " + now.getDate() + " " + months[now.getMonth()];
  }

  function bindBankPage() {
    renderMenu("goldActionsMenu", GOLD_ACTIONS);
    renderMenu("goldInfoMenu", GOLD_INFO);
    updateStmtDates();
    renderBank();
    bindBalanceSheet();

    var back = document.getElementById("bankBack");
    if (back) {
      back.onclick = function () {
        if (global.KaspiNav) global.KaspiNav.navigateTo("/");
        else location.href = "/";
      };
    }

    var goldCard = document.getElementById("goldCard");
    if (goldCard) {
      goldCard.onclick = function () {
        renderBank();
        setGoldTab("actions");
        showScreen("screenGold");
      };
    }

    var goldBack = document.getElementById("goldBack");
    if (goldBack) {
      goldBack.onclick = function () {
        showScreen("screenBankList");
      };
    }

    document.querySelectorAll("[data-gold-tab]").forEach(function (btn) {
      btn.onclick = function () {
        setGoldTab(btn.getAttribute("data-gold-tab"));
      };
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) renderBank();
    });
  }

  function initBankNav(root) {
    var scope = root || document;
    var nav = global.KaspiNav;
    scope.querySelectorAll("[data-open-bank]").forEach(function (el) {
      el.style.cursor = "pointer";
      el.onclick = function (e) {
        e.preventDefault();
        if (nav) nav.navigateTo("bank.html");
        else location.href = "bank.html";
      };
    });
  }

  global.KaspiBank = {
    render: renderBank,
    initBankNav: initBankNav,
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.classList.contains("bank-body")) {
      bindBankPage();
    }
    initBankNav();
  });
})(window);
