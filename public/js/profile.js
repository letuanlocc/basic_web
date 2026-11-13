// CaRảnh – đọc/lưu hồ sơ qua /api/me. Dùng cho setup-seeker, profile, setup-employer, shop.
// Ô nhập: data-f="tên_cột". Nhóm nút chọn: data-chip="tên_cột" + data-v trên từng nút (data-multi cho chọn nhiều).
(function () {
  var A = window.CR_AUTH;
  var USER_FIELDS = ['full_name', 'phone'];
  var NUMERIC = ['birth_year', 'language_level'];

  function msg(form, text, kind) {
    var m = form.querySelector('.msg[data-auth-msg]');
    if (!m) {
      m = document.createElement('p');
      m.setAttribute('data-auth-msg', ''); m.setAttribute('role', 'alert');
      form.querySelector('.form-actions').insertAdjacentElement('beforebegin', m);
    }
    m.className = 'msg ' + (kind || 'err'); m.textContent = text;
  }

  function chipsOf(form, name) { return form.querySelectorAll('[data-chip="' + name + '"]'); }
  function setChips(form, name, values) {
    chipsOf(form, name).forEach(function (b) { b.setAttribute('aria-pressed', String(values.indexOf(b.getAttribute('data-v')) >= 0)); });
  }
  function getChips(form, name) {
    return Array.prototype.filter.call(chipsOf(form, name), function (b) { return b.getAttribute('aria-pressed') === 'true'; })
      .map(function (b) { return b.getAttribute('data-v'); });
  }

  function fill(form, data) {
    form.querySelectorAll('[data-f]').forEach(function (el) {
      var v = data[el.getAttribute('data-f')];
      if (v !== undefined && v !== null) el.value = v;
    });
    var names = {};
    form.querySelectorAll('[data-chip]').forEach(function (b) { names[b.getAttribute('data-chip')] = 1; });
    Object.keys(names).forEach(function (n) {
      var v = n === 'availability' ? (data.availability || []).map(function (a) { return a.slot; }) : data[n];
      if (v === undefined || v === null) return;
      setChips(form, n, Array.isArray(v) ? v : [String(v)]);
    });
  }

  function collect(form) {
    var out = {};
    form.querySelectorAll('[data-f]').forEach(function (el) {
      var v = el.value.trim(), k = el.getAttribute('data-f');
      out[k] = v === '' ? null : (NUMERIC.indexOf(k) >= 0 ? Number(v) : v);
    });
    var names = {};
    form.querySelectorAll('[data-chip]').forEach(function (b) { names[b.getAttribute('data-chip')] = b.parentNode.hasAttribute('data-multi'); });
    Object.keys(names).forEach(function (n) {
      var sel = getChips(form, n);
      if (names[n]) out[n] = sel;
      else if (n === 'has_experience') out[n] = sel.length ? sel[0] === 'true' : null;
      else out[n] = sel.length ? sel[0] : null;
    });
    return out;
  }

  // Hồ sơ cửa hàng phải đủ các mục này mới được lưu (server cũng kiểm tra lại)
  var SHOP_REQUIRED = [
    ['name', 'tên công ty / cửa hàng'], ['mode', 'hình thức làm việc'], ['industry', 'lĩnh vực'], ['city', 'tỉnh / thành phố'],
    ['ward', 'phường / xã'], ['address', 'địa chỉ cụ thể'], ['phone', 'SĐT cửa hàng']
  ];

  // Trả { text, field } hoặc null. field = tên cột để đưa con trỏ tới đúng ô.
  function validate(form, kind, d) {
    if (kind === 'shop') {
      for (var i = 0; i < SHOP_REQUIRED.length; i++) {
        if (!d[SHOP_REQUIRED[i][0]]) return { text: 'Vui lòng nhập ' + SHOP_REQUIRED[i][1], field: SHOP_REQUIRED[i][0] };
      }
    }
    if (d.phone && !/^0\d{9}$/.test(String(d.phone).replace(/[\s.]/g, ''))) return { text: 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0', field: 'phone' };
    if (kind === 'seeker' && d.full_name === null) return { text: 'Vui lòng nhập họ và tên', field: 'full_name' };
    if (kind === 'seeker' && d.birth_year && (d.birth_year < 1950 || d.birth_year > new Date().getFullYear() - 14)) return { text: 'Năm sinh không hợp lệ', field: 'birth_year' };
    if (kind === 'shop' && d.mode !== 'online' && form.querySelectorAll('#photos .thumb').length < 1) {
      return { text: 'Cửa hàng làm việc trực tiếp cần ít nhất 1 ảnh nơi làm việc', field: 'photos' };
    }
    return null;
  }
  function markInvalid(form, field) {
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    var el = field === 'photos' ? form.querySelector('#photo_pick')
      : form.querySelector('[data-f="' + field + '"]') || form.querySelector('[data-chip="' + field + '"]');
    if (!el) return;
    if (el.matches('input, select, textarea')) el.setAttribute('aria-invalid', 'true');
    el.focus();
  }

  // ---- Ảnh tải từ máy: nén bằng canvas rồi gửi data URL ----
  // opts: { maxW, maxH, ratio (rộng/cao, cắt giữa nếu có), quality }
  function readImage(file, opts) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Chỉ nhận ảnh JPG, PNG hoặc WEBP'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('Ảnh quá lớn (tối đa 15 MB)'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này')); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        var sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (opts.ratio) {
          if (sw / sh > opts.ratio) { var w = sh * opts.ratio; sx = (sw - w) / 2; sw = w; }
          else { var h = sw / opts.ratio; sy = (sh - h) / 2; sh = h; }
        }
        var k = Math.min(1, opts.maxW / sw, opts.maxH / sh);
        var c = document.createElement('canvas');
        c.width = Math.round(sw * k); c.height = Math.round(sh * k);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // PNG trong suốt → nền trắng
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', opts.quality || 0.82));
      };
      img.src = url;
    });
  }

  function drawAvatar(form) {
    var inp = form.querySelector('[data-f="avatar_url"]'), img = form.querySelector('#avatar_img'), ph = form.querySelector('#avatar_ph');
    if (!inp || !img) return;
    var rm = form.querySelector('#avatar_rm');
    img.hidden = !inp.value; ph.hidden = !!inp.value;
    if (rm) rm.hidden = !inp.value;
    if (inp.value) img.src = inp.value;
  }

  function init(form) {
    var kind = form.getAttribute('data-profile'); // seeker | shop
    var btn = form.querySelector('button[type=submit]');
    var label = btn.textContent;

    form.querySelectorAll('[data-chip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var multi = b.parentNode.hasAttribute('data-multi');
        if (multi) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        else chipsOf(form, b.getAttribute('data-chip')).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });

    function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function drawPhotos(photos) {
      var box = document.getElementById('photos'); if (!box) return;
      box.innerHTML = (photos || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; }).map(function (p) {
        return '<div class="thumb"><img src="' + esc(p.url) + '" alt="Ảnh nơi làm việc"><button type="button" data-rm="' + esc(p.id) + '" aria-label="Xóa ảnh">Xóa</button></div>';
      }).join('');
    }
    function reloadPhotos() { return A.call('GET', '/api/me').then(function (me) { drawPhotos(me.shop && me.shop.photos); }); }
    var pick = document.getElementById('photo_file');
    if (kind === 'shop' && pick) {
      var pickBtn = document.getElementById('photo_pick'), pickText = pickBtn.textContent;
      pickBtn.addEventListener('click', function () { pick.click(); });
      pick.addEventListener('change', function () {
        var files = Array.prototype.slice.call(pick.files || []);
        pick.value = '';
        if (!files.length) return;
        pickBtn.disabled = true; pickBtn.textContent = 'Đang tải ảnh…';
        var start = document.querySelectorAll('#photos .thumb').length;
        // tải lần lượt từng ảnh để giữ thứ tự
        files.reduce(function (p, f, i) {
          return p.then(function () { return readImage(f, { maxW: 1280, maxH: 1280, quality: 0.8 }); })
            .then(function (data) { return A.call('POST', '/api/me/shop/photos', { url: data, sort_order: start + i }); });
        }, Promise.resolve())
          .then(reloadPhotos)
          .catch(function (e) { msg(form, e.message); return reloadPhotos().catch(function () {}); })
          .then(function () { pickBtn.disabled = false; pickBtn.textContent = pickText; });
      });
      document.getElementById('photos').addEventListener('click', function (e) {
        var b = e.target.closest('[data-rm]'); if (!b) return;
        b.disabled = true;
        A.call('DELETE', '/api/me/shop/photos/' + b.getAttribute('data-rm')).then(reloadPhotos).catch(function (er) { b.disabled = false; msg(form, er.message); });
      });
    }

    // Ảnh thẻ người tìm việc: cắt giữa theo tỉ lệ 3×4, lưu cùng hồ sơ khi bấm Lưu
    var av = document.getElementById('avatar_file');
    if (kind === 'seeker' && av) {
      drawAvatar(form);
      av.addEventListener('change', function () {
        var f = av.files && av.files[0]; av.value = '';
        if (!f) return;
        readImage(f, { maxW: 360, maxH: 480, ratio: 3 / 4, quality: 0.85 }).then(function (data) {
          form.querySelector('[data-f="avatar_url"]').value = data;
          drawAvatar(form);
          msg(form, 'Đã chọn ảnh thẻ. Bấm lưu để cập nhật hồ sơ.', 'info');
        }).catch(function (e) { msg(form, e.message); });
      });
      var rm = document.getElementById('avatar_rm');
      if (rm) rm.addEventListener('click', function () { form.querySelector('[data-f="avatar_url"]').value = ''; drawAvatar(form); });
    }

    A.call('GET', '/api/me').then(function (me) {
      fill(form, Object.assign({}, me, kind === 'seeker' ? me.profile : me.shop));
      if (kind === 'shop' && me.shop) { fill(form, me.shop); drawPhotos(me.shop.photos); }
      if (kind === 'seeker') drawAvatar(form);
    }).catch(function (e) { msg(form, 'Không tải được hồ sơ: ' + e.message); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = collect(form), err = validate(form, kind, d);
      if (err) { markInvalid(form, err.field); return msg(form, err.text); }
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
      if (d.phone) d.phone = String(d.phone).replace(/[\s.]/g, '');
      btn.disabled = true; btn.textContent = 'Đang lưu…';
      var calls = [];
      if (kind === 'seeker') {
        var user = {}; USER_FIELDS.forEach(function (k) { if (d[k] !== undefined && d[k] !== null) user[k] = d[k]; });
        delete d.full_name; delete d.phone;
        if (Object.keys(user).length) calls.push(function () { return A.call('PUT', '/api/me', user); });
        calls.push(function () { return A.call('PUT', '/api/me/seeker', d); });
      } else {
        calls.push(function () { return A.call('PUT', '/api/me/shop', d); });
      }
      calls.reduce(function (p, c) { return p.then(c); }, Promise.resolve()).then(function () {
        var next = form.getAttribute('data-next');
        if (next) { location.href = next; return; }
        btn.disabled = false; btn.textContent = label;
        msg(form, 'Đã lưu hồ sơ.', 'ok');
      }).catch(function (er) {
        btn.disabled = false; btn.textContent = label;
        msg(form, /duplicate|unique|23505/i.test(er.message) ? 'Số điện thoại này đã được dùng bởi tài khoản khác' : er.message);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var f = document.querySelector('form[data-profile]');
    if (f && A) init(f);
  });
})();
