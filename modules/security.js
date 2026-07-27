(function initializeAlionSecurity(global) {
  "use strict";

  const ADMIN_EMAIL = "ananunes1807@gmail.com";

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isPrimaryAdmin(user, profileRole) {
    const normalizedRole = String(profileRole || "").trim().toLowerCase();
    return Boolean(user?.id)
      && normalizeEmail(user.email) === ADMIN_EMAIL
      && ["admin", "admin_ti", "ti", "controle"].includes(normalizedRole);
  }

  global.AlionSecurity = Object.freeze({
    ADMIN_EMAIL,
    isPrimaryAdmin,
    normalizeEmail
  });
})(window);
