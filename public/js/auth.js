// CaRảnh – xử lý đăng nhập / đăng ký, gọi /api/auth/*
(function () {
  var KEY = 'cr_session';

  var Auth = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    save: function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    role: function (user) { return (user && user.user_metadata && user.user_metadata.role) || 'seeker'; },
    home: function (role) { return role === 'employer' ? 'candidates.html' : 'jobs.html'; }
  };
  window.CR_AUTH = Auth;

  function api(path, body) {
    return fetch('/api/auth/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.success === false) throw new Error(j.error || j.message || 'Có lỗi xảy ra, vui lòng thử lại');
        return j.data;
      });
    });
  }

  // lỗi đặt ngay trên nút gửi, không tự ẩn
  function showMsg(form, text, kind) {
    var m = form.querySelector('.msg[data-auth-msg]');
    if (!m) {
      m = document.createElement('p');
      m.setAttribute('data-auth-msg', ''); m.setAttribute('role', 'alert');
      form.querySelector('button[type=submit]').insertAdjacentElement('beforebegin', m);
    }
    m.className = 'msg ' + (kind || 'err');
    m.textContent = text;
  }
  function busy(form, on, label) {
    var b = form.querySelector('button[type=submit]');
    if (on) { b.dataset.label = b.textContent; b.textContent = label; } else if (b.dataset.label) b.textContent = b.dataset.label;
    b.disabled = on;
  }

  function translate(msg) {
    var map = {
      'Invalid login credentials': 'Email hoặc mật khẩu không đúng',
      'Email not confirmed': 'Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn',
      'User already registered': 'Email này đã được đăng ký'
    };
    return map[msg] || msg;
  }

  function initLogin(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('#acc').value.trim(), password = form.querySelector('#pw').value;
      if (!email || !password) return showMsg(form, 'Vui lòng nhập email và mật khẩu');
      busy(form, true, 'Đang đăng nhập…');
      api('login', { email: email, password: password }).then(function (d) {
        Auth.save(d.session);
        location.href = Auth.home(Auth.role(d.user));
      }).catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
  }

  function initRegister(form) {
    var role = 'seeker';
    var picks = form.querySelectorAll('.role-pick button');
    var submit = form.querySelector('button[type=submit]');
    function setRole(r) {
      role = r;
      picks.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-role') === r)); });
      submit.textContent = r === 'employer' ? 'Tiếp tục · Thông tin cửa hàng' : 'Tiếp tục · Hồ sơ người tìm việc';
    }
    picks.forEach(function (b) { b.addEventListener('click', function () { setRole(b.getAttribute('data-role')); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) { return form.querySelector('#' + id).value.trim(); };
      var name = v('name'), phone = v('phone').replace(/[\s.]/g, ''), email = v('email');
      var pw = form.querySelector('#pw').value, pw2 = form.querySelector('#pw2').value;
      if (!name || !phone || !email || !pw) return showMsg(form, 'Vui lòng điền đủ các ô bắt buộc');
      if (!/^0\d{9}$/.test(phone)) return showMsg(form, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0');
      if (pw.length < 6) return showMsg(form, 'Mật khẩu tối thiểu 6 ký tự');
      if (pw !== pw2) return showMsg(form, 'Mật khẩu nhập lại không khớp');
      busy(form, true, 'Đang tạo tài khoản…');
      api('register', { email: email, password: pw, full_name: name, phone: phone, role: role }).then(function (d) {
        if (!d.session) {
          busy(form, false);
          return showMsg(form, 'Đã tạo tài khoản. Hãy xác nhận email rồi đăng nhập.', 'info');
        }
        Auth.save(d.session);
        location.href = role === 'employer' ? 'setup-employer.html' : 'setup-seeker.html';
      }).catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var f = document.querySelector('form[data-auth]');
    if (!f) return;
    if (f.getAttribute('data-auth') === 'login') initLogin(f); else initRegister(f);
  });
})();
