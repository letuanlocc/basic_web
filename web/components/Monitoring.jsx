'use client';
// Google Analytics + Sentry phía trình duyệt, nạp sau khi trang tải xong (như startMonitoring trong main.js).
// ID/DSN lấy từ /api/config; chưa đặt thì bỏ qua.
import { useEffect } from 'react';

function loadScript(src, done) {
  const s = document.createElement('script');
  s.async = true; s.src = src; s.crossOrigin = 'anonymous';
  if (done) s.onload = done;
  document.head.appendChild(s);
}

export default function Monitoring() {
  useEffect(() => {
    const start = () => {
      fetch('/api/config').then((r) => r.json()).then((res) => {
        const c = res && res.data; if (!c) return;
        if (c.gaId) {
          window.dataLayer = window.dataLayer || [];
          window.gtag = function gtag() { window.dataLayer.push(arguments); };
          window.gtag('js', new Date());
          window.gtag('config', c.gaId, { anonymize_ip: true });
          loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(c.gaId));
        }
        if (c.sentryDsn) {
          loadScript('https://browser.sentry-cdn.com/8.35.0/bundle.min.js', () => {
            if (window.Sentry) window.Sentry.init({ dsn: c.sentryDsn, environment: c.environment, sendDefaultPii: false, tracesSampleRate: 0.1 });
          });
        }
      }).catch(() => { /* không có cấu hình thì thôi */ });
    };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
    return () => window.removeEventListener('load', start);
  }, []);
  return null;
}
