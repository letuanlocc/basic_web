// CaRảnh – việc làm: danh sách, chi tiết + ứng tuyển, công việc của tôi, đăng tin, quản lý tin (nhà tuyển dụng)
(function () {
  var A; // gán lúc DOMContentLoaded vì auth.js có thể được nạp sau file này
  var page = document.body.getAttribute('data-page');
  var DAY = { 0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN' }; // 0 = thứ Hai (khớp week_start + weekday)
  var STATUS = { pending: ['warn', 'Đang chờ'], accepted: ['ok', 'Đã được nhận'], rejected: ['err', 'Bị từ chối'], withdrawn: ['', 'Đã hủy'] };
  var LANG = { 0: 'Chưa có', 1: 'Giao tiếp cơ bản', 2: 'Khá', 3: 'Tốt' };
  var WORKMODE = { online: 'Online', offline: 'Offline', both: 'Online & Offline' };
  var SLOT = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối', weekend: 'Cuối tuần' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function $(id) { return document.getElementById(id); }
  function hh(h) { return String(h).padStart(2, '0') + ':00'; }
  function salary(p) { return p.salary_amount ? Number(p.salary_amount).toLocaleString('vi-VN') + 'đ/giờ' : 'Thỏa thuận'; }
  function days(p) { return (p.work_days || []).map(function (d) { return DAY[d]; }).join(', '); }
  function when(p) {
    var t = [];
    if (p.work_days && p.work_days.length) t.push(days(p));
    if (p.open_hour != null && p.close_hour != null) t.push(hh(p.open_hour) + '–' + hh(p.close_hour));
    return t.join(' · ') || 'Theo thỏa thuận';
  }
  function dateVN(d) { return d ? String(d).split('-').reverse().join('/') : '—'; }
  function badge(kind, text) { return '<span class="badge ' + kind + '">' + esc(text) + '</span>'; }
  function empty(title, sub) {
    return '<div class="empty" role="status"><strong style="font-size:16px">' + esc(title) + '</strong>' + (sub ? '<span class="muted small">' + esc(sub) + '</span>' : '') + '</div>';
  }
  function msg(el, text, kind) { el.className = 'msg ' + (kind || 'err'); el.textContent = text; el.hidden = false; }
  function pub(url) {
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.success) throw new Error(j.message || 'Có lỗi xảy ra'); return j.data;
    });
  }
  function qs(k) { return new URLSearchParams(location.search).get(k); }

  // ---------- Thẻ việc ----------
  function card(p, loggedIn, preview) {
    var link = preview ? '<span class="btn push" aria-hidden="true">Xem chi tiết</span>' : loggedIn
      ? '<a class="btn push" href="job-detail.html?id=' + esc(p.id) + '">Xem chi tiết</a>'
      : '<button type="button" class="btn push" data-gate>Xem chi tiết</button>';
    return '<article class="card">' +
      '<div class="card-head"><span class="initial" aria-hidden="true">' + esc((p.shop_name || '?').trim().charAt(0).toUpperCase()) + '</span>' +
      '<div class="grow"><h3>' + esc(p.title) + '</h3><p>' + esc(p.shop_name) + '</p></div>' +
      badge(p.mode === 'online' ? '' : 'ok', p.mode === 'online' ? 'Online' : 'Offline') + '</div>' +
      '<dl class="facts"><dt>Lương</dt><dd class="b">' + esc(salary(p)) + '</dd><dt>Thời gian</dt><dd>' + esc(when(p)) + '</dd>' +
      '<dt>Địa điểm</dt><dd>' + esc(p.address || '—') + '</dd></dl>' +
      (p.summary ? '<p class="desc">' + esc(p.summary) + '</p>' : '') + link + '</article>';
  }

  // ---------- Danh sách việc (index.html, jobs.html) ----------
  function initList() {
    var LIMIT = 12, state = { mode: '', sort: 'new', q: '', offset: 0 };
    var list = $('list'), more = $('more'), count = $('count'), none = $('none'), err = $('listerr');
    var loggedIn = !!(A && A.get());
    var shown = 0;

    function load(reset) {
      if (reset) { state.offset = 0; shown = 0; list.innerHTML = ''; }
      var url = '/api/positions?limit=' + LIMIT + '&offset=' + state.offset + '&sort=' + state.sort +
        (state.mode ? '&mode=' + state.mode : '') + (state.q ? '&q=' + encodeURIComponent(state.q) : '');
      more.disabled = true;
      pub(url).then(function (rows) {
        err.hidden = true;
        list.insertAdjacentHTML('beforeend', rows.map(function (p) { return card(p, loggedIn); }).join(''));
        shown += rows.length; state.offset += rows.length;
        count.textContent = shown + (rows.length === LIMIT ? '+' : '') + ' việc';
        none.hidden = shown > 0;
        more.hidden = rows.length < LIMIT; more.disabled = false;
      }).catch(function (e) { msg(err, 'Không tải được danh sách việc: ' + e.message); more.disabled = false; });
    }

    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var f = b.getAttribute('data-filter');
        state.mode = f === 'online' || f === 'offline' ? f : '';
        state.sort = f === 'salary' ? 'salary' : 'new';
        load(true);
      });
    });
    more.addEventListener('click', function () { load(false); });

    // ô tìm kiếm trên thanh đầu trang
    var q = $('q'), t;
    if (q) {
      q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = q.value.trim(); load(true); }, 350); });
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); state.q = q.value.trim(); load(true); } });
    }
    load(true);
  }

  // ---------- Chi tiết việc + ứng tuyển ----------
  function initDetail() {
    var box = $('detail'), id = qs('id');
    if (!id) { box.innerHTML = empty('Không tìm thấy công việc', 'Đường dẫn thiếu mã công việc.'); return; }
    Promise.all([
      A.call('GET', '/api/positions/' + id),
      A.call('GET', '/api/applications/mine').catch(function () { return []; }),
      A.call('GET', '/api/me/saved').catch(function () { return []; })
    ]).then(function (r) { render(r[0], r[1], r[2]); })
      .catch(function (e) { box.innerHTML = empty('Không tải được công việc', e.message); });

    function list(title, items) {
      if (!items.length) return '';
      return '<div><h3>' + title + '</h3><ul>' + items.map(function (i) { return '<li>' + esc(i.content) + '</li>'; }).join('') + '</ul></div>';
    }
    function render(p, apps, saved) {
      var mine = apps.filter(function (a) { return a.position && a.position.id === p.id && (a.status === 'pending' || a.status === 'accepted'); })[0];
      var isSaved = saved.some(function (s) { return s.position && s.position.id === p.id; });
      var kinds = function (k) { return (p.items || []).filter(function (i) { return i.kind === k; }); };
      var shop = p.shop || {};
      var closed = !p.is_open || (p.deadline && p.deadline < new Date().toISOString().slice(0, 10));
      var full = p.filled >= p.headcount;
      var notAccepting = p.accepting === false;

      var action;
      if (mine) action = badge(STATUS[mine.status][0], 'Bạn ' + (mine.status === 'accepted' ? 'đã được nhận' : 'đã ứng tuyển · đang chờ phản hồi'));
      else if (closed) action = badge('err', 'Đã đóng tuyển');
      else if (full) action = badge('warn', 'Đã đủ người');
      else if (notAccepting) action = badge('warn', 'Hiện chưa nhận thêm hồ sơ');
      else action = '<button type="button" class="btn btn-primary btn-lg" id="apply">Ứng tuyển ngay</button>';

      box.innerHTML = '<div class="title-row"><h1>' + esc(p.title) + '</h1></div>' +
        '<div class="two-col"><div class="stack-col" style="gap:16px">' +
        '<section class="sect"><h2>Thông tin chung</h2><div class="badges">' +
        badge(p.mode === 'online' ? '' : 'ok', p.mode === 'online' ? 'Online' : 'Offline') +
        (p.no_experience ? badge('', 'Không cần kinh nghiệm') : '') + (p.accepts_intern ? badge('', 'Nhận thực tập') : '') + '</div>' +
        (p.summary ? '<p style="margin:0">' + esc(p.summary) + '</p>' : '') +
        '<dl class="facts"><dt>Địa điểm</dt><dd>' + esc(p.address || '—') + '</dd><dt>Cách làm việc</dt><dd>' + esc(p.work_form || '—') + '</dd>' +
        '<dt>Ngày bắt đầu</dt><dd>' + dateVN(p.start_date) + '</dd></dl></section>' +
        '<section class="sect"><h2>Mô tả công việc</h2>' + list('Nhiệm vụ chính', kinds('task')) + list('Yêu cầu ứng viên', kinds('requirement')) + list('Quyền lợi', kinds('perk')) + '</section>' +
        '<section class="sect"><h2>Lịch làm việc</h2><dl class="facts"><dt>Ngày làm</dt><dd>' + esc(days(p) || '—') + '</dd>' +
        '<dt>Giờ mở cửa</dt><dd>' + (p.open_hour != null ? hh(p.open_hour) + ' – ' + hh(p.close_hour) : '—') + '</dd>' +
        '<dt>Ca làm</dt><dd>' + ((p.shifts || []).map(function (s) { return esc(s.name) + ' (' + hh(s.start_hour) + '–' + hh(s.end_hour) + ')'; }).join('<br>') || '—') + '</dd>' +
        (p.min_week_hours != null || p.max_week_hours != null ? '<dt>Giờ/tuần</dt><dd>' + (p.min_week_hours || 0) + ' – ' + (p.max_week_hours || '…') + ' giờ</dd>' : '') +
        (p.max_day_hours != null ? '<dt>Tối đa/ngày</dt><dd>' + p.max_day_hours + ' giờ</dd>' : '') + '</dl></section>' +
        '<section class="sect"><h2>Thông tin nhà tuyển dụng</h2><dl class="facts"><dt>Tên</dt><dd class="b">' + esc(shop.name || p.shop_name) + '</dd>' +
        '<dt>Địa chỉ</dt><dd>' + esc([shop.address, shop.ward, shop.city].filter(Boolean).join(', ') || '—') + '</dd>' +
        (shop.phone ? '<dt>SĐT cửa hàng</dt><dd>' + esc(shop.phone) + '</dd>' : '') +
        (shop.fanpage_url ? '<dt>Website</dt><dd>' + esc(shop.fanpage_url) + '</dd>' : '') + '</dl>' +
        '<div id="contact"></div></section></div>' +
        '<aside class="panel" aria-label="Ứng tuyển"><div class="b" style="font-size:22px;font-weight:700">' + esc(salary(p)) + '</div>' +
        '<dl class="facts"><dt>Hạn ứng tuyển</dt><dd>' + dateVN(p.deadline) + '</dd><dt>Đã nhận</dt><dd>' + p.filled + '/' + p.headcount + ' người</dd></dl>' +
        '<p class="msg err" id="amsg" hidden></p>' + action +
        '<button type="button" class="btn" id="save" aria-pressed="' + isSaved + '">' + (isSaved ? 'Bỏ lưu việc' : 'Lưu việc') + '</button></aside></div>';

      var amsg = $('amsg');
      if (mine) showContact();
      var ap = $('apply');
      if (ap) ap.addEventListener('click', function () {
        ap.disabled = true; ap.textContent = 'Đang gửi…';
        A.call('POST', '/api/positions/' + p.id + '/apply').then(function () { location.reload(); })
          .catch(function (e) { ap.disabled = false; ap.textContent = 'Ứng tuyển ngay'; msg(amsg, e.message); });
      });
      var sv = $('save');
      sv.addEventListener('click', function () {
        var was = sv.getAttribute('aria-pressed') === 'true';
        sv.disabled = true;
        A.call(was ? 'DELETE' : 'PUT', '/api/me/saved/' + p.id).then(function () {
          sv.setAttribute('aria-pressed', String(!was)); sv.textContent = was ? 'Lưu việc' : 'Bỏ lưu việc'; sv.disabled = false;
        }).catch(function (e) { sv.disabled = false; msg(amsg, e.message); });
      });
      function showContact() {
        A.call('GET', '/api/positions/' + p.id + '/contact').then(function (c) {
          if (c) $('contact').innerHTML = '<p class="msg info" style="margin:0">Người liên hệ phỏng vấn: <strong>' + esc(c.contact_name) + '</strong> · ' + esc(c.contact_phone) + '</p>';
        }).catch(function () {});
      }
    }
  }

  // ---------- Công việc của tôi ----------
  function initMyJobs() {
    var box = $('mlist'), tab = 'apps', data = { apps: [], invites: [], saved: [] };
    var tabs = document.querySelectorAll('[data-tab]');

    function pos(p) {
      return '<div class="card-head"><span class="initial" aria-hidden="true">' + esc(((p.shop && p.shop.name) || '?').charAt(0).toUpperCase()) + '</span>' +
        '<div class="grow"><h3><a href="job-detail.html?id=' + esc(p.id) + '">' + esc(p.title) + '</a></h3><p>' + esc(p.shop && p.shop.name) + '</p></div></div>';
    }
    function draw() {
      tabs.forEach(function (b) {
        b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab));
        b.querySelector('.n').textContent = data[b.getAttribute('data-tab')].length;
      });
      var rows = data[tab];
      if (!rows.length) { box.innerHTML = empty(tab === 'apps' ? 'Bạn chưa ứng tuyển việc nào' : tab === 'invites' ? 'Chưa có lời mời nào' : 'Chưa lưu việc nào', 'Xem các việc mới ở Trang chủ.'); return; }
      box.innerHTML = '<div class="grid-cards">' + rows.map(function (r) {
        if (tab === 'apps') {
          var st = STATUS[r.status] || ['', r.status];
          return '<article class="card">' + pos(r.position) + '<div class="badges">' + badge(st[0], st[1]) + (r.source === 'invited' ? badge('', 'Được mời') : '') + '</div>' +
            (r.reject_reason ? '<p class="desc">' + esc(r.reject_reason) + '</p>' : '') +
            (r.status === 'pending' ? '<button type="button" class="btn btn-danger push" data-act="withdraw" data-id="' + esc(r.id) + '">Hủy hồ sơ</button>' :
              r.status === 'accepted' ? '<a class="btn btn-primary push" href="schedule.html?position=' + encodeURIComponent(r.position.id) + '">Chọn lịch làm</a>' : '') + '</article>';
        }
        if (tab === 'invites') {
          return '<article class="card">' + pos(r.position) + (r.message ? '<p class="desc">“' + esc(r.message) + '”</p>' : '') +
            '<div class="row"><button type="button" class="btn" data-act="accept" data-id="' + esc(r.id) + '">Nhận lời mời</button>' +
            '<button type="button" class="btn" data-act="decline" data-id="' + esc(r.id) + '">Từ chối</button></div></article>';
        }
        var p = r.position;
        return '<article class="card">' + pos(p) + '<dl class="facts"><dt>Lương</dt><dd class="b">' + esc(salary(p)) + '</dd></dl>' +
          '<button type="button" class="btn push" data-act="unsave" data-id="' + esc(p.id) + '">Bỏ lưu</button></article>';
      }).join('') + '</div>';
    }
    function load() {
      return Promise.all([
        A.call('GET', '/api/applications/mine'), A.call('GET', '/api/invitations/mine'), A.call('GET', '/api/me/saved')
      ]).then(function (r) { data.apps = r[0]; data.invites = r[1]; data.saved = r[2]; draw(); })
        .catch(function (e) { box.innerHTML = empty('Không tải được dữ liệu', e.message); });
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); draw(); }); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var id = b.getAttribute('data-id'), act = b.getAttribute('data-act'), call;
      if (act === 'withdraw') { if (!confirm('Hủy hồ sơ ứng tuyển này?')) return; call = A.call('POST', '/api/applications/' + id + '/withdraw'); }
      else if (act === 'accept' || act === 'decline') call = A.call('POST', '/api/invitations/' + id + '/respond', { accept: act === 'accept' });
      else call = A.call('DELETE', '/api/me/saved/' + id);
      b.disabled = true;
      call.then(load).catch(function (er) { b.disabled = false; alert(er.message); });
    });
    load();
  }

  // ---------- Quản lý tin tuyển (nhà tuyển dụng) ----------
  function initPositions() {
    var box = $('plist'), cnt = $('pcount');
    function appRow(a) {
      var s = a.seeker || {}, u = s.user || {}, st = STATUS[a.status] || ['', a.status];
      var meta = [s.area, WORKMODE[s.work_mode], s.birth_year ? 'sinh ' + s.birth_year : '', s.language_level ? 'Ngoại ngữ: ' + LANG[s.language_level] : ''].filter(Boolean).join(' · ');
      return '<li class="row between" style="padding:10px 0;border-top:1px solid var(--line-3)"><div><strong>' + esc(u.full_name || 'Ứng viên') + '</strong> ' + badge(st[0], st[1]) +
        (a.source === 'invited' ? ' ' + badge('', 'Được mời') : '') + '<br><span class="muted small">' + esc(meta) + '</span>' +
        (s.availability_note ? '<br><span class="small">' + esc(s.availability_note) + '</span>' : '') + '</div>' +
        (a.status === 'pending' ? '<div class="row"><button type="button" class="btn" data-act="yes" data-id="' + esc(a.id) + '">Nhận</button><button type="button" class="btn btn-danger" data-act="no" data-id="' + esc(a.id) + '">Từ chối</button></div>' : '') + '</li>';
    }
    function draw(rows) {
      cnt.textContent = rows.length + ' vị trí';
      if (!rows.length) { box.innerHTML = empty('Chưa có vị trí nào', 'Bấm "+ Đăng tin tuyển" để tạo vị trí đầu tiên.'); return; }
      box.innerHTML = '<div class="stack-col" style="gap:16px">' + rows.map(function (p) {
        return '<article class="card" data-pid="' + esc(p.id) + '"><div class="card-head"><div class="grow"><h3>' + esc(p.title) + '</h3><p>' + esc(when(p)) + '</p></div>' +
          badge(p.is_open ? 'ok' : '', p.is_open ? 'Đang tuyển' : 'Đã đóng') + '</div>' +
          '<dl class="facts"><dt>Lương</dt><dd class="b">' + esc(salary(p)) + '</dd><dt>Đã nhận</dt><dd>' + p.filled + '/' + p.headcount + ' người</dd>' +
          '<dt>Hồ sơ chờ</dt><dd>' + p.pending + '</dd><dt>Hạn ứng tuyển</dt><dd>' + dateVN(p.deadline) + '</dd></dl>' +
          '<div class="row"><button type="button" class="btn" data-act="apps">Hồ sơ ứng viên</button>' +
          '<button type="button" class="btn" data-act="' + (p.is_open ? 'close' : 'open') + '">' + (p.is_open ? 'Đóng tin' : 'Mở lại tin') + '</button></div>' +
          '<ul class="apps" style="list-style:none;margin:0;padding:0" hidden></ul></article>';
      }).join('') + '</div>';
    }
    var openIds = {};
    function load() {
      return A.call('GET', '/api/me/shop/positions').then(function (rows) {
        draw(rows);
        Object.keys(openIds).forEach(function (id) { var c = box.querySelector('[data-pid="' + id + '"]'); if (c) showApps(c); });
      }).catch(function (e) { box.innerHTML = empty('Không tải được danh sách', e.message); });
    }
    function showApps(c) {
      var ul = c.querySelector('.apps'), id = c.getAttribute('data-pid'); openIds[id] = 1;
      ul.hidden = false; ul.innerHTML = '<li class="muted small">Đang tải…</li>';
      A.call('GET', '/api/positions/' + id + '/applications').then(function (rows) {
        ul.innerHTML = rows.length ? rows.map(appRow).join('') : '<li class="muted small" style="padding-top:10px">Chưa có hồ sơ nào.</li>';
      }).catch(function (e) { ul.innerHTML = '<li><p class="msg err">' + esc(e.message) + '</p></li>'; });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var card = b.closest('[data-pid]'), act = b.getAttribute('data-act');
      if (act === 'apps') {
        var ul = card.querySelector('.apps'), id = card.getAttribute('data-pid');
        if (!ul.hidden) { ul.hidden = true; delete openIds[id]; } else showApps(card);
        return;
      }
      b.disabled = true;
      var call = act === 'close' || act === 'open' ? A.call('POST', '/api/positions/' + card.getAttribute('data-pid') + '/' + act)
        : A.call('POST', '/api/applications/' + b.getAttribute('data-id') + '/decision', { accept: act === 'yes' });
      call.then(load).catch(function (er) { b.disabled = false; alert(er.message); });
    });
    load();
  }

  // ---------- Đăng tin tuyển ----------
  function initNewPost() {
    var form = $('postForm'), shifts = $('shifts'), mode = 'offline';
    var val = function (id) { return $(id).value.trim(); };
    var num = function (id) { var v = val(id); return v === '' ? null : Number(v); };

    function hourOptions(sel) {
      var o = '';
      for (var h = 0; h <= 24; h++) o += '<option value="' + h + '"' + (h === sel ? ' selected' : '') + '>' + hh(h) + '</option>';
      return o;
    }
    function addShift(name, s, e) {
      var n = shifts.children.length + 1;
      var row = document.createElement('div');
      row.className = 'row'; row.style.gap = '8px'; row.setAttribute('data-shift', '');
      row.innerHTML = '<input type="text" placeholder="Tên ca" aria-label="Tên ca ' + n + '" value="' + esc(name || '') + '" style="flex:1 1 140px;width:auto">' +
        '<select aria-label="Ca ' + n + ' bắt đầu" style="flex:0 0 90px;width:auto">' + hourOptions(s == null ? 8 : s) + '</select><span>–</span>' +
        '<select aria-label="Ca ' + n + ' kết thúc" style="flex:0 0 90px;width:auto">' + hourOptions(e == null ? 12 : e) + '</select>' +
        '<button type="button" class="btn btn-sm" data-rm aria-label="Xóa ca ' + n + '">Xóa</button>';
      shifts.appendChild(row);
    }
    addShift('Ca sáng', 8, 12);
    $('addShift').addEventListener('click', function () { addShift('', 12, 17); preview(); });
    shifts.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { b.parentNode.remove(); preview(); } });

    form.querySelectorAll('[data-chip]').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-v');
        form.querySelectorAll('[data-chip]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        preview();
      });
    });
    form.querySelectorAll('[data-day]').forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); preview(); });
    });

    function lines(id, kind) {
      return val(id).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (c) { return { kind: kind, content: c }; });
    }
    function read() {
      return {
        title: val('n_title'), mode: mode, salary_amount: num('n_salary'), summary: val('n_summary'),
        no_experience: $('n_noexp').checked, accepts_intern: $('n_intern').checked,
        address: val('n_addr'), work_form: val('n_form'),
        work_days: Array.prototype.filter.call(form.querySelectorAll('[data-day]'), function (b) { return b.getAttribute('aria-pressed') === 'true'; })
          .map(function (b) { return Number(b.getAttribute('data-day')); }),
        shifts: Array.prototype.map.call(shifts.querySelectorAll('[data-shift]'), function (r) {
          var sel = r.querySelectorAll('select');
          return { name: r.querySelector('input').value.trim(), start_hour: Number(sel[0].value), end_hour: Number(sel[1].value) };
        }),
        open_hour: num('n_open'), close_hour: num('n_close'), headcount: num('n_head'), pending_limit: num('n_pend'),
        min_week_hours: num('n_minw'), max_week_hours: num('n_maxw'), max_day_hours: num('n_maxd'),
        min_per_shift: num('n_minp'), max_per_shift: num('n_maxp'),
        deadline: val('n_deadline') || null, start_date: val('n_start') || null,
        contact_name: val('n_mgr'), contact_phone: val('n_mgp').replace(/[\s.]/g, ''),
        items: lines('n_tasks', 'task').concat(lines('n_reqs', 'requirement'), lines('n_perks', 'perk'))
      };
    }

    function preview() {
      var d = read();
      $('preview').innerHTML = d.title ? card({ id: '', title: d.title, shop_name: shopName, mode: d.mode, salary_amount: d.salary_amount, work_days: d.work_days,
        open_hour: d.open_hour, close_hour: d.close_hour, address: d.address, summary: d.summary }, true, true)
        : empty('Nhập tên vị trí để xem trước');
    }
    form.addEventListener('input', preview);

    var shopName = '';
    A.call('GET', '/api/me').then(function (me) {
      var s = me.shop || {};
      shopName = s.name || '';
      $('shopinfo').innerHTML = s.name && s.address && s.phone
        ? 'Đăng với tên <strong>' + esc(s.name) + '</strong> · ' + esc(s.address) + ' · ' + esc(s.phone) + ' · <a class="tiny" href="shop.html">Sửa hồ sơ cửa hàng</a>'
        : 'Hồ sơ cửa hàng chưa đủ thông tin (tên, địa chỉ, SĐT, lĩnh vực). <a class="tiny" href="shop.html">Điền hồ sơ cửa hàng</a> trước khi đăng tin.';
      preview();
    }).catch(function () {});

    function check(d) {
      if (!d.title) return 'Vui lòng nhập tên vị trí';
      if (!d.address) return 'Vui lòng nhập địa điểm làm việc';
      if (!d.work_days.length) return 'Chọn ít nhất một ngày làm việc';
      if (!d.shifts.length) return 'Thêm ít nhất một ca làm việc';
      for (var i = 0; i < d.shifts.length; i++) {
        var s = d.shifts[i];
        if (!s.name) return 'Ca ' + (i + 1) + ': vui lòng nhập tên ca';
        if (s.end_hour <= s.start_hour) return 'Ca ' + (i + 1) + ': giờ kết thúc phải sau giờ bắt đầu';
        if (d.open_hour != null && s.start_hour < d.open_hour) return 'Ca ' + (i + 1) + ' bắt đầu trước giờ mở cửa';
        if (d.close_hour != null && s.end_hour > d.close_hour) return 'Ca ' + (i + 1) + ' kết thúc sau giờ đóng cửa';
      }
      if (d.open_hour == null || d.close_hour == null) return 'Vui lòng nhập giờ mở cửa và giờ đóng cửa';
      if (d.close_hour <= d.open_hour) return 'Giờ đóng cửa phải sau giờ mở cửa';
      if (d.min_week_hours == null || d.max_week_hours == null) return 'Vui lòng nhập giờ tối thiểu và tối đa mỗi tuần';
      if (d.max_day_hours == null) return 'Vui lòng nhập số giờ tối đa mỗi ngày';
      if (d.max_day_hours < 1 || d.max_day_hours > d.close_hour - d.open_hour) return 'Giờ tối đa mỗi ngày phải từ 1 đến ' + (d.close_hour - d.open_hour) + ' (số giờ mở cửa)';
      var longest = Math.max.apply(null, d.shifts.map(function (s) { return s.end_hour - s.start_hour; }));
      if (longest > d.max_day_hours) return 'Có ca dài ' + longest + ' giờ, vượt số giờ tối đa mỗi ngày (' + d.max_day_hours + ')';
      if (d.headcount != null && d.headcount < 1) return 'Số người cần tuyển phải từ 1 trở lên';
      if (d.max_per_shift == null || d.max_per_shift < 1) return 'Số người tối đa mỗi ca phải từ 1 trở lên';
      if (!d.items.some(function (i) { return i.kind === 'task'; })) return 'Vui lòng nhập nhiệm vụ chính';
      if (d.min_week_hours != null && d.max_week_hours != null && d.min_week_hours > d.max_week_hours) return 'Giờ tối thiểu/tuần không được lớn hơn tối đa';
      if (d.min_per_shift != null && d.max_per_shift != null && d.min_per_shift > d.max_per_shift) return 'Số người tối thiểu/ca không được lớn hơn tối đa';
      if (!d.deadline) return 'Vui lòng chọn hạn ứng tuyển';
      if (!d.start_date) return 'Vui lòng chọn ngày bắt đầu làm';
      if (d.start_date < d.deadline) return 'Ngày bắt đầu làm không được trước hạn ứng tuyển';
      if (!d.contact_name) return 'Vui lòng nhập người liên hệ phỏng vấn';
      if (!/^0\d{9}$/.test(d.contact_phone)) return 'SĐT liên hệ phải gồm 10 chữ số, bắt đầu bằng 0';
      return '';
    }

    var err = $('posterr');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = read(), problem = check(d);
      if (problem) return msg(err, problem);
      d.headcount = d.headcount || 1;
      if (d.pending_limit == null) d.pending_limit = 10;
      if (d.min_per_shift == null) d.min_per_shift = 1;
      d.max_shift_hours = Math.max.apply(null, d.shifts.map(function (s) { return s.end_hour - s.start_hour; }));
      Object.keys(d).forEach(function (k) { if (d[k] === null || d[k] === '') delete d[k]; });
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Đang đăng…';
      A.call('POST', '/api/positions', d).then(function () { location.href = 'positions.html'; })
        .catch(function (er) { btn.disabled = false; btn.textContent = 'Đăng tin tuyển'; msg(err, er.message); });
    });
    preview();
  }

  document.addEventListener('DOMContentLoaded', function () {
    A = window.CR_AUTH;
    ({ list: initList, detail: initDetail, myjobs: initMyJobs, positions: initPositions, newpost: initNewPost }[page] || function () {})();
  });
})();
