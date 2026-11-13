// CaRảnh – chỉ dựng giao diện. Mọi chức năng chưa có sẵn: bấm vào sẽ hiện hộp thoại thông báo.
(function () {
  var ICON = {
    logo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l3 2"></path></svg>',
    search: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>',
    out: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4"></path><path d="M10 8l-4 4 4 4"></path><path d="M6 12h10"></path></svg>',
    home: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"></path></svg>',
    brief: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M9 7V5h6v2"></path></svg>',
    info: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7.5v.5"></path></svg>',
    user: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 4-6 8-6s8 2 8 6"></path></svg>',
    cal: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>',
    close: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
  };
  window.CR_ICON = ICON;

  var brand = function (href) {
    return '<a class="brand" href="' + href + '" aria-label="CaRảnh – trang chủ"><span class="logo" aria-hidden="true">' + ICON.logo + '</span>CaRảnh</a>';
  };
  var searchForm = function (ph, label) {
    return '<form class="search" role="search" onsubmit="return false"><label class="sr-only" for="q">Tìm kiếm</label>' +
      '<div class="box">' + ICON.search + '<input id="q" type="search" placeholder="' + ph + '"></div>' +
      '<button type="button" class="btn" data-todo="Tìm kiếm" style="color:#5B6270" title="Tìm bằng câu tự nhiên. Đang huấn luyện mô hình.">' + (label || 'Tìm bằng AI') + ' · <span style="color:#93500A">Sắp có</span></button></form>';
  };
  var a = function (cur, key) { return cur === key ? ' aria-current="page"' : ''; };

  var layouts = {
    guest: function (cur) {
      return '<header class="cr-header"><div class="bar">' + brand('index.html') +
        searchForm('Tìm tất cả thứ gì bạn muốn — vd: phục vụ, Hải Châu') +
        '<nav class="nav desknav" aria-label="Khách">' +
        '<a class="link" href="overview.html">Giới thiệu</a>' +
        '<button type="button" class="link" data-gate>Xem công việc</button><span class="sep" aria-hidden="true"></span>' +
        '<a class="link strong" href="login.html">Đăng nhập</a>' +
        '<a class="btn btn-primary" style="margin-left:4px" href="register.html">Đăng ký</a></nav></div></header>';
    },
    plain: function (cur, el) {
      var cta = el.getAttribute('data-cta');
      var r = cta === 'login' ? '<a class="btn" style="font-weight:700" href="login.html">Đăng nhập</a>' :
        cta === 'register' ? '<a class="btn" style="font-weight:700" href="register.html">Đăng ký</a>' : '';
      return '<header class="cr-header lg"><div class="bar">' + brand('index.html') + r + '</div></header>';
    },
    overview: function () {
      return '<header class="cr-header lg"><div class="bar">' + brand('index.html') +
        '<nav class="nav" aria-label="Chính"><a class="link strong" href="index.html">Xem việc làm</a><a class="link strong" href="login.html">Đăng nhập</a>' +
        '<a class="btn btn-primary" href="register.html">Đăng ký</a></nav></div></header>';
    },
    seeker: function (cur) {
      return '<header class="cr-header"><div class="bar">' + brand('jobs.html') +
        searchForm('Tìm theo tên việc, quán, khu vực…') +
        '<nav class="nav desknav" aria-label="Người tìm việc">' +
        '<a class="link strong" href="my-jobs.html"' + a(cur, 'mine') + '>Xem công việc</a>' +
        '<a class="link strong" href="profile.html"' + a(cur, 'profile') + '><span class="avatar" aria-hidden="true">T</span>Tài khoản</a>' +
        '<a class="link" href="index.html" data-logout>' + ICON.out + 'Đăng xuất</a></nav></div></header>';
    },
    employer: function (cur) {
      var items = [['candidates', 'candidates.html', 'Ứng viên'], ['positions', 'positions.html', 'Vị trí & tuyển dụng'],
        ['staff', 'staff-schedule.html', 'Lịch làm'], ['shop', 'shop.html', 'Hồ sơ cửa hàng']];
      var subs = items.map(function (i) {
        return '<button type="button" class="' + (cur === i[0] ? 'active' : '') + '" onclick="location.href=\'' + i[1] + '\'"' + a(cur, i[0]) + '>' + i[2] +
          (i[3] ? '<span class="count-pill">' + i[3] + '</span>' : '') + '</button>';
      }).join('');
      return '<header class="cr-header"><div class="bar">' + brand('candidates.html') +
        searchForm('Tìm ứng viên — vd: rảnh tối, pha chế, Hải Châu', 'Lọc').replace('<span style="color:#93500A">Sắp có</span>', '').replace(' · ', '') +
        '<div class="nav"><a class="link strong" href="shop.html"><span class="avatar" aria-hidden="true">C</span>Cửa hàng</a>' +
        '<a class="link" href="index.html" data-logout>' + ICON.out + 'Đăng xuất</a></div></div>' +
        '<nav class="subnav" aria-label="Nhà tuyển dụng"><div class="bar">' + subs +
        '<button type="button" class="cta" onclick="location.href=\'new-post.html\'"' + (cur === 'new' ? ' aria-current="page"' : '') + '>+ Đăng tin tuyển</button></div></nav></header>';
    }
  };

  var bottoms = {
    guest: function () {
      return '<a href="index.html" class="on" aria-current="page">' + ICON.home + 'Trang chủ</a>' +
        '<button type="button" data-gate>' + ICON.brief + 'Xem công việc</button>' +
        '<a href="overview.html">' + ICON.info + 'Giới thiệu</a><a href="login.html">' + ICON.user + 'Đăng nhập</a>';
    },
    seeker: function (cur) {
      var c = function (k) { return cur === k ? ' class="on"' : ''; };
      return '<a href="jobs.html"' + c('home') + '>' + ICON.home + 'Trang chủ</a><a href="my-jobs.html"' + c('mine') + '>' + ICON.brief + 'Công việc</a>' +
        '<a href="schedule.html"' + c('schedule') + '>' + ICON.cal + 'Lịch</a><a href="profile.html"' + c('profile') + '>' + ICON.user + 'Hồ sơ</a>';
    },
    employer: function (cur) {
      var c = function (k) { return cur === k ? ' class="on"' : ''; };
      return '<a href="candidates.html"' + c('candidates') + '>' + ICON.user + 'Ứng viên</a><a href="positions.html"' + c('positions') + '>' + ICON.brief + 'Vị trí</a>' +
        '<a href="staff-schedule.html"' + c('staff') + '>' + ICON.cal + 'Lịch</a><a href="shop.html"' + c('shop') + '>' + ICON.home + 'Cửa hàng</a>';
    }
  };

  function build() {
    var el = document.querySelector('[data-layout]');
    if (el) {
      var type = el.getAttribute('data-layout'), cur = el.getAttribute('data-active') || '';
      el.outerHTML = layouts[type](cur, el);
      var b = bottoms[type];
      if (b) {
        var nav = document.createElement('nav');
        nav.className = 'bottomnav'; nav.setAttribute('aria-label', 'Điều hướng nhanh');
        nav.innerHTML = b(cur);
        document.body.appendChild(nav);
      }
    }
    var dlg = document.createElement('div');
    dlg.className = 'overlay'; dlg.hidden = true;
    dlg.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="head"><h2 id="dlg-t"></h2>' +
      '<button type="button" class="icon-btn" aria-label="Đóng" data-close>' + ICON.close + '</button></div><p id="dlg-b"></p><div id="dlg-a" style="display:flex;flex-direction:column;gap:10px"></div></div>';
    document.body.appendChild(dlg);
    window.crDialog = function (title, body, actionsHtml) {
      dlg.querySelector('#dlg-t').textContent = title;
      dlg.querySelector('#dlg-b').textContent = body;
      dlg.querySelector('#dlg-a').innerHTML = actionsHtml || '<button type="button" class="btn btn-primary" data-close style="margin-top:4px">Đã hiểu</button>';
      dlg.hidden = false;
      var f = dlg.querySelector('button.btn, a.btn'); if (f) f.focus();
    };
    var close = function () { dlg.hidden = true; };
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) { try { localStorage.removeItem('cr_session'); } catch (x) {} return; }
    var gate = e.target.closest('[data-gate]');
    if (gate) {
      e.preventDefault();
      window.crDialog('Đăng nhập để xem chi tiết', 'Bạn cần có tài khoản để xem chi tiết công việc, ứng tuyển và đăng ký lịch làm.',
        '<a href="login.html" class="btn btn-primary btn-block" style="margin-top:4px">Đăng nhập</a><a href="register.html" class="btn btn-block">Tạo tài khoản mới</a>');
      return;
    }
    var todo = e.target.closest('[data-todo]');
    if (todo) {
      e.preventDefault();
      var name = todo.getAttribute('data-todo') || todo.textContent.trim();
      window.crDialog('Tính năng chưa có sẵn', '“' + name + '” chưa được xây dựng. Hiện tại trang chỉ có giao diện, phần xử lý sẽ được bổ sung sau.');
    }
  });
  // Chỉ dành cho form chưa có logic: form đã có handler riêng (auth, profile, đăng tin…)
  // đã gọi preventDefault() ở bước trước nên được bỏ qua.
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (e.defaultPrevented || f.hasAttribute('data-auth') || f.hasAttribute('data-profile')) return;
    e.preventDefault();
    var t = f.querySelector('[data-todo]');
    if (t) t.click(); else window.crDialog('Tính năng chưa có sẵn', 'Biểu mẫu này chưa xử lý dữ liệu.');
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
