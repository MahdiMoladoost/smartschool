// Basic client-side safety helpers for legacy homepage pages.
(function () {
  window.escapeSmartSchoolHtml = function escapeSmartSchoolHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  };
})();
