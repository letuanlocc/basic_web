'use client';
// Hộp thoại dùng chung (thay window.crDialog + data-gate + data-todo trong main.js).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconClose } from './Icons';

const Ctx = createContext(null);
export const useDialog = () => useContext(Ctx);

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null); // { title, body, actions }
  const box = useRef(null);
  const close = useCallback(() => setDlg(null), []);

  // open({ title, body, actions }): actions là node React; bỏ trống thì có nút "Đã hiểu"
  const open = useCallback((d) => setDlg(d), []);
  // Đòi đăng nhập (thay data-gate)
  const gate = useCallback(() => setDlg({
    title: 'Đăng nhập để xem chi tiết',
    body: 'Bạn cần có tài khoản để xem chi tiết công việc, ứng tuyển và đăng ký lịch làm.',
    actions: (<>
      <Link href="/login" className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={close}>Đăng nhập</Link>
      <Link href="/register" className="btn btn-block" onClick={close}>Tạo tài khoản mới</Link>
    </>),
  }), [close]);
  // Tính năng chưa làm (thay data-todo)
  const todo = useCallback((name) => setDlg({
    title: 'Tính năng chưa có sẵn',
    body: `“${name}” chưa được xây dựng. Hiện tại trang chỉ có giao diện, phần xử lý sẽ được bổ sung sau.`,
  }), []);

  useEffect(() => {
    if (!dlg) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const f = box.current && box.current.querySelector('button.btn, a.btn');
    if (f) f.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [dlg, close]);

  return (
    <Ctx.Provider value={{ open, close, gate, todo }}>
      {children}
      <div className="overlay" hidden={!dlg} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        {dlg && (
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t" ref={box}>
            <div className="head"><h2 id="dlg-t">{dlg.title}</h2>
              <button type="button" className="icon-btn" aria-label="Đóng" onClick={close}><IconClose /></button></div>
            <p id="dlg-b">{dlg.body}</p>
            <div id="dlg-a" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dlg.actions || <button type="button" className="btn btn-primary" style={{ marginTop: 4 }} onClick={close}>Đã hiểu</button>}
            </div>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
