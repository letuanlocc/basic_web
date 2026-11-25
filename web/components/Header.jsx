'use client';
// Thanh đầu trang + thanh điều hướng dưới (mobile) cho 5 layout: guest | plain | overview | seeker | employer.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Auth } from '@/lib/auth';
import { useDialog } from './Dialog';
import { useSearch } from './Search';
import { IconBrief, IconCal, IconHome, IconInfo, IconLogo, IconOut, IconSearch, IconShop, IconUser } from './Icons';

const Brand = ({ href }) => (
  <Link className="brand" href={href} aria-label="CaRảnh – trang chủ"><span className="logo" aria-hidden="true"><IconLogo /></span>CaRảnh</Link>
);

function SearchForm({ placeholder, label, onEmployerGo }) {
  const s = useSearch();
  const submit = (e) => {
    e.preventDefault();
    const term = s.value.trim();
    if (s.handlers.current.onSubmit) s.handlers.current.onSubmit(term);
    else if (onEmployerGo) onEmployerGo(term);
  };
  const change = (e) => {
    s.setValue(e.target.value);
    if (s.handlers.current.onInput) s.handlers.current.onInput(e.target.value.trim());
  };
  return (
    <form className="search" role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="q">{label ? 'Tìm ứng viên' : 'Tìm kiếm'}</label>
      <div className="box"><IconSearch />
        <input id="q" type="search" placeholder={placeholder} value={s.value} onChange={change} maxLength={label ? 200 : undefined} />
      </div>
      {label && <button type="submit" className="btn" style={{ color: '#5B6270' }}>{label}</button>}
    </form>
  );
}

function useInitial() {
  const [ch, setCh] = useState('T');
  useEffect(() => {
    const s = Auth.get();
    const n = s && s.user && s.user.user_metadata && s.user.user_metadata.full_name;
    if (n) setCh(n.trim().split(/\s+/).pop().charAt(0).toUpperCase());
  }, []);
  return ch;
}

const cur = (a, k) => (a === k ? { 'aria-current': 'page' } : {});

export function Header({ layout, active = '', cta }) {
  const router = useRouter();
  const dlg = useDialog();
  const ch = useInitial();
  const logout = () => { Auth.clear(); };

  if (layout === 'guest') {
    return (
      <header className="cr-header"><div className="bar"><Brand href="/" />
        <SearchForm placeholder="Tìm tất cả thứ gì bạn muốn — vd: phục vụ, Hải Châu" />
        <nav className="nav desknav" aria-label="Khách">
          <Link className="link" href="/overview">Giới thiệu</Link>
          <button type="button" className="link" onClick={dlg.gate}>Xem công việc</button><span className="sep" aria-hidden="true" />
          <Link className="link strong" href="/login">Đăng nhập</Link>
          <Link className="btn btn-primary" style={{ marginLeft: 4 }} href="/register">Đăng ký</Link></nav></div></header>
    );
  }
  if (layout === 'plain') {
    return (
      <header className="cr-header lg"><div className="bar"><Brand href="/" />
        {cta === 'login' && <Link className="btn" style={{ fontWeight: 700 }} href="/login">Đăng nhập</Link>}
        {cta === 'register' && <Link className="btn" style={{ fontWeight: 700 }} href="/register">Đăng ký</Link>}</div></header>
    );
  }
  if (layout === 'overview') {
    return (
      <header className="cr-header lg"><div className="bar"><Brand href="/" />
        <nav className="nav" aria-label="Chính"><Link className="link strong" href="/">Xem việc làm</Link><Link className="link strong" href="/login">Đăng nhập</Link>
          <Link className="btn btn-primary" href="/register">Đăng ký</Link></nav></div></header>
    );
  }
  if (layout === 'seeker') {
    return (
      <header className="cr-header"><div className="bar"><Brand href="/jobs" />
        <SearchForm placeholder="Tìm theo tên việc, quán, khu vực…" />
        <nav className="nav desknav" aria-label="Người tìm việc">
          <Link className="link strong" href="/my-jobs" {...cur(active, 'mine')}>Xem công việc</Link>
          <Link className="link strong" href="/profile" {...cur(active, 'profile')}><span className="avatar" aria-hidden="true">{ch}</span>Tài khoản</Link>
          <Link className="link" href="/" onClick={logout}><IconOut />Đăng xuất</Link></nav></div></header>
    );
  }
  // employer
  const items = [['candidates', '/candidates', 'Ứng viên'], ['positions', '/positions', 'Vị trí & tuyển dụng'],
    ['staff', '/staff-schedule', 'Lịch làm'], ['shop', '/shop', 'Hồ sơ cửa hàng']];
  return (
    <header className="cr-header"><div className="bar"><Brand href="/candidates" />
      <SearchForm placeholder="Tên, kỹ năng, khu vực — vd: Minh An, pha chế, Hải Châu" label="Tìm"
        onEmployerGo={(term) => router.push('/candidates' + (term ? '?q=' + encodeURIComponent(term) : ''))} />
      <div className="nav"><Link className="link strong" href="/shop"><span className="avatar" aria-hidden="true">{ch}</span>Cửa hàng</Link>
        <Link className="link" href="/" onClick={logout}><IconOut />Đăng xuất</Link></div></div>
      <nav className="subnav" aria-label="Nhà tuyển dụng"><div className="bar">
        {items.map(([k, href, text]) => (
          <button key={k} type="button" className={active === k ? 'active' : ''} onClick={() => router.push(href)} {...cur(active, k)}>{text}</button>
        ))}
        <button type="button" className="cta" onClick={() => router.push('/new-post')} {...cur(active, 'new')}>+ Đăng tin tuyển</button>
      </div></nav></header>
  );
}

export function BottomNav({ layout, active = '' }) {
  const dlg = useDialog();
  const on = (k) => (active === k ? 'on' : undefined);
  let links = null;
  if (layout === 'guest') {
    links = (<>
      <Link href="/" className="on" aria-current="page"><IconHome />Trang chủ</Link>
      <button type="button" onClick={dlg.gate}><IconBrief />Xem công việc</button>
      <Link href="/overview"><IconInfo />Giới thiệu</Link><Link href="/login"><IconUser />Đăng nhập</Link></>);
  } else if (layout === 'seeker') {
    links = (<>
      <Link href="/jobs" className={on('home')}><IconHome />Trang chủ</Link><Link href="/my-jobs" className={on('mine')}><IconBrief />Công việc</Link>
      <Link href="/schedule" className={on('schedule')}><IconCal />Lịch</Link><Link href="/profile" className={on('profile')}><IconUser />Hồ sơ</Link></>);
  } else if (layout === 'employer') {
    links = (<>
      <Link href="/candidates" className={on('candidates')}><IconUser />Ứng viên</Link><Link href="/positions" className={on('positions')}><IconBrief />Vị trí</Link>
      <Link href="/staff-schedule" className={on('staff')}><IconCal />Lịch</Link><Link href="/shop" className={on('shop')}><IconShop />Cửa hàng</Link></>);
  }
  return links ? <nav className="bottomnav" aria-label="Điều hướng nhanh">{links}</nav> : null;
}
