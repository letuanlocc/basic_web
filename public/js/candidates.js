// CaRảnh – nhà tuyển dụng: danh sách ứng viên tiềm năng + hồ sơ chi tiết + mời ứng tuyển
(function () {
  var A = window.CR_AUTH;
  var page = document.body.getAttribute('data-page');
  var LANG = { 0: 'Chưa có', 1: 'Giao tiếp cơ bản', 2: 'Khá', 3: 'Tốt' };
  var WORKMODE = { online: 'Online', offline: 'Offline', both: 'Online & Offline' };
  var SLOT = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối', weekend: 'Cuối tuần' };
  var GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function $(id) { return document.getElementById(id); }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function badge(kind, text) { return '<span class="badge ' + kind + '">' + esc(text) + '</span>'; }
  function empty(title, sub) {
    return '<div class="empty" role="status"><strong style="font-size:16px">' + esc(title) + '</strong>' + (sub ? '<span class="muted small">' + esc(sub) + '</span>' : '') + '</div>';
  }
  function msg(el, text, kind) { el.className = 'msg ' + (kind || 'err'); el.textContent = text; el.hidden = false; }
  function name(c) { return (c.user && c.user.full_name) || 'Ứng viên'; }
  function age(c) { return c.birth_year ? new Date().getFullYear() - c.birth_year : null; }
  function slots(c) { return (c.availability || []).map(function (a) { return SLOT[a.slot] || a.slot; }); }
  function initial(c) { return '<span class="initial round" aria-hidden="true">' + esc(name(c).replace(/^\[[^\]]*\]\s*/, '').trim().charAt(0).toUpperCase()) + '</span>'; }

  // ---------- Danh sách ----------
  function card(c) {
    var meta = [WORKMODE[c.work_mode], c.area, age(c) ? age(c) + ' tuổi' : ''].filter(Boolean);
    var sl = slots(c);
    return '<article class="card"><div class="card-head">' + initial(c) +
      '<div class="grow"><h3>' + esc(name(c)) + '</h3><p>' + esc(meta.join(' · ')) + '</p></div>' +
      badge(c.has_experience ? 'ok' : '', c.has_experience ? 'Có kinh nghiệm' : 'Chưa có kinh nghiệm') + '</div>' +
      '<dl class="facts"><dt>Ngoại ngữ</dt><dd>' + esc(LANG[c.language_level] || '—') + '</dd>' +
      '<dt>Thời gian rảnh</dt><dd>' + esc(sl.join(', ') || '—') + '</dd></dl>' +
      (c.availability_note ? '<p class="desc">' + esc(c.availability_note) + '</p>' : '') +
      '<a class="btn push" href="candidate-detail.html?id=' + esc(c.user_id) + '">Xem hồ sơ</a></article>';
  }

  function initList() {
    var box = $('clist'), count = $('ccount');
    var modeBtns = document.querySelectorAll('[data-mode]'), slotBtns = document.querySelectorAll('[data-slot]');
    var timer;

    function params() {
      var p = new URLSearchParams();
      modeBtns.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') p.set('work_mode', b.getAttribute('data-mode')); });
      var s = [];
      slotBtns.forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') s.push(b.getAttribute('data-slot')); });
      if (s.length) p.set('slots', s.join(','));
      if ($('fexp').value) p.set('has_experience', $('fexp').value);
      if ($('farea').value) p.set('area', $('farea').value);
      if ($('flang').value !== '0') p.set('min_lang', $('flang').value);
      p.set('sort', $('fsort').value);
      return p.toString();
    }
    function load() {
      A.call('GET', '/api/seekers?' + params()).then(function (rows) {
        count.textContent = rows.length + ' ứng viên';
        box.innerHTML = rows.length
          ? '<div class="grid-cards">' + rows.map(card).join('') + '</div>'
          : empty('Không có ứng viên phù hợp', 'Thử bỏ bớt bộ lọc để xem thêm ứng viên.');
      }).catch(function (e) { count.textContent = ''; box.innerHTML = '<p class="msg err" role="alert">Không tải được danh sách ứng viên: ' + esc(e.message) + '</p>'; });
    }
    function later() { clearTimeout(timer); timer = setTimeout(load, 150); }

    // hình thức chọn một; khung giờ chọn nhiều
    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true';
        modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', String(on)); later();
      });
    });
    slotBtns.forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); later(); });
    });
    ['fexp', 'farea', 'flang', 'fsort'].forEach(function (id) { $(id).addEventListener('change', later); });
    $('freset').addEventListener('click', function () {
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      slotBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      $('fexp').value = ''; $('farea').value = ''; $('flang').value = '0'; $('fsort').value = 'updated';
      later();
    });
    load();
  }

  // ---------- Chi tiết + mời ----------
  function initDetail() {
    var box = $('cdetail'), id = qs('id');
    if (!id) { box.innerHTML = empty('Không tìm thấy hồ sơ', 'Đường dẫn thiếu mã ứng viên.'); return; }
    Promise.all([
      A.call('GET', '/api/seekers/' + id),
      A.call('GET', '/api/me/shop/positions').catch(function () { return []; })
    ]).then(function (r) { render(r[0], r[1].filter(function (p) { return p.is_open; })); })
      .catch(function (e) { box.innerHTML = empty('Không tải được hồ sơ', e.message); });

    function text(title, v) { return v ? '<section class="sect"><h2>' + title + '</h2><p style="margin:0">' + esc(v) + '</p></section>' : ''; }

    function render(c, positions) {
      var invite = positions.length
        ? '<div class="field"><label for="ipos">Mời vào vị trí</label><select id="ipos">' + positions.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.title) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label for="imsg">Lời nhắn (không bắt buộc)</label><textarea id="imsg" rows="3" maxlength="300" placeholder="Giới thiệu ngắn về công việc…"></textarea></div>' +
          '<p class="msg err" id="imsgout" role="alert" hidden></p><button type="button" class="btn btn-primary btn-lg" id="invite">Mời ứng tuyển</button>'
        : '<p class="msg info">Bạn chưa có vị trí nào đang tuyển để mời. <a href="new-post.html">Đăng tin tuyển</a> trước.</p>';

      box.innerHTML = '<div class="card-head">' + initial(c).replace('initial round', 'initial round xl') +
        '<div class="grow"><h1 style="margin:0;font-size:26px">' + esc(name(c)) + '</h1>' +
        '<div class="badges">' + badge(c.has_experience ? 'ok' : '', c.has_experience ? 'Có kinh nghiệm' : 'Chưa có kinh nghiệm') + badge('', WORKMODE[c.work_mode] || '—') + '</div></div></div>' +
        '<div class="two-col"><div class="stack-col" style="gap:16px">' +
        '<section class="sect"><h2>Thông tin chung</h2><dl class="facts">' +
        '<dt>Tuổi</dt><dd>' + (age(c) ? age(c) + ' (sinh ' + c.birth_year + ')' : '—') + '</dd>' +
        '<dt>Giới tính</dt><dd>' + esc(GENDER[c.gender] || '—') + '</dd>' +
        '<dt>Khu vực</dt><dd>' + esc(c.area || '—') + '</dd>' +
        '<dt>Ngoại ngữ</dt><dd>' + esc(LANG[c.language_level] || '—') + '</dd>' +
        '<dt>Thời gian rảnh</dt><dd>' + esc(slots(c).join(', ') || '—') + '</dd></dl>' +
        (c.availability_note ? '<p style="margin:0">' + esc(c.availability_note) + '</p>' : '') + '</section>' +
        text('Kinh nghiệm', c.experience) + text('Điểm mạnh', c.strengths) + text('Điểm cần cải thiện', c.improvements) +
        '</div><aside class="panel" aria-label="Mời ứng tuyển">' + invite + '</aside></div>';

      var btn = $('invite');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var out = $('imsgout'); out.hidden = true;
        btn.disabled = true; btn.textContent = 'Đang gửi…';
        A.call('POST', '/api/positions/' + $('ipos').value + '/invitations', { seeker_id: c.user_id, message: $('imsg').value.trim() || null })
          .then(function () {
            btn.textContent = 'Đã gửi lời mời';
            msg(out, 'Đã gửi lời mời tới ' + name(c) + '. Ứng viên sẽ thấy ở mục "Lời mời".', 'ok');
          })
          .catch(function (e) { btn.disabled = false; btn.textContent = 'Mời ứng tuyển'; msg(out, e.message); });
      });
    }
  }

  if (page === 'candidates') initList();
  else if (page === 'candidate') initDetail();
})();
