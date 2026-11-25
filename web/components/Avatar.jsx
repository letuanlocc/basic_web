// Ô ảnh đại diện: có ảnh thẻ thì đặt ảnh vào ô, không thì hiện chữ cái đầu. Ảnh đã được server kiểm tra (data URL JPG/PNG/WEBP).
const AVATAR = /^data:image\/(jpeg|png|webp);base64,/;

export const candidateName = (c) => (c.user && c.user.full_name) || 'Ứng viên';

export default function Avatar({ c, size = '' }) {
  return (
    <span className={('initial round ' + size).trim()} aria-hidden="true">
      {c.avatar_url && AVATAR.test(c.avatar_url)
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.avatar_url} alt="" decoding="async" />
        : candidateName(c).replace(/^\[[^\]]*\]\s*/, '').trim().charAt(0).toUpperCase()}
    </span>
  );
}
