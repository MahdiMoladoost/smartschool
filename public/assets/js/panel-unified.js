(() => {
  'use strict';

  if (window.__panelUnifiedReady) return;
  window.__panelUnifiedReady = true;

  const body = document.body;
  if (!body?.dataset?.panel) return;

  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const state = { observerQueued: false };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const toFaNumber = value => String(value ?? '').replace(/\d/g, digit => faDigits[digit]);

  function toast(message, type = 'info', duration = 3600) {
    let stack = document.querySelector('.ux-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'ux-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }

    const item = document.createElement('div');
    item.className = `ux-toast ${type}`;
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
    item.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
    stack.appendChild(item);

    window.setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(6px)';
      window.setTimeout(() => item.remove(), 180);
    }, duration);
  }

  function renderState({ type = 'empty', title = '', message = '', actionLabel = '', action = null } = {}) {
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : type === 'loading' ? 'fa-spinner fa-spin' : 'fa-inbox';
    const safeTitle = title || (type === 'error' ? 'بارگذاری انجام نشد' : type === 'loading' ? 'در حال بارگذاری' : 'داده‌ای برای نمایش وجود ندارد');
    const actionHtml = actionLabel ? `<button type="button" class="btn secondary ux-state-action">${escapeHtml(actionLabel)}</button>` : '';
    const wrapper = document.createElement('div');
    wrapper.className = `ux-state ${type}`;
    wrapper.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><h3>${escapeHtml(safeTitle)}</h3>${message ? `<p>${escapeHtml(message)}</p>` : ''}${actionHtml}`;
    if (action && actionLabel) wrapper.querySelector('.ux-state-action')?.addEventListener('click', action);
    return wrapper;
  }

  function setBusy(element, busy, busyLabel = 'در حال انجام...') {
    if (!element) return;
    if (busy) {
      if (!element.dataset.uxOriginalHtml) element.dataset.uxOriginalHtml = element.innerHTML;
      element.disabled = true;
      element.setAttribute('aria-busy', 'true');
      element.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>${escapeHtml(busyLabel)}</span>`;
    } else {
      element.disabled = false;
      element.removeAttribute('aria-busy');
      if (element.dataset.uxOriginalHtml) {
        element.innerHTML = element.dataset.uxOriginalHtml;
        delete element.dataset.uxOriginalHtml;
      }
    }
  }

  function confirmAction({ title = 'تأیید عملیات', message = 'آیا از انجام این عملیات مطمئن هستید؟', confirmLabel = 'تأیید', danger = false } = {}) {
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ux-modal-backdrop show';
      backdrop.innerHTML = `
        <section class="ux-modal" role="dialog" aria-modal="true" aria-labelledby="uxConfirmTitle">
          <div class="ux-modal-header"><h3 id="uxConfirmTitle">${escapeHtml(title)}</h3><button type="button" class="btn secondary small" data-close aria-label="بستن"><i class="fas fa-times"></i></button></div>
          <div class="ux-modal-body"><p style="margin:0;line-height:1.9">${escapeHtml(message)}</p></div>
          <div class="ux-modal-footer"><button type="button" class="btn ${danger ? 'danger' : ''}" data-confirm>${escapeHtml(confirmLabel)}</button><button type="button" class="btn secondary" data-close>انصراف</button></div>
        </section>`;

      const close = result => {
        backdrop.remove();
        resolve(result);
      };
      backdrop.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => close(false)));
      backdrop.querySelector('[data-confirm]')?.addEventListener('click', () => close(true));
      backdrop.addEventListener('click', event => { if (event.target === backdrop) close(false); });
      document.body.appendChild(backdrop);
      backdrop.querySelector('[data-confirm]')?.focus();
    });
  }

  function exportTable(tableOrSelector, filename = 'report.csv') {
    const table = typeof tableOrSelector === 'string' ? document.querySelector(tableOrSelector) : tableOrSelector;
    if (!table) {
      toast('جدولی برای خروجی پیدا نشد.', 'warning');
      return;
    }

    const rows = [...table.querySelectorAll('tr')].filter(row => row.offsetParent !== null);
    const csv = rows.map(row => [...row.querySelectorAll('th,td')]
      .map(cell => `"${cell.innerText.replace(/"/g, '""').trim()}"`)
      .join(','))
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    toast('خروجی جدول آماده شد.', 'success');
  }

  function enhanceActiveNavigation() {
    const page = body.dataset.page;
    document.querySelectorAll('.nav-item').forEach(item => {
      const active = item.dataset.tab === page || item.classList.contains('active');
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    const activeLabel = document.querySelector('.nav-item[aria-current="page"] span')?.textContent?.trim();
    const pageTitle = document.getElementById('pageTitle');
    if (activeLabel && pageTitle && (!pageTitle.textContent.trim() || pageTitle.textContent.trim() === 'داشبورد')) {
      pageTitle.textContent = activeLabel;
    }
  }

  function enhanceButtonSemantics(root = document) {
    root.querySelectorAll('.btn-icon, .btn-icon-sm, [onclick]:not(button):not(a):not(input)').forEach(element => {
      if (element.dataset.uxKeyboardBound) return;
      element.dataset.uxKeyboardBound = '1';
      element.setAttribute('role', 'button');
      if (!element.hasAttribute('tabindex')) element.tabIndex = 0;
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          element.click();
        }
      });
    });

    root.querySelectorAll('button:not([type])').forEach(button => {
      if (!button.closest('form')) button.type = 'button';
    });
  }

  function enhanceForms(root = document) {
    root.querySelectorAll('form').forEach(form => {
      if (form.dataset.uxValidationBound) return;
      form.dataset.uxValidationBound = '1';

      form.addEventListener('submit', event => {
        const invalid = [...form.querySelectorAll('[required]')].filter(field => !field.checkValidity());
        form.querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
        if (!invalid.length) return;
        event.preventDefault();
        invalid.forEach(field => field.setAttribute('aria-invalid', 'true'));
        invalid[0].focus();
        toast('لطفاً فیلدهای الزامی را کامل و صحیح وارد کنید.', 'warning');
      }, true);

      form.addEventListener('input', event => {
        if (event.target.matches('[aria-invalid="true"]') && event.target.checkValidity()) {
          event.target.removeAttribute('aria-invalid');
        }
      });
    });
  }

  function enhanceTables(root = document) {
    root.querySelectorAll('table').forEach(table => {
      if (!table.closest('.table-wrap,.table-responsive,.ux-table-wrap')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ux-table-wrap';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }

      if (table.dataset.uxEnhanced) return;
      table.dataset.uxEnhanced = '1';
      const headings = [...table.querySelectorAll('thead th')].map(item => item.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(row => {
        [...row.children].forEach((cell, index) => {
          if (headings[index]) cell.dataset.label = headings[index];
        });
      });
    });
  }

  function enhanceStates(root = document) {
    root.querySelectorAll('.empty-state, .state').forEach(element => {
      if (element.dataset.uxStateEnhanced || element.children.length) return;
      element.dataset.uxStateEnhanced = '1';
      const text = element.textContent.trim();
      const loading = /بارگذاری|پردازش/.test(text);
      element.innerHTML = `<i class="fas ${loading ? 'fa-spinner fa-spin' : 'fa-inbox'}" aria-hidden="true"></i><span>${escapeHtml(text)}</span>`;
    });

    root.querySelectorAll('.badge, .status-badge').forEach(badge => {
      const normalized = badge.textContent.trim().toLowerCase().replace(/\s+/g, '_');
      const map = {
        فعال: 'active', موفق: 'success', ارسال_شده: 'success', حاضر: 'present', منتشرشده: 'published',
        در_انتظار: 'pending', باز: 'open', تأخیر: 'late', متوسط: 'medium',
        ناموفق: 'failed', لغوشده: 'cancelled', غایب: 'absent', بالا: 'high', فوری: 'urgent',
        برنامه‌ریزی_شده: 'scheduled', در_حال_پیگیری: 'in_progress', کم: 'low'
      };
      badge.classList.add(map[normalized] || normalized);
    });
  }

  function bindGlobalSearch() {
    const input = document.getElementById('globalSearch');
    if (!input || input.dataset.uxSearchBound) return;
    input.dataset.uxSearchBound = '1';

    let timer;
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const term = input.value.trim().toLocaleLowerCase('fa');
        const content = document.getElementById('contentArea') || document.getElementById('content') || document.querySelector('.content-area');
        if (!content) return;

        content.querySelectorAll('tbody tr, .searchable-item, .list-item').forEach(item => {
          item.hidden = Boolean(term) && !item.textContent.toLocaleLowerCase('fa').includes(term);
        });
      }, 120);
    });
  }

  function bindMobileAndModalControls() {
    document.querySelectorAll('.nav-item[href]').forEach(link => {
      if (link.dataset.uxMobileBound) return;
      link.dataset.uxMobileBound = '1';
      link.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open', 'show', 'active');
        document.getElementById('overlay')?.classList.remove('show', 'active');
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.ux-modal-backdrop.show, .modal-overlay.show, .modal-overlay.active').forEach(modal => {
        const closeButton = modal.querySelector('[data-close], .modal-close, .close, [aria-label="بستن"]');
        if (closeButton) closeButton.click();
        else modal.classList.remove('show', 'active');
      });
      document.getElementById('sidebar')?.classList.remove('open', 'show', 'active');
      document.getElementById('overlay')?.classList.remove('show', 'active');
    });
  }

  function bindNetworkStatus() {
    let banner = document.querySelector('.ux-network-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'ux-network-banner';
      banner.setAttribute('role', 'status');
      banner.textContent = 'اتصال اینترنت قطع است؛ برخی عملیات تا برقراری اتصال در دسترس نیست.';
      document.body.appendChild(banner);
    }

    const update = () => body.classList.toggle('is-offline', !navigator.onLine);
    window.addEventListener('online', () => { update(); toast('اتصال اینترنت برقرار شد.', 'success'); });
    window.addEventListener('offline', update);
    update();
  }

  function releaseStaleLoading() {
    const content = document.getElementById('contentArea') || document.getElementById('content');
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay || !content) return;
    const hasRealContent = content.children.length > 0 && !content.querySelector(':scope > .loading-content:only-child, :scope > .state:only-child');
    if (hasRealContent) overlay.classList.add('hidden');
  }

  function enhance(root = document) {
    enhanceActiveNavigation();
    enhanceButtonSemantics(root);
    enhanceForms(root);
    enhanceTables(root);
    enhanceStates(root);
    bindGlobalSearch();
    releaseStaleLoading();
  }

  function queueEnhance() {
    if (state.observerQueued) return;
    state.observerQueued = true;
    requestAnimationFrame(() => {
      state.observerQueued = false;
      enhance(document);
    });
  }

  window.PanelUX = Object.freeze({
    escapeHtml,
    toFaNumber,
    toast,
    renderState,
    setBusy,
    confirm: confirmAction,
    exportTable,
    enhance
  });

  document.addEventListener('DOMContentLoaded', () => {
    enhance(document);
    bindMobileAndModalControls();
    bindNetworkStatus();

    const target = document.getElementById('contentArea') || document.getElementById('content') || document.body;
    new MutationObserver(queueEnhance).observe(target, { childList: true, subtree: true });
  });
})();
