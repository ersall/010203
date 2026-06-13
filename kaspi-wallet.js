(function (global) {
  "use strict";

  var CASH_KEY = "kaspi_cash";
  var BONUS_KEY = "kaspi_bonus";
  var CARD_SUFFIX_KEY = "kaspi_card_suffix";

  function formatMoney(n) {
    return Number(n).toFixed(2).replace(".", ",") + " ₸";
  }

  function roundMoney(n) {
    var v = parseFloat(n);
    if (isNaN(v)) return 0;
    return Math.max(0, Math.round(v * 100) / 100);
  }

  function notifyBalanceChange() {
    try {
      document.dispatchEvent(new CustomEvent("kaspi:balance", {
        detail: { balance: getBalance() },
      }));
    } catch (_) {}
  }

  function getBalance() {
    var raw = localStorage.getItem(CASH_KEY);
    if (raw === null || raw === "") return 0;
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }

  function isLocalHost() {
    var h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  }

  function syncBalanceToServer() {
    if (isLocalHost()) return;
    try {
      fetch("/.netlify/functions/check-access", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_balance", balance: getBalance() }),
      }).catch(function () {});
    } catch (_) {}
  }

  function applyServerBalance(v) {
    localStorage.setItem(CASH_KEY, String(roundMoney(v)));
    notifyBalanceChange();
  }

  function setBalance(v, options) {
    options = options || {};
    localStorage.setItem(CASH_KEY, String(roundMoney(v)));
    notifyBalanceChange();
    if (!options.skipSync) syncBalanceToServer();
  }

  function adjustBalance(delta) {
    setBalance(getBalance() + (parseFloat(delta) || 0));
  }

  function resetBalance() {
    setBalance(0);
  }

  function getBonus() {
    var raw = localStorage.getItem(BONUS_KEY);
    if (raw === null || raw === "") return 0;
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }

  function setBonus(v) {
    localStorage.setItem(BONUS_KEY, String(v));
  }

  function getCardSuffix() {
    return localStorage.getItem(CARD_SUFFIX_KEY) || "6977";
  }

  global.KaspiWallet = {
    CASH_KEY: CASH_KEY,
    BONUS_KEY: BONUS_KEY,
    getBalance: getBalance,
    setBalance: setBalance,
    applyServerBalance: applyServerBalance,
    adjustBalance: adjustBalance,
    resetBalance: resetBalance,
    getBonus: getBonus,
    setBonus: setBonus,
    getCardSuffix: getCardSuffix,
    formatMoney: formatMoney,
  };
})(window);
