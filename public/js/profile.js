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

  function validate(kind, d) {
    if (d.phone && !/^0\d{9}$/.test(String(d.phone).replace(/[\s.]/g, ''))) return 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0';
    if (kind === 'seeker' && d.birth_year && (d.birth_year < 1950 || d.birth_year > new Date().getFullYear() - 14)) return 'Năm sinh không hợp lệ';
    if (kind === 'seeker' && d.full_name === null) return 'Vui lòng nhập họ và tên';
    if (kind === 'shop' && !d.name) return 'Vui lòng nhập tên công ty / cửa hàng';
    return '';
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
    var add = document.getElementById('photo_add');
    if (kind === 'shop' && add) {
      add.addEventListener('click', function () {
        var inp = document.getElementById('photo_url'), url = inp.value.trim();
        if (!/^https?:\/\/\S+$/i.test(url)) return msg(form, 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');
        add.disabled = true;
        A.call('POST', '/api/me/shop/photos', { url: url, sort_order: document.querySelectorAll('#photos .thumb').length })
          .then(function () { inp.value = ''; return reloadPhotos(); })
          .then(function () { add.disabled = false; })
          .catch(function (e) { add.disabled = false; msg(form, e.message); });
      });
      document.getElementById('photos').addEventListener('click', function (e) {
        var b = e.target.closest('[data-rm]'); if (!b) return;
        b.disabled = true;
        A.call('DELETE', '/api/me/shop/photos/' + b.getAttribute('data-rm')).then(reloadPhotos).catch(function (er) { b.disabled = false; msg(form, er.message); });
      });
    }

    A.call('GET', '/api/me').then(function (me) {
      fill(form, Object.assign({}, me, kind === 'seeker' ? me.profile : me.shop));
      if (kind === 'shop' && me.shop) { fill(form, me.shop); drawPhotos(me.shop.photos); }
    }).catch(function (e) { msg(form, 'Không tải được hồ sơ: ' + e.message); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = collect(form), err = validate(kind, d);
      if (err) return msg(form, err);
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
