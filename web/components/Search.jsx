'use client';
// Ô tìm trên thanh đầu trang dùng chung với trang bên dưới: trang đăng ký xử lý nhập/Enter qua useSearchHandlers.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const Ctx = createContext(null);

export function SearchProvider({ children }) {
  const [value, setValue] = useState('');
  const handlers = useRef({});
  const bind = useCallback((h) => { handlers.current = h || {}; }, []);
  return <Ctx.Provider value={{ value, setValue, handlers, bind }}>{children}</Ctx.Provider>;
}

export const useSearch = () => useContext(Ctx);

// Trang gọi: useSearchHandlers({ onInput(text), onSubmit(text) }) — gỡ khi rời trang.
export function useSearchHandlers(h) {
  const s = useSearch();
  const ref = useRef(h);
  ref.current = h;
  const { bind } = s;
  useEffect(() => {
    bind({
      onInput: (t) => ref.current.onInput && ref.current.onInput(t),
      onSubmit: (t) => ref.current.onSubmit && ref.current.onSubmit(t),
    });
    return () => bind({});
  }, [bind]);
}
