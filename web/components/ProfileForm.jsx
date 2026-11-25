'use client';
// Logic dùng chung cho 4 form hồ sơ: profile + setup-seeker (kind "seeker"), setup-employer + shop (kind "shop").
// Giá trị lưu theo tên cột trong DB. Nhóm nút chọn: Chips (chọn một, hoặc multi = chọn nhiều).
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@/lib/auth';
import { readImage } from '@/lib/image';

const USER_FIELDS = ['full_name', 'phone'];
const NUMERIC = ['birth_year', 'language_level'];

// Hồ sơ cửa hàng phải đủ các mục này mới được lưu (server cũng kiểm tra lại)
const SHOP_REQUIRED = [
  ['name', 'tên công ty / cửa hàng'], ['mode', 'hình thức làm việc'], ['industry', 'lĩnh vực'], ['city', 'tỉnh / thành phố'],
  ['ward', 'phường / xã'], ['address', 'địa chỉ cụ thể'], ['phone', 'SĐT cửa hàng'],
];

// Trả { text, field } hoặc null. field = tên cột để đưa con trỏ tới đúng ô.
function validate(kind, d, photoCount) {
  if (kind === 'shop') {
    for (const [k, label] of SHOP_REQUIRED) if (!d[k]) return { text: 'Vui lòng nhập ' + label, field: k };
  }
  if (d.phone && !/^0\d{9}$/.test(String(d.phone).replace(/[\s.]/g, ''))) return { text: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0', field: 'phone' };
  if (kind === 'seeker' && d.full_name === null) return { text: 'Vui lòng nhập họ và tên', field: 'full_name' };
  if (kind === 'seeker' && d.birth_year && (d.birth_year < 1950 || d.birth_year > new Date().getFullYear() - 14)) return { text: 'Năm sinh không hợp lệ', field: 'birth_year' };
  if (kind === 'shop' && d.mode !== 'online' && photoCount < 1) return { text: 'Cửa hàng làm việc trực tiếp cần ít nhất 1 ảnh nơi làm việc', field: 'photos' };
  return null;
}

// Chuyển giá trị trên form thành dữ liệu gửi server
function collect(v, multiKeys) {
  const out = {};
  Object.keys(v).forEach((k) => {
    const val = v[k];
    if (multiKeys.indexOf(k) >= 0) { out[k] = val; return; }
    if (k === 'has_experience') { out[k] = val === '' ? null : val === 'true'; return; }
    const t = String(val == null ? '' : val).trim();
    out[k] = t === '' ? null : (NUMERIC.indexOf(k) >= 0 ? Number(t) : t);
  });
  return out;
}

// kind: 'seeker' | 'shop'; defaults: giá trị ban đầu; multi: các khóa chọn nhiều; next: đường dẫn sau khi lưu (setup)
export function useProfileForm({ kind, defaults, multi = [], next }) {
  const router = useRouter();
  const [v, setV] = useState(defaults);
  const [photos, setPhotos] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [invalid, setInvalid] = useState('');
  const formRef = useRef(null);
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const bind = (k) => ({ name: k, value: v[k] == null ? '' : v[k], onChange: (e) => set(k, e.target.value), 'aria-invalid': invalid === k ? 'true' : undefined });

  // Nạp hồ sơ hiện có: chỉ ghi đè ô nào có dữ liệu
  const load = async () => {
    try {
      const me = await Auth.call('GET', '/api/me');
      const data = kind === 'seeker' ? Object.assign({}, me, me.profile) : Object.assign({}, me.shop);
      setV((x) => {
        const n = { ...x };
        Object.keys(x).forEach((k) => {
          const val = k === 'availability' ? (data.availability || []).map((a) => a.slot) : data[k];
          if (val === undefined || val === null) return;
          n[k] = k === 'has_experience' ? String(val) : val;
        });
        return n;
      });
      if (kind === 'shop') setPhotos((me.shop && me.shop.photos) || []);
    } catch (e) { setMsg({ text: 'Không tải được hồ sơ: ' + e.message }); }
  };

  const reloadPhotos = async () => { const me = await Auth.call('GET', '/api/me'); setPhotos((me.shop && me.shop.photos) || []); };

  async function onPhotoFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const start = photos.length;
    try {
      // tải lần lượt từng ảnh để giữ thứ tự
      for (let i = 0; i < files.length; i++) {
        const data = await readImage(files[i], { maxW: 1280, maxH: 1280, quality: 0.8 });
        await Auth.call('POST', '/api/me/shop/photos', { url: data, sort_order: start + i });
      }
      await reloadPhotos();
    } catch (er) { setMsg({ text: er.message }); try { await reloadPhotos(); } catch (x) { /* bỏ qua */ } }
    setUploading(false);
  }
  async function removePhoto(id) {
    try { await Auth.call('DELETE', '/api/me/shop/photos/' + id); await reloadPhotos(); } catch (er) { setMsg({ text: er.message }); }
  }

  // Ảnh thẻ người tìm việc: cắt giữa theo tỉ lệ 3×4, lưu cùng hồ sơ khi bấm Lưu
  async function onAvatarFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      set('avatar_url', await readImage(f, { maxW: 360, maxH: 480, ratio: 3 / 4, quality: 0.85 }));
      setMsg({ kind: 'info', text: 'Đã chọn ảnh thẻ. Bấm lưu để cập nhật hồ sơ.' });
    } catch (er) { setMsg({ text: er.message }); }
  }

  async function submit(e) {
    e.preventDefault();
    const d = collect(v, multi);
    const err = validate(kind, d, photos.length);
    if (err) {
      setInvalid(err.field); setMsg({ text: err.text });
      const el = err.field === 'photos' ? document.getElementById('photo_pick')
        : formRef.current && (formRef.current.elements[err.field] || formRef.current.querySelector('[data-chip="' + err.field + '"]'));
      if (el && el.focus) el.focus();
      return;
    }
    setInvalid('');
    if (d.phone) d.phone = String(d.phone).replace(/[\s.]/g, '');
    setBusy(true); setMsg(null);
    try {
      if (kind === 'seeker') {
        const user = {};
        USER_FIELDS.forEach((k) => { if (d[k] !== undefined && d[k] !== null) user[k] = d[k]; });
        delete d.full_name; delete d.phone;
        if (Object.keys(user).length) await Auth.call('PUT', '/api/me', user);
        await Auth.call('PUT', '/api/me/seeker', d);
      } else {
        await Auth.call('PUT', '/api/me/shop', d);
      }
      if (next) { router.push(next); return; }
      setBusy(false); setMsg({ kind: 'ok', text: 'Đã lưu hồ sơ.' });
    } catch (er) {
      setBusy(false);
      setMsg({ text: /duplicate|unique|23505/i.test(er.message) ? 'Số điện thoại này đã được dùng bởi tài khoản khác' : er.message });
    }
  }

  return { v, set, bind, photos, msg, busy, uploading, formRef, load, submit, onPhotoFiles, removePhoto, onAvatarFile, setMsg };
}

