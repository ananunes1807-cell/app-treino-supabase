(function initializeAlionAccessibility(global) {
  "use strict";

  function humanizeFieldName(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  }

  function enhanceFormControls(root = document) {
    root.querySelectorAll("input, select, textarea").forEach((control) => {
      if (control.labels?.length || control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby")) return;
      const accessibleName = control.placeholder || humanizeFieldName(control.name) || humanizeFieldName(control.id);
      if (accessibleName) control.setAttribute("aria-label", accessibleName);
    });
  }

  function updateActiveScreen(activeScreen) {
    document.querySelectorAll(".screen").forEach((screen) => {
      const active = screen === activeScreen;
      screen.setAttribute("aria-hidden", String(!active));
      if (active) screen.removeAttribute("inert");
      else screen.setAttribute("inert", "");
    });
  }

  function init() {
    enhanceFormControls();
    const activeScreen = document.querySelector(".screen.active");
    if (activeScreen) updateActiveScreen(activeScreen);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) enhanceFormControls(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  global.AlionAccessibility = Object.freeze({ enhanceFormControls, updateActiveScreen });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
