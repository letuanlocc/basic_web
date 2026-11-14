// Ảnh do người dùng tải từ máy lên: trình duyệt nén lại rồi gửi dạng data URL (JPEG/PNG/WEBP, base64).
// Không nhận đường dẫn http(s) ngoài.
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Trả chuỗi lỗi hoặc '' nếu hợp lệ. maxBytes tính trên dung lượng ảnh sau giải mã. */
function checkImage(v, maxBytes) {
  if (typeof v !== 'string' || !DATA_URL.test(v)) return 'Ảnh phải được tải lên từ máy (JPG, PNG hoặc WEBP)';
  const bytes = Math.floor((v.length - v.indexOf(',') - 1) * 3 / 4);
  if (bytes > maxBytes) return `Ảnh quá lớn (tối đa ${Math.round(maxBytes / 1024)} KB sau khi nén)`;
  return '';
}

module.exports = { checkImage };
