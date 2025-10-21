export function showNotification(message: string, type: 'info' | 'success' | 'error' = 'info', timeout = 4000) {
  if (typeof window === 'undefined') {
    // Server side - no-op
    console[type === 'error' ? 'error' : 'log'](message);
    return;
  }

  try {
    const containerId = 'bc-notify-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '16px';
      container.style.right = '16px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.textContent = message;
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
    el.style.color = '#fff';
    el.style.fontSize = '13px';
    el.style.maxWidth = '320px';
    el.style.wordBreak = 'break-word';
    el.style.opacity = '0';
    el.style.transition = 'opacity 180ms ease, transform 180ms ease';

    switch (type) {
      case 'success':
        el.style.background = '#16a34a';
        break;
      case 'error':
        el.style.background = '#dc2626';
        break;
      default:
        el.style.background = '#2563eb';
        break;
    }

    container.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    const tid = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => el.remove(), 200);
      clearTimeout(tid);
    }, timeout);
  } catch (error) {
    console.warn('Notification rendering failed:', error);
    // fallback for extreme cases when DOM manipulation fails
    try { window.alert(message); } catch {}
  }
}
