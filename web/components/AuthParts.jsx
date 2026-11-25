'use client';
// Các phần dùng chung của form tài khoản: ô mật khẩu có nút Hiện/Ẩn + thanh độ mạnh, thông báo, đếm ngược.
import { useEffect, useRef, useState } from 'react';
import { pwError } from '@/lib/auth';

export function PasswordInput({ meter = false, ...props }) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState('');
  let lvl = null;
  let text = 'Tối thiểu 8 ký tự, gồm cả chữ và số';
  if (val) {
    if (pwError(val)) { lvl = 'weak'; text = 'Yếu · cần tối thiểu 8 ký tự, gồm cả chữ và số'; }
    else if (val.length >= 12 || /[^A-Za-z0-9]/.test(val)) { lvl = 'strong'; text = 'Mạnh'; }
    else { lvl = 'mid'; text = 'Khá · thêm ký tự đặc biệt hoặc dài hơn sẽ mạnh hơn'; }
    text = 'Độ mạnh: ' + text;
  }
  return (
    <>
      <span className="pw-wrap">
        <input {...props} type={show ? 'text' : 'password'} onChange={(e) => { setVal(e.target.value); if (props.onChange) props.onChange(e); }} />
        <button type="button" className="pw-toggle" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow(!show)}>{show ? 'Ẩn' : 'Hiện'}</button>
      </span>
      {meter && <p className="pw-meter" data-lvl={lvl || undefined}>{text}</p>}
    </>
  );
}

// Thông báo ngay trên nút gửi, không tự ẩn. msg = { text, kind } hoặc null.
export function Msg({ msg }) {
  if (!msg) return null;
  return <p className={'msg ' + (msg.kind || 'err')} role="alert">{msg.text}</p>;
}

// Khóa nút và đếm ngược giây (tránh bấm dồn làm hết hạn mức gửi mail)
export function useCountdown() {
  const [left, setLeft] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (left <= 0) return undefined;
    timer.current = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [left]);
  return [left, setLeft];
}
