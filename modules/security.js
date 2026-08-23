(function initializeAlionSecurity(global) {
  "use strict";

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isPrimaryAdmin(user, profileRole, trustedServerFlag = false) {
    const normalizedRole = String(profileRole || "").trim().toLowerCase();
    return Boolean(user?.id)
      && trustedServerFlag === true
      && ["admin", "admin_ti", "ti", "controle"].includes(normalizedRole);
  }

  global.AlionSecurity = Object.freeze({
    isPrimaryAdmin,
    normalizeEmail
  });
})(window);
