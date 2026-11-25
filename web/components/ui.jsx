// Các mảnh giao diện nhỏ dùng lại ở nhiều trang (class lấy từ style.css).
export const Badge = ({ kind = '', children }) => <span className={('badge ' + kind).trim()}>{children}</span>;

export function Empty({ title, sub }) {
  return (
    <div className="empty" role="status">
      <strong style={{ fontSize: 16 }}>{title}</strong>
      {sub ? <span className="muted small">{sub}</span> : null}
    </div>
  );
}

// Thông báo tại chỗ, không tự ẩn. msg = { text, kind } hoặc null
export function Notice({ msg, ...rest }) {
  if (!msg) return null;
  return <p className={'msg ' + (msg.kind || 'err')} role={msg.kind === 'info' ? 'status' : 'alert'} {...rest}>{msg.text}</p>;
}

// Ảnh quán: data URL (tải từ máy), đường dẫn nội bộ (/demo/...) hoặc https. Không nhận kiểu khác (vd javascript:).
const PHOTO_OK = /^(data:image\/(jpeg|png|webp);base64,|\/(?!\/)|https:\/\/)/;
export function ShopPhotos({ shop }) {
  const list = ((shop && shop.photos) || []).filter((p) => p && PHOTO_OK.test(p.url || ''))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (!list.length) return null;
  return (
    <div className="photos" role="group" aria-label="Ảnh nơi làm việc">
      {list.map((p, i) => (
        <figure key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={p.caption || ('Ảnh nơi làm việc của ' + (shop.name || 'cửa hàng'))} loading="lazy" decoding="async" />
          {p.caption ? <figcaption>{p.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}
