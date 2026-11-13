// CaRảnh – đăng nhập / đăng ký / tài khoản, gọi /api/auth/*
(function () {
  var KEY = 'cr_session';

  // Phiên nằm ở localStorage (ghi nhớ) hoặc sessionStorage (chỉ đến khi đóng trình duyệt)
  function pick() {
    try { if (sessionStorage.getItem(KEY)) return sessionStorage; } catch (e) {}
    return localStorage;
  }
  var Auth = {
    get: function () {
      try { return JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY)); } catch (e) { return null; }
    },
    // remember: true/false khi đăng nhập; bỏ trống thì giữ nguyên nơi lưu hiện tại (vd. khi làm mới token)
    save: function (s, remember) {
      try {
        var keep = remember === undefined ? pick() : (remember ? localStorage : sessionStorage);
        localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
        keep.setItem(KEY, JSON.stringify(s));
      } catch (e) {}
    },
    clear: function () { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {} },
    role: function (user) { return (user && user.user_metadata && user.user_metadata.role) || 'seeker'; },
    home: function (role) { return role === 'employer' ? 'candidates.html' : 'jobs.html'; }
  };
  window.CR_AUTH = Auth;

  Auth.valid = function (sess) { return !!(sess && sess.access_token && sess.expires_at * 1000 > Date.now() + 10000); };

  // Làm mới token bằng refresh_token; trả về session mới hoặc null
  Auth.refresh = function () {
    var cur = Auth.get();
    if (!cur || !cur.refresh_token) return Promise.resolve(null);
    return fetch('/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: cur.refresh_token })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.success || !j.data.session) { Auth.clear(); return null; }
      Auth.save(j.data.session); return j.data.session;
    }).catch(function () { return null; });
  };

  // Gọi API có token. Hết hạn thì tự làm mới; không được thì về trang đăng nhập.
  Auth.call = function (method, url, body) {
    function go(sess) {
      return fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.access_token },
        body: body === undefined ? undefined : JSON.stringify(body)
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j }; }); });
    }
    function fail(res) { var e = new Error((res.json && res.json.message) || 'Có lỗi xảy ra, vui lòng thử lại'); e.status = res.status; throw e; }
    function toLogin() { Auth.clear(); location.replace('login.html'); return new Promise(function () {}); }
    var sess = Auth.get();
    var ready = Auth.valid(sess) ? Promise.resolve(sess) : Auth.refresh();
    return ready.then(function (s0) {
      if (!s0) return toLogin();
      return go(s0).then(function (res) {
        if (res.status !== 401) return res;
        return Auth.refresh().then(function (s1) { return s1 ? go(s1) : toLogin(); });
      });
    }).then(function (res) { if (!res.json.success) fail(res); return res.json.data; });
  };

  // ---- Chặn người chưa đăng nhập / sai vai trò (chạy ngay khi nạp script, trước khi vẽ trang) ----
  (function guard() {
    var el = document.querySelector('[data-layout]');
    if (!el) return;
    var layout = el.getAttribute('data-layout');
    var need = el.getAttribute('data-require') || (layout === 'seeker' || layout === 'employer' ? layout : '');
    if (!need) return;
    var root = document.documentElement;
    // trang cho khách xem: chưa đăng nhập thì hiện giao diện khách, không đẩy về đăng nhập
    var isPublic = el.hasAttribute('data-public');
    if (isPublic && !Auth.get()) { el.setAttribute('data-layout', 'guest'); return; }
    root.style.visibility = 'hidden';
    var sess = Auth.get();
    var ready = Auth.valid(sess) ? Promise.resolve(sess) : Auth.refresh();
    ready.then(function (s0) {
      if (!s0 && isPublic) { el.setAttribute('data-layout', 'guest'); root.style.visibility = ''; return; }
      if (!s0) { location.replace('login.html'); return; }
      var role = Auth.role(s0.user);
      if (need !== 'any' && role !== need) { location.replace(Auth.home(role)); return; }
      root.style.visibility = '';
    });
  })();

  function api(path, body) {
    return fetch('/api/auth/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.success === false) {
          var e = new Error(j.error || j.message || 'Có lỗi xảy ra, vui lòng thử lại');
          e.status = r.status; e.retry_after = j.retry_after;
          throw e;
        }
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
    var old = form.querySelector('[data-extra]'); if (old) old.remove();
    return m;
  }
  function busy(form, on, label) {
    var b = form.querySelector('button[type=submit]');
    if (on) { b.dataset.label = b.textContent; b.textContent = label; } else if (b.dataset.label) b.textContent = b.dataset.label;
    b.disabled = on;
  }

  // khóa nút và đếm ngược giây (tránh bấm dồn làm hết hạn mức gửi mail)
  function countdown(btn, seconds, idleLabel) {
    var left = seconds;
    btn.disabled = true;
    (function tick() {
      if (left <= 0) { btn.disabled = false; btn.textContent = idleLabel; return; }
      btn.textContent = idleLabel + ' (' + left + 's)';
      left--; setTimeout(tick, 1000);
    })();
  }

  function translate(msg) {
    var map = {
      'Invalid login credentials': 'Email/số điện thoại hoặc mật khẩu không đúng',
      'Email not confirmed': 'Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn',
      'User already registered': 'Email này đã được sử dụng'
    };
    if (/is invalid$/.test(msg)) return 'Email không hợp lệ hoặc tên miền không được chấp nhận';
    if (/rate limit/i.test(msg)) return 'Hệ thống gửi email đang quá tải, vui lòng thử lại sau ít phút';
    return map[msg] || msg;
  }

  function pwError(pw) {
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số';
    return '';
  }

  // nút "Gửi lại email xác nhận" đặt dưới thông báo
  function resendButton(form, email) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-extra', '');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.textContent = 'Gửi lại email xác nhận';
    b.addEventListener('click', function () {
      b.disabled = true;
      api('resend-confirmation', { email: email }).then(function () {
        showMsg(form, 'Đã gửi lại email xác nhận tới ' + email + '. Hãy kiểm tra hộp thư (cả mục spam).', 'info');
        form.querySelector('[data-auth-msg]').insertAdjacentElement('afterend', wrap);
        countdown(b, 60, 'Gửi lại email xác nhận');
      }).catch(function (err) {
        b.disabled = false; showMsg(form, translate(err.message));
        form.querySelector('[data-auth-msg]').insertAdjacentElement('afterend', wrap);
      });
    });
    wrap.appendChild(b);
    form.querySelector('[data-auth-msg]').insertAdjacentElement('afterend', wrap);
  }

  function initLogin(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var acc = form.querySelector('#acc').value.trim(), password = form.querySelector('#pw').value;
      var remember = form.querySelector('#remember');
      if (!acc || !password) return showMsg(form, 'Vui lòng nhập email (hoặc số điện thoại) và mật khẩu');
      busy(form, true, 'Đang đăng nhập…');
      api('login', { email: acc, password: password }).then(function (d) {
        Auth.save(d.session, remember ? remember.checked : true);
        location.href = Auth.home(Auth.role(d.user));
      }).catch(function (err) {
        busy(form, false); showMsg(form, translate(err.message));
        if (/not confirmed/i.test(err.message) && acc.indexOf('@') > 0) resendButton(form, acc);
      });
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
      if (pwError(pw)) return showMsg(form, pwError(pw));
      if (pw !== pw2) return showMsg(form, 'Mật khẩu nhập lại không khớp');
      busy(form, true, 'Đang tạo tài khoản…');
      api('register', { email: email, password: pw, full_name: name, phone: phone, role: role }).then(function (d) {
        if (!d.session) {
          busy(form, false);
          showMsg(form, 'Đã tạo tài khoản. Hãy bấm liên kết xác nhận trong email rồi đăng nhập.', 'info');
          return resendButton(form, email);
        }
        Auth.save(d.session, true);
        location.href = role === 'employer' ? 'setup-employer.html' : 'setup-seeker.html';
      }).catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
  }

  function initForgot(form) {
    var btn = form.querySelector('button[type=submit]'), idle = btn.textContent;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('#email').value.trim();
      if (!email) return showMsg(form, 'Vui lòng nhập email');
      busy(form, true, 'Đang gửi…');
      api('forgot-password', { email: email }).then(function () {
        busy(form, false);
        showMsg(form, 'Nếu email này đã đăng ký, chúng tôi vừa gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư (cả mục spam).', 'info');
        countdown(btn, 60, idle);
      }).catch(function (err) {
        busy(form, false); showMsg(form, translate(err.message));
        if (err.status === 429) countdown(btn, err.retry_after || 60, idle);
      });
    });
  }

  function initReset(form) {
    // Supabase gắn token vào phần # của link trong email
    var h = new URLSearchParams(location.hash.replace(/^#/, ''));
    var token = h.get('access_token');
    if (h.get('error_description')) {
      showMsg(form, 'Liên kết đã hết hạn hoặc không hợp lệ. Hãy yêu cầu liên kết mới.');
    } else if (!token) {
      showMsg(form, 'Không tìm thấy liên kết khôi phục. Hãy mở liên kết trong email, hoặc yêu cầu liên kết mới.');
    }
    history.replaceState(null, '', location.pathname); // không để token nằm trên thanh địa chỉ
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = form.querySelector('#pw').value, pw2 = form.querySelector('#pw2').value;
      if (!token) return showMsg(form, 'Liên kết không hợp lệ. Hãy yêu cầu liên kết mới.');
      if (pwError(pw)) return showMsg(form, pwError(pw));
      if (pw !== pw2) return showMsg(form, 'Mật khẩu nhập lại không khớp');
      busy(form, true, 'Đang lưu…');
      api('reset-password', { access_token: token, password: pw }).then(function () {
        Auth.clear();
        showMsg(form, 'Đã đổi mật khẩu. Đang chuyển đến trang đăng nhập…', 'info');
        setTimeout(function () { location.href = 'login.html'; }, 1500);
      }).catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
  }

  // Các thay đổi tài khoản khiến phiên cũ không còn đúng → đăng xuất và đăng nhập lại
  function relogin(form, text) {
    Auth.clear(); form.reset();
    showMsg(form, text + ' Đang chuyển đến trang đăng nhập…', 'ok');
    setTimeout(function () { location.href = 'login.html'; }, 1500);
  }

  function initPassword(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cur = form.querySelector('#cur').value, pw = form.querySelector('#pw').value, pw2 = form.querySelector('#pw2').value;
      if (!cur || !pw) return showMsg(form, 'Vui lòng điền đủ các ô');
      if (pwError(pw)) return showMsg(form, pwError(pw));
      if (pw !== pw2) return showMsg(form, 'Mật khẩu nhập lại không khớp');
      busy(form, true, 'Đang lưu…');
      Auth.call('POST', '/api/auth/change-password', { current_password: cur, new_password: pw })
        .then(function () { relogin(form, 'Đã đổi mật khẩu thành công.'); })
        .catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
    var back = document.querySelector('[data-back]');
    var s = Auth.get();
    if (back && s) back.setAttribute('href', Auth.role(s.user) === 'employer' ? 'shop.html' : 'profile.html');
  }

  function initEmail(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var mail = form.querySelector('#newmail').value.trim(), pw = form.querySelector('#pwe').value;
      if (!mail || !pw) return showMsg(form, 'Vui lòng điền đủ các ô');
      busy(form, true, 'Đang lưu…');
      Auth.call('POST', '/api/auth/change-email', { new_email: mail, password: pw })
        .then(function () { relogin(form, 'Đã đổi email đăng nhập.'); })
        .catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
  }

  function initDelete(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = form.querySelector('#pwd').value;
      if (!form.querySelector('#sure').checked) return showMsg(form, 'Hãy tích vào ô xác nhận để tiếp tục');
      if (!pw) return showMsg(form, 'Vui lòng nhập mật khẩu để xác nhận');
      busy(form, true, 'Đang xóa…');
      Auth.call('POST', '/api/auth/delete-account', { password: pw })
        .then(function () { Auth.clear(); location.href = 'index.html'; })
        .catch(function (err) { busy(form, false); showMsg(form, translate(err.message)); });
    });
  }

  // chữ cái đầu tên trên avatar ở thanh đầu trang
  function setAvatar() {
    var s = Auth.get(), n = s && s.user && s.user.user_metadata && s.user.user_metadata.full_name;
    if (!n) return;
    var ch = n.trim().split(/\s+/).pop().charAt(0).toUpperCase();
    document.querySelectorAll('.cr-header .avatar').forEach(function (a) { a.textContent = ch; });
  }

  // nút Hiện/Ẩn cho mọi ô mật khẩu
  function passwordToggles() {
    document.querySelectorAll('input[type=password]').forEach(function (inp) {
      var wrap = document.createElement('span');
      wrap.className = 'pw-wrap';
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pw-toggle'; b.textContent = 'Hiện';
      b.setAttribute('aria-label', 'Hiện mật khẩu');
      b.addEventListener('click', function () {
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.textContent = show ? 'Ẩn' : 'Hiện';
        b.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      });
      wrap.appendChild(b);
      if (inp.hasAttribute('data-meter')) {
        var meter = document.createElement('p');
        meter.className = 'pw-meter';
        meter.textContent = 'Tối thiểu 8 ký tự, gồm cả chữ và số';
        wrap.insertAdjacentElement('afterend', meter);
        inp.addEventListener('input', function () {
          var v = inp.value, lvl;
          if (!v) { meter.textContent = 'Tối thiểu 8 ký tự, gồm cả chữ và số'; meter.removeAttribute('data-lvl'); return; }
          if (pwError(v)) lvl = ['weak', 'Yếu · cần tối thiểu 8 ký tự, gồm cả chữ và số'];
          else if (v.length >= 12 || /[^A-Za-z0-9]/.test(v)) lvl = ['strong', 'Mạnh'];
          else lvl = ['mid', 'Khá · thêm ký tự đặc biệt hoặc dài hơn sẽ mạnh hơn'];
          meter.setAttribute('data-lvl', lvl[0]); meter.textContent = 'Độ mạnh: ' + lvl[1];
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setAvatar();
    var forms = document.querySelectorAll('form[data-auth]');
    if (!forms.length) return;
    passwordToggles();
    var first = forms[0].getAttribute('data-auth');
    // đã đăng nhập thì không cần vào các trang này nữa
    var cur = Auth.get();
    if (cur && cur.user && cur.expires_at * 1000 > Date.now() && ['login', 'register', 'forgot'].indexOf(first) >= 0) { location.replace(Auth.home(Auth.role(cur.user))); return; }
    var init = { login: initLogin, register: initRegister, forgot: initForgot, reset: initReset, password: initPassword, email: initEmail, 'delete': initDelete };
    forms.forEach(function (f) { init[f.getAttribute('data-auth')](f); });
  });
})();
