// Ảnh tải từ máy: nén bằng canvas rồi trả data URL (JPEG).
// opts: { maxW, maxH, ratio (rộng/cao, cắt giữa nếu có), quality }
export function readImage(file, opts) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Chỉ nhận ảnh JPG, PNG hoặc WEBP'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Ảnh quá lớn (tối đa 15 MB)'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (opts.ratio) {
        if (sw / sh > opts.ratio) { const w = sh * opts.ratio; sx = (sw - w) / 2; sw = w; }
        else { const h = sw / opts.ratio; sy = (sh - h) / 2; sh = h; }
      }
      const k = Math.min(1, opts.maxW / sw, opts.maxH / sh);
      const c = document.createElement('canvas');
      c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // PNG trong suốt → nền trắng
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', opts.quality || 0.82));
    };
    img.src = url;
  });
}