// Nhóm nút chọn: chọn một (bấm lại vẫn giữ) hoặc chọn nhiều
export function Chips({ form, name, options, multi = false }) {
  const cur = form.v[name];
  const on = (val) => (multi ? cur.indexOf(val) >= 0 : cur === val);
  const click = (val) => {
    if (multi) form.set(name, cur.indexOf(val) >= 0 ? cur.filter((x) => x !== val) : cur.concat(val));
    else form.set(name, val);
  };
  return (
    <div className="chips">
      {options.map(([val, text]) => (
        <button key={val} type="button" className="chip lg solid" aria-pressed={on(val)} data-chip={name} onClick={() => click(val)}>{text}</button>
      ))}
    </div>
  );
}

export const LANG_OPTIONS = [['0', 'Chưa có'], ['1', 'Giao tiếp cơ bản'], ['2', 'Khá (IELTS 5.0–6.0 hoặc tương đương)'], ['3', 'Tốt (IELTS 6.5+ hoặc tương đương)']];
export const AREAS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Liên Chiểu', 'Ngũ Hành Sơn'];
export const INDUSTRIES = ['Ăn uống – F&B', 'Bán lẻ', 'Giáo dục – gia sư', 'Văn phòng – nhập liệu', 'Sáng tạo nội dung'];
export const SLOT_OPTIONS = [['morning', 'Sáng'], ['afternoon', 'Chiều'], ['evening', 'Tối'], ['weekend', 'Cuối tuần']];
export const SEEKER_MODE_OPTIONS = [['online', 'Online'], ['offline', 'Offline'], ['both', 'Cả hai']];
export const SEEKER_DEFAULTS = {
  avatar_url: '', full_name: '', birth_year: '', phone: '', gender: '', area: '', language_level: '0', work_mode: '', availability: [],
  strengths: '', improvements: '', has_experience: '', experience: '', availability_note: '',
};
export const SHOP_DEFAULTS = { name: '', mode: '', industry: '', city: '', ward: '', address: '', phone: '', fanpage_url: '' };

// Khối ảnh thẻ 3×4 (người tìm việc)
export function AvatarPick({ form }) {
  const src = form.v.avatar_url;
  return (
    <div className="avatar-pick" style={{ width: 150 }}>
      <label className="drop photo-id" htmlFor="avatar_file" style={{ width: 150, height: 200 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="Ảnh thẻ của bạn" /> : null}
        {!src && (
          <span className="avatar-ph"><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>Tải ảnh thẻ 3×4</span>
        )}
      </label>
      <input id="avatar_file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={form.onAvatarFile} />
      <p className="tiny muted" style={{ margin: 0 }}>Phải là <strong>ảnh thẻ</strong>: chụp chính diện, rõ mặt, nền trơn, không đội mũ hay đeo kính râm. Ảnh tự cắt theo tỉ lệ 3×4.</p>
      <button type="button" className="btn btn-sm" hidden={!src} onClick={() => form.set('avatar_url', '')}>Xóa ảnh</button>
    </div>
  );
}

// Khối ảnh nơi làm việc (cửa hàng)
export function ShopPhotosField({ form }) {
  const ref = useRef(null);
  const list = form.photos.slice().sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="field"><span className="lab">Ảnh nơi làm việc (mặt tiền, khu vực làm việc, quầy)</span>
      <div id="photos" className="thumbs">
        {list.map((p) => (
          <div className="thumb" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="Ảnh nơi làm việc" />
            <button type="button" aria-label="Xóa ảnh" onClick={() => form.removePhoto(p.id)}>Xóa</button>
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" id="photo_pick" disabled={form.uploading} onClick={() => ref.current && ref.current.click()}>{form.uploading ? 'Đang tải ảnh…' : 'Tải ảnh từ máy'}</button>
        <input id="photo_file" ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={form.onPhotoFiles} />
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>Cửa hàng làm việc trực tiếp (offline) cần ít nhất 1 ảnh mới đăng được tin. Chọn ảnh JPG, PNG hoặc WEBP từ máy (tối đa 8 ảnh, có thể chọn nhiều ảnh một lần); ảnh lớn được tự thu nhỏ.</p></div>
  );
}
