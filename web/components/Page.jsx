'use client';
// Khung một trang: chặn người chưa đăng nhập/sai vai trò (như guard() trong auth.js), dựng header + thanh dưới.
//   layout  guest | plain | overview | seeker | employer
//   active  mục đang mở trong menu (data-active)
//   require 'seeker' | 'employer' | 'any' | '' (mặc định theo layout seeker/employer)
//   isPublic  khách xem được: chưa đăng nhập thì hiện giao diện khách thay vì đẩy về /login
//   wide    chân trang rộng (overview)
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Auth } from '@/lib/auth';
import { BottomNav, Header } from './Header';

export function Footer({ wide }) {
  if (wide) {
    return (
      <footer className="foot"><div className="wrap-lg tw-pt-6 tw-pb-6 tw-flex tw-flex-wrap tw-justify-between tw-gap-3 tw-text-ink-3 tw-text-[14px]"><span>© CaRảnh · Bản quyền thuộc nhóm phát triển</span><span>Prototype – dữ liệu mẫu</span></div></footer>
    );
  }
  return (
    <footer className="foot"><div className="wrap"><span>© CaRảnh · Bản quyền thuộc nhóm phát triển</span><Link href="/overview">Tìm hiểu các chức năng</Link></div></footer>
  );
}

export default function Page({ layout, active = '', cta, require, isPublic = false, wide = false, noFooter = false, children }) {
  const router = useRouter();
  const need = require || (layout === 'seeker' || layout === 'employer' ? layout : '');
  const [state, setState] = useState(need ? 'checking' : 'ready'); // checking | ready
  const [eff, setEff] = useState(layout);

  useEffect(() => {
    if (!need) return undefined;
    let dead = false;
    (async () => {
      if (isPublic && !Auth.get()) { if (!dead) { setEff('guest'); setState('ready'); } return; }
      const s0 = await Auth.session();
      if (dead) return;
      if (!s0 && isPublic) { setEff('guest'); setState('ready'); return; }
      if (!s0) { router.replace('/login'); return; }
      const role = Auth.role(s0.user);
      if (need !== 'any' && role !== need) { router.replace(Auth.home(role)); return; }
      setState('ready');
    })();
    return () => { dead = true; };
  }, [need, isPublic, router]);

  if (state !== 'ready') return null; // chưa biết quyền: không vẽ gì để khỏi nháy giao diện sai
  return (
    <div className="page">
      <Header layout={eff} active={active} cta={cta} />
      {children}
      {!noFooter && layout !== 'plain' && <Footer wide={wide} />}
      <BottomNav layout={eff} active={active} />
    </div>
  );
}
