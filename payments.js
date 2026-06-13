(function (global) {
  "use strict";

  var CITIES = [
    { id: "shymkent", name: "Шымкент", price: 70 },
    { id: "almaty", name: "Алматы", price: 100 },
    { id: "astana", name: "Астана", price: 110 },
    { id: "karaganda", name: "Караганда", price: 100 },
    { id: "atyrau", name: "Атырау", price: 100 },
  ];

  var SERVICE_TITLE = "Avtobus. Оплата проезда по Kaspi QR";
  var CITY_KEY = "kaspi_pay_city";
  var CASH_KEY = "kaspi_cash";
  var PAY_KEY = "kaspi_payments";
  var VEHICLE_KEY = "kaspi_vehicle_code";

  function getCity() {
    var id = localStorage.getItem(CITY_KEY) || "almaty";
    return CITIES.find(function (c) { return c.id === id; }) || CITIES[1];
  }

  function setCity(id) {
    localStorage.setItem(CITY_KEY, id);
  }

  function getPrice() {
    return getCity().price;
  }

  function formatMoney(n) {
    return Number(n).toFixed(2).replace(".", ",") + " ₸";
  }

  function formatMoneyShort(n) {
    return Number(n) + " ₸";
  }

  function getCash() {
    var v = parseFloat(localStorage.getItem(CASH_KEY));
    return isNaN(v) ? 39140 : v;
  }

  function setCash(v) {
    localStorage.setItem(CASH_KEY, String(v));
  }

  function getPayments() {
    try {
      return JSON.parse(localStorage.getItem(PAY_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function addPayment(rec) {
    var list = getPayments();
    list.unshift(rec);
    localStorage.setItem(PAY_KEY, JSON.stringify(list.slice(0, 50)));
  }

  function getPayerName() {
    if (global.KaspiProfile && global.KaspiProfile.getName) {
      return global.KaspiProfile.getName();
    }
    return "Абильмажин А.";
  }

  function receiptId() {
    return String(Math.floor(1e11 + Math.random() * 9e11));
  }

  function formatDate(d) {
    var p = function (n) { return n < 10 ? "0" + n : String(n); };
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " +
      p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function formatDateGroup(d) {
    var months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return d.getDate() + " " + months[d.getMonth()];
  }

  function showScreen(id) {
    document.querySelectorAll(".pay-screen").forEach(function (s) {
      s.classList.toggle("active", s.id === id);
    });
    window.scrollTo(0, 0);
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("open");
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("open");
  }

  function renderCityList() {
    var list = document.getElementById("cityList");
    if (!list) return;
    var cur = getCity().id;
    list.innerHTML = CITIES.map(function (c) {
      return '<button type="button" class="pay-city-item' + (c.id === cur ? " selected" : "") +
        '" data-city="' + c.id + '">' + c.name + '<span>' + c.price + ' ₸</span></button>';
    }).join("");
    list.querySelectorAll("[data-city]").forEach(function (btn) {
      btn.onclick = function () {
        setCity(btn.getAttribute("data-city"));
        closeModal("cityModal");
        refreshPrices();
      };
    });
  }

  function refreshPrices() {
    var price = getPrice();
    document.querySelectorAll("[data-price-slot]").forEach(function (el) {
      el.textContent = formatMoney(price);
    });
    document.querySelectorAll("[data-price-short]").forEach(function (el) {
      el.textContent = formatMoneyShort(price);
    });
    document.querySelectorAll("[data-price-btn]").forEach(function (el) {
      el.textContent = "К оплате " + price + " ₸";
    });
    var confirmBtn = document.getElementById("confirmPayBtn");
    if (confirmBtn) confirmBtn.textContent = "К оплате " + price + " ₸";
  }

  function renderHistory() {
    var box = document.getElementById("historyList");
    if (!box) return;
    var items = getPayments();
    if (!items.length) {
      box.innerHTML = '<div class="pay-muted-center">Пока нет платежей</div>';
      return;
    }
    var groups = {};
    items.forEach(function (p) {
      var key = p.dateGroup || "Сегодня";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    var html = "";
    Object.keys(groups).forEach(function (g) {
      html += '<div class="pay-date-group">' + g + "</div>";
      groups[g].forEach(function (p, idx) {
        html +=
          '<div class="pay-item" data-pay-idx="' + p.id + '">' +
          '<div class="pay-item-icon"><img src="avtobus-logo.png" alt=""></div>' +
          '<div class="pay-item-main">' +
          '<div class="pay-item-title">' + SERVICE_TITLE + "</div>" +
          '<div class="pay-item-sub">' + (p.vehicleCode || "0") + "</div></div>" +
          '<div class="pay-item-amount">' + formatMoney(p.amount) + "</div></div>";
      });
    });
    box.innerHTML = html;
    box.querySelectorAll("[data-pay-idx]").forEach(function (row) {
      row.onclick = function () {
        var id = row.getAttribute("data-pay-idx");
        var pay = items.find(function (x) { return x.id === id; });
        if (pay) showReceipt(pay);
      };
    });
  }

  function showReceipt(pay) {
    var wrap = document.getElementById("receiptModal");
    if (!wrap) return;
    document.getElementById("receiptTitle").textContent = "Общественный транспорт";
    document.getElementById("receiptService").textContent = SERVICE_TITLE;
    document.getElementById("receiptCode").textContent = pay.vehicleCode || "—";
    document.getElementById("receiptSum").textContent = formatMoney(pay.amount);
    document.getElementById("receiptNo").textContent = pay.receiptNo;
    document.getElementById("receiptCommission").textContent = "0 ₸";
    document.getElementById("receiptTransport").textContent = pay.vehicleCode || "—";
    document.getElementById("receiptDate").textContent = pay.dateFull;
    document.getElementById("receiptName").textContent = pay.payerName;
    document.getElementById("receiptFrom").textContent = "Kaspi Gold";
    wrap.classList.add("open");
  }

  function bindPaymentsPage() {
    renderCityList();
    refreshPrices();

    document.querySelectorAll(".pay-tab").forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll(".pay-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var name = tab.getAttribute("data-tab");
        document.querySelectorAll("[data-panel]").forEach(function (p) {
          p.style.display = p.getAttribute("data-panel") === name ? "block" : "none";
        });
        if (name === "history") renderHistory();
      };
    });

    var locBtn = document.getElementById("openCityBtn");
    if (locBtn) locBtn.onclick = function () { renderCityList(); openModal("cityModal"); };

    var avtobusTile = document.getElementById("avtobusTile");
    if (avtobusTile) {
      avtobusTile.onclick = function () {
        showScreen("screenInput");
        var inp = document.getElementById("vehicleInput");
        if (inp) { inp.value = sessionStorage.getItem(VEHICLE_KEY) || ""; inp.focus(); }
      };
    }

    var backFromInput = document.getElementById("backFromInput");
    if (backFromInput) backFromInput.onclick = function () { showScreen("screenMain"); };

    var continueBtn = document.getElementById("continueBtn");
    if (continueBtn) {
      continueBtn.onclick = function () {
        var code = (document.getElementById("vehicleInput").value || "").trim() || "1233";
        sessionStorage.setItem(VEHICLE_KEY, code);
        document.getElementById("confirmVehicle").textContent = code;
        refreshPrices();
        showScreen("screenConfirm");
      };
    }

    var backFromConfirm = document.getElementById("backFromConfirm");
    if (backFromConfirm) backFromConfirm.onclick = function () { showScreen("screenInput"); };

    var confirmPayBtn = document.getElementById("confirmPayBtn");
    if (confirmPayBtn) {
      confirmPayBtn.onclick = function () {
        var price = getPrice();
        var cash = getCash();
        if (cash < price) {
          var modalBody = document.querySelector("#cameraModal .pay-modal-body");
          if (modalBody) {
            modalBody.innerHTML = "Недостаточно средств на Kaspi Gold.";
          }
          openModal("cameraModal");
          return;
        }
        setCash(cash - price);
        var bal = document.getElementById("cashBalance");
        if (bal) bal.textContent = getCash().toLocaleString("ru") + " ₸";
        var now = new Date();
        var code = sessionStorage.getItem(VEHICLE_KEY) || "1233";
        var rec = {
          id: String(Date.now()),
          amount: price,
          vehicleCode: code,
          city: getCity().name,
          receiptNo: receiptId(),
          dateFull: formatDate(now),
          dateGroup: formatDateGroup(now),
          payerName: getPayerName(),
        };
        addPayment(rec);
        document.getElementById("successSum").textContent = formatMoneyShort(price);
        showScreen("screenResult");
      };
    }

    var backFromResult = document.getElementById("backFromResult");
    if (backFromResult) backFromResult.onclick = function () { showScreen("screenMain"); };

    var toHistory = document.getElementById("toHistoryLink");
    if (toHistory) {
      toHistory.onclick = function () {
        showScreen("screenMain");
        document.querySelectorAll(".pay-tab").forEach(function (t) {
          t.classList.toggle("active", t.getAttribute("data-tab") === "history");
        });
        document.querySelectorAll("[data-panel]").forEach(function (p) {
          p.style.display = p.getAttribute("data-panel") === "history" ? "block" : "none";
        });
        renderHistory();
      };
    }

    var closeCity = document.getElementById("closeCityModal");
    if (closeCity) closeCity.onclick = function () { closeModal("cityModal"); };

    var closeReceipt = document.getElementById("closeReceipt");
    if (closeReceipt) closeReceipt.onclick = function () {
      document.getElementById("receiptModal").classList.remove("open");
    };

    var closeCamera = document.getElementById("closeCameraModal");
    if (closeCamera) closeCamera.onclick = function () { closeModal("cameraModal"); };

    var cashEl = document.getElementById("cashBalance");
    if (cashEl) cashEl.textContent = getCash().toLocaleString("ru") + " ₸";

    var backToPaymentsBtn = document.getElementById("backToPaymentsBtn");
    if (backToPaymentsBtn) {
      backToPaymentsBtn.onclick = function () {
        showScreen("screenMain");
        document.querySelectorAll(".pay-tab").forEach(function (t) {
          t.classList.toggle("active", t.getAttribute("data-tab") === "mine");
        });
        document.querySelectorAll("[data-panel]").forEach(function (p) {
          p.style.display = p.getAttribute("data-panel") === "mine" ? "block" : "none";
        });
      };
    }

    showScreen("screenMain");
  }

  function ensureCameraModal() {
    if (document.getElementById("cameraModal")) return;
    var wrap = document.createElement("div");
    wrap.className = "pay-overlay";
    wrap.id = "cameraModal";
    wrap.innerHTML =
      '<div class="pay-modal">' +
      '<div class="pay-modal-body">Нет доступа к камере.<br><br>Перейдите в настройки телефона и измените параметры приложения.</div>' +
      '<div class="pay-modal-actions"><button type="button" id="closeCameraModal">OK</button></div></div>';
    document.body.appendChild(wrap);
    document.getElementById("closeCameraModal").onclick = function () {
      closeModal("cameraModal");
    };
    if (!document.getElementById("kaspi-pay-modal-style")) {
      var link = document.createElement("link");
      link.id = "kaspi-pay-modal-style";
      link.rel = "stylesheet";
      link.href = "payments.css";
      document.head.appendChild(link);
    }
  }

  function showCameraDenied() {
    ensureCameraModal();
    openModal("cameraModal");
  }

  function initPaymentsNav(root) {
    ensureCameraModal();
    var scope = root || document;
    scope.querySelectorAll("[data-open-payments]").forEach(function (el) {
      el.style.cursor = "pointer";
      el.onclick = function (e) {
        e.preventDefault();
        location.href = "payments.html";
      };
    });
    scope.querySelectorAll("[data-kaspi-qr]").forEach(function (el) {
      el.onclick = function (e) {
        e.preventDefault();
        showCameraDenied();
      };
    });
    scope.querySelectorAll("[data-open-messages]").forEach(function (el) {
      el.onclick = function (e) {
        e.preventDefault();
        location.href = "messages.html";
      };
    });
  }

  global.KaspiPayments = {
    getCity: getCity,
    getPrice: getPrice,
    showCameraDenied: showCameraDenied,
    bindPaymentsPage: bindPaymentsPage,
    initPaymentsNav: initPaymentsNav,
    SERVICE_TITLE: SERVICE_TITLE,
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body.classList.contains("pay-body")) {
      bindPaymentsPage();
    }
    initPaymentsNav();
  });
})(window);
