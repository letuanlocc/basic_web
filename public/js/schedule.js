// CaRảnh – lịch làm theo tuần: ứng viên đăng ký ca (schedule.html), chủ quán xem lịch nhân viên (staff-schedule.html)
(function () {
  var A = window.CR_AUTH;
  var page = document.body.getAttribute('data-page');
  var DAY = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];
  var box = document.getElementById('sbody'), posSel = document.getElementById('pos'), posBox = document.getElementById('posbox');
  var week = 0; // 0 = tuần này, 1 = tuần sau

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function hh(h) { var m = Math.round(Number(h) * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); } // 8.5 → 08:30
  function empty(title, sub) {
    return '<div class="empty" role="status"><strong style="font-size:16px">' + esc(title) + '</strong>' + (sub ? '<span class="muted small">' + esc(sub) + '</span>' : '') + '</div>';
  }
  function fail(e) { return '<p class="msg err" role="alert">' + esc(e.message) + '</p>'; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dm(s) { var p = s.split('-'); return p[2] + '/' + p[1]; }

  // Thứ Hai của tuần cần xem (giờ địa phương)
  function weekStart() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + week * 7);
    return iso(d);
  }

  // ---- Lưới ca: hàng = ngày, cột = ca. opts.edit: ô bấm được; sel: tập "shift:weekday" đang chọn ----
  // Ca (c) trùng giờ với ca nhân viên đang giữ ở việc khác (busy lấy từ /api/employments/:id/busy)
  function busyWith(c, busy) {
    var hit = (busy || []).filter(function (b) {
      // chủ quán: server chỉ trả { shift_id, weekday, blocked } (không lộ việc khác)
      if (b.blocked !== undefined) return String(b.shift_id) === String(c.shift_id) && b.weekday === c.weekday;
      // nhân viên: có đủ giờ; own = ca chính mình tô bận, còn lại là ca ở việc khác
      return b.weekday === c.weekday && c.start_hour < b.end_hour && c.end_hour > b.start_hour;
    });
    return hit.filter(function (b) { return b.blocked || b.own; })[0] || hit[0]; // báo bận ưu tiên hơn ca trùng
  }
  function busyText(b) { if (b.blocked !== undefined || b.own) return ''; return b.shop_name + ' – ' + b.position_title + ' (' + b.shift_name + ' ' + hh(b.start_hour) + '–' + hh(b.end_hour) + ')'; }

  function grid(cells, sel, edit, force, busy, mode) { // force: chủ quán chỉnh lịch, được chọn cả ca đã đủ người / ca trùng việc khác
    var shifts = [], seen = {}, rows = {};
    cells.forEach(function (c) {
      if (!seen[c.shift_id]) { seen[c.shift_id] = 1; shifts.push(c); }
      (rows[c.weekday] = rows[c.weekday] || {})[c.shift_id] = c;
    });
    shifts.sort(function (a, b) { return a.start_hour - b.start_hour; });
    var head = '<div class="r"><span></span>' + shifts.map(function (s) {
      return '<span class="head"><strong>' + esc(s.shift_name) + '</strong><small>' + hh(s.start_hour) + '–' + hh(s.end_hour) + '</small></span>';
    }).join('') + '</div>';
    var body = Object.keys(rows).sort().map(function (wd) {
      var first = rows[wd][shifts[0].shift_id] || rows[wd][Object.keys(rows[wd])[0]];
      return '<div class="r"><span class="day">' + DAY[wd] + '<small>' + dm(first.work_date) + '</small></span>' + shifts.map(function (s) {
        var c = rows[wd][s.shift_id];
        if (!c) return '<span></span>';
        var key = s.shift_id + ':' + wd, mine = edit ? !!sel[key] : c.mine;
        var cap = c.max_per_shift == null ? Infinity : Number(c.max_per_shift);
        var other = edit ? busyWith(c, busy) : null;
        var cls, state, dis;
        if (mode === 'busy') { // nhân viên tô ca bận: ô tô chéo = bận
          if (c.mine) { cls = 'cell mine'; state = 'Đã đăng ký làm'; dis = true; }
          else if (mine) { cls = 'cell busy'; state = 'Bạn báo bận'; dis = c.is_past; }
          else if (other) { cls = 'cell busy'; state = other.own ? 'Bạn báo bận ở việc khác' : 'Bận việc khác'; dis = true; }
          else { cls = 'cell'; state = ''; dis = c.is_past; }
        } else {
          var full = !mine && c.people >= cap;
          cls = 'cell' + (other ? ' busy' : mine ? ' mine' : full ? ' full' : c.understaffed ? ' need' : '');
          state = other ? (other.blocked ? 'Nhân viên báo bận' : other.own ? 'Bạn báo bận' : force ? 'Nhân viên bận' : 'Bận việc khác') : mine ? 'Đã chọn' : full ? 'Đã đủ người' : c.understaffed ? 'Đang thiếu người' : '';
          if (other && mine && !other.blocked) state = 'Đã chọn · nhân viên bận';
          dis = c.is_past || (full && !mine && !force) || (other && (other.blocked || other.own || (!force && !mine)));
        }
        var inner = '<span class="top"><span>' + c.people + (c.max_per_shift != null ? '/' + c.max_per_shift : '') + ' người</span></span>' +
          (state ? '<span class="ppl">' + state + '</span>' : '') +
          (other && busyText(other) ? '<span class="ppl">' + esc(busyText(other)) + '</span>' : '') +
          (!edit && c.names.length ? '<span class="ppl">' + esc(c.names.join(', ')) + '</span>' : '');
        if (!edit) return '<div class="' + cls + '">' + inner + '</div>';
        return '<button type="button" class="' + cls + '" data-key="' + key + '" aria-pressed="' + mine + '"' + (dis ? ' disabled' : '') +
          ' aria-label="' + esc(s.shift_name + ', ' + DAY[wd] + ' ' + dm(c.work_date) + (state ? ', ' + state : '')) + '">' + inner + '</button>';
      }).join('') + '</div>';
    }).join('');
    return '<div class="sched-wrap"><div class="sched" style="--n:' + shifts.length + '">' + head + body + '</div></div>';
  }

  function tabs(onChange) {
    var btns = document.querySelectorAll('[data-week]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        week = Number(b.getAttribute('data-week'));
        btns.forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
        onChange();
      });
    });
  }

  function initGoogleCalendar() {
    var status = document.getElementById('google-calendar-status');
    var connect = document.getElementById('google-calendar-connect');
    var disconnect = document.getElementById('google-calendar-disconnect');
    var preference = document.getElementById('google-calendar-preference');
    var autoSync = document.getElementById('google-calendar-manager');
    var message = document.getElementById('google-calendar-message');
    var current, changing = false, timer, request = 0, watchUntil = 0;

    function announce(text) {
      message.hidden = !text;
      message.textContent = text || '';
    }

    function show(label, tone) {
      if (status.textContent !== label) status.textContent = label;
      status.className = 'badge' + (tone ? ' ' + tone : '');
    }

    function render() {
      var available = current && current.available;
      var connected = available && current.status === 'active';
      var revoked = available && current.status === 'revoked';
      connect.hidden = !available || connected;
      disconnect.hidden = !connected && !revoked;
      preference.hidden = !connected;
      connect.disabled = disconnect.disabled = autoSync.disabled = changing;
      connect.textContent = revoked ? 'Kết nối lại' : 'Kết nối Google Calendar';
      autoSync.checked = Boolean(current && current.auto_sync_manager_changes);

      if (!current) show('Đang tải…');
      else if (!available) show('Chưa được cấu hình');
      else if (revoked) show('Cần kết nối lại', 'err');
      else if (!connected) show('Chưa kết nối');
      else if (current.sync_status === 'syncing') show('Đang đồng bộ', 'warn');
      else if (current.sync_status === 'error') show('Đồng bộ lỗi', 'err');
      else show('Đã kết nối', 'ok');
    }

    function scheduleRefresh() {
      clearTimeout(timer);
      if (changing || document.hidden) return;
      if (!current || (current.available && current.status === 'active')) {
        var quick = (current && current.sync_status === 'syncing') || Date.now() < watchUntil;
        timer = setTimeout(refresh, quick ? 1400 : 15000);
      }
    }

    function refresh() {
      clearTimeout(timer);
      if (changing || document.hidden) return;
      var id = ++request;
      A.call('GET', '/api/google/status').then(function (data) {
        if (id !== request) return;
        current = data;
        render();
        scheduleRefresh();
      }).catch(function () {
        if (id !== request) return;
        if (!current) show('Không tải được trạng thái', 'err');
        scheduleRefresh();
      });
    }

    function change(action, done) {
      ++request; clearTimeout(timer);
      changing = true;
      if (current && current.status === 'active') autoSync.disabled = true;
      connect.disabled = disconnect.disabled = true;
      announce('');
      action().then(function (data) {
        if (done) done(data);
        else if (data) current = data;
      }).catch(function (error) {
        announce(error.message);
      }).finally(function () {
        changing = false;
        render();
        scheduleRefresh();
      });
    }

    connect.addEventListener('click', function () {
      change(function () { return A.call('GET', '/api/google/connect'); }, function (data) {
        window.location.assign(data.url);
      });
    });

    disconnect.addEventListener('click', function () {
      change(function () { return A.call('DELETE', '/api/google/disconnect'); }, function (data) {
        current = data;
        changing = false;
        render();
        connect.focus();
      });
    });

    autoSync.addEventListener('change', function () {
      var enabled = autoSync.checked;
      change(function () { return A.call('PUT', '/api/google/settings', { auto_sync_manager_changes: enabled }); });
    });

    var landing = new URL(window.location.href);
    var result = landing.searchParams.get('google');
    if (result) {
      var feedback = {
        cancelled: 'Bạn đã hủy cấp quyền Google Calendar.',
        expired: 'Phiên kết nối Google đã hết hạn. Hãy thử kết nối lại.',
        error: 'Kết nối Google Calendar không thành công. Hãy kiểm tra tài khoản Google rồi thử lại.',
      };
      if (Object.hasOwn(feedback, result)) announce(feedback[result]);
      landing.searchParams.delete('google');
      history.replaceState(history.state, '', landing.pathname + landing.search + landing.hash);
    }

    document.addEventListener('visibilitychange', refresh);
    refresh();
    return function () {
      watchUntil = Date.now() + 6000;
      refresh();
    };
  }

  // ================= Ứng viên: đăng ký ca =================
  function initSeeker() {
    var onScheduleSaved = initGoogleCalendar();
    var jobs = [], sel = {}, cells = [], busy = [], busySel = {}, mode = 'shift'; // mode: 'shift' đăng ký ca | 'busy' tô ca bận; busySel: ô bận của việc đang xem

    function current() { return jobs[posSel.selectedIndex]; }
    function count() { return Object.keys(sel).length; }
    function hoursNotice(hours, position, hasSelection) {
      if (!hasSelection) return null;
      if (position.max_day_hours != null) {
        var perDay = {};
        cells.forEach(function (c) {
          if (sel[c.shift_id + ':' + c.weekday]) perDay[c.weekday] = (perDay[c.weekday] || 0) + c.end_hour - c.start_hour;
        });
        for (var wd in perDay) {
          if (perDay[wd] > Number(position.max_day_hours)) {
            return {
              kind: 'err',
              text: 'Bạn đã chọn ' + perDay[wd] + ' giờ trong ' + DAY[wd] + ', vượt quá số giờ tối đa mỗi ngày (' + position.max_day_hours + ' giờ). Hãy bỏ bớt ca trong ngày này.'
            };
          }
        }
      }
      if (position.max_week_hours != null && hours > Number(position.max_week_hours)) {
        return {
          kind: 'err',
          text: 'Bạn đang chọn ' + hours + ' giờ/tuần, vượt mức tối đa ' + position.max_week_hours + ' giờ. Hãy bỏ chọn ca để giảm tổng giờ trước khi lưu.'
        };
      }
      if (position.min_week_hours != null && hours < Number(position.min_week_hours)) {
        return {
          kind: 'warn',
          text: 'Bạn đang chọn ' + hours + ' giờ/tuần, thấp hơn mức tối thiểu ' + position.min_week_hours + ' giờ. Đây là cảnh báo: bạn vẫn có thể lưu lịch, hoặc chọn thêm ca để đạt mức tối thiểu.'
        };
      }
      return null;
    }

    // Ô bận đã lưu của việc đang xem → busySel; phần còn lại (việc khác) là ô bị khóa
    function loadBusy() {
      busySel = {};
      var mineShift = {};
      cells.forEach(function (c) { mineShift[c.shift_id] = 1; });
      busy.forEach(function (b) { if (b.own && mineShift[b.shift_id]) busySel[b.shift_id + ':' + b.weekday] = 1; });
    }
    function busyElsewhere() {
      var mineShift = {};
      cells.forEach(function (c) { mineShift[c.shift_id] = 1; });
      return busy.filter(function (b) { return !(b.own && mineShift[b.shift_id]); });
    }

    function paint() {
      var j = current(), p = j.position, isBusy = mode === 'busy';
      var hours = 0;
      cells.forEach(function (c) { if (sel[c.shift_id + ':' + c.weekday]) hours += c.end_hour - c.start_hour; });
      var notice = hoursNotice(hours, p, count() > 0);
      var limit = (p.min_week_hours != null || p.max_week_hours != null)
        ? 'Quy định: ' + (p.min_week_hours || 0) + ' – ' + (p.max_week_hours || '…') + ' giờ/tuần. ' : '';
      var note = p.schedule_note ? '<p class="msg info"><strong>Ghi chú từ chủ quán:</strong> <span class="pre-line">' + esc(p.schedule_note) + '</span></p>' : '';
      var switcher = '<div class="tabs pill" role="tablist" aria-label="Chế độ chọn">' +
        '<button type="button" role="tab" data-mode="shift" aria-selected="' + !isBusy + '">Đăng ký ca làm</button>' +
        '<button type="button" role="tab" data-mode="busy" aria-selected="' + isBusy + '">Báo bận</button></div>';
      var info = isBusy
        ? '<p class="msg info">Bấm vào ca bạn <strong>không làm được</strong> (ô tô chéo). Ca đó bị khóa ở mọi việc của bạn nếu trùng giờ, và chủ quán chỉ thấy "bận", không thấy lý do. Bạn đang báo bận <strong>' + Object.keys(busySel).length + ' ca</strong>. Ca đã đăng ký làm cần bỏ trước ở chế độ "Đăng ký ca làm".</p>'
        : '<p class="msg info">' + esc(limit) + 'Mỗi ca có số người tối đa do chủ quán quy định; ai lưu trước được giữ chỗ trước. Bạn đang chọn <strong>' + count() + ' ca · ' + hours + ' giờ</strong>. Ca đã qua không đổi được.</p>';
      box.innerHTML = switcher + (isBusy ? '' : note) + info +
        (!isBusy && notice ? '<p class="msg ' + notice.kind + '" role="status">' + esc(notice.text) + '</p>' : '') +
        (isBusy ? grid(cells, busySel, true, false, busyElsewhere(), 'busy') : grid(cells, sel, true, false, busy)) +
        '<p class="msg" id="smsg" role="status" hidden></p>' +
        '<div class="row" style="justify-content:flex-end">' + (isBusy
          ? '<button type="button" class="btn btn-primary btn-lg" id="busysave">Lưu ca bận</button>'
          : '<button type="button" class="btn btn-primary btn-lg" id="ssave"' + (notice && notice.kind === 'err' ? ' disabled' : '') + '>Lưu lịch làm</button>') + '</div>';
    }

    function load(notice) {
      var j = current();
      box.innerHTML = '<p class="muted">Đang tải…</p>';
      Promise.all([
        A.call('GET', '/api/positions/' + j.position.id + '/schedule?week_start=' + weekStart()),
        A.call('GET', '/api/employments/' + j.id + '/busy?week_start=' + weekStart()).catch(function () { return []; })
      ]).then(function (res) {
        var rows = res[0]; busy = res[1] || [];
        cells = rows; sel = {}; mode = 'shift'; loadBusy();
        rows.forEach(function (c) { if (c.mine) sel[c.shift_id + ':' + c.weekday] = 1; });
        if (!rows.length) { box.innerHTML = empty('Vị trí này chưa có ca làm', 'Hãy liên hệ chủ quán để thêm ca.'); return; }
        paint();
        if (notice) {
          var m = document.getElementById('smsg');
          m.hidden = false; m.className = 'msg err'; m.textContent = notice;
        }
      }).catch(function (e) {
        box.innerHTML = fail(notice ? new Error(notice + ' Không tải lại được lịch: ' + e.message) : e);
      });
    }

    box.addEventListener('click', function (e) {
      var modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) { mode = modeBtn.getAttribute('data-mode'); var t0 = window.scrollY; paint(); window.scrollTo(0, t0); return; }
      var cell = e.target.closest('[data-key]');
      if (cell) {
        var k = cell.getAttribute('data-key'), target = mode === 'busy' ? busySel : sel;
        if (target[k]) delete target[k]; else target[k] = 1;
        var top = window.scrollY; paint(); window.scrollTo(0, top);
        return;
      }
      var busySave = e.target.closest('#busysave');
      if (busySave) {
        var bm = document.getElementById('smsg');
        var bbody = cells.filter(function (c) { return busySel[c.shift_id + ':' + c.weekday]; })
          .map(function (c) { return { shift_id: c.shift_id, weekday: c.weekday }; });
        busySave.disabled = true; busySave.textContent = 'Đang lưu…';
        A.call('PUT', '/api/employments/' + current().id + '/busy', { week_start: weekStart(), cells: bbody }).then(function () {
          return A.call('GET', '/api/employments/' + current().id + '/busy?week_start=' + weekStart()).then(function (b) {
            busy = b || []; loadBusy();
            var top = window.scrollY; paint(); window.scrollTo(0, top);
            var m = document.getElementById('smsg');
            m.hidden = false; m.className = 'msg'; m.textContent = 'Đã lưu ca bận. Chủ quán sẽ không xếp bạn vào những ca này.';
          });
        }).catch(function (er) {
          busySave.disabled = false; busySave.textContent = 'Lưu ca bận';
          bm.hidden = false; bm.className = 'msg err'; bm.textContent = er.message;
        });
        return;
      }
      var save = e.target.closest('#ssave');
      if (!save) return;
      var out = document.getElementById('smsg');
      var position = current().position, totalHours = 0;
      cells.forEach(function (c) { if (sel[c.shift_id + ':' + c.weekday]) totalHours += c.end_hour - c.start_hour; });
      var notice = hoursNotice(totalHours, position, count() > 0);
      if (notice && notice.kind === 'err') {
        out.hidden = false; out.className = 'msg err'; out.textContent = notice.text;
        return;
      }
      var body = cells.filter(function (c) { return sel[c.shift_id + ':' + c.weekday]; })
        .map(function (c) { return { shift_id: c.shift_id, weekday: c.weekday }; });
      save.disabled = true; save.textContent = 'Đang lưu…';
      A.call('PUT', '/api/employments/' + current().id + '/schedule', { week_start: weekStart(), cells: body }).then(function (r) {
        onScheduleSaved();
        var warn = r && r.below_min_week;
        var savedHours = r && r.total_hours != null ? r.total_hours : totalHours;
        var savedNotice = hoursNotice(savedHours, position, count() > 0 || warn);
        return A.call('GET', '/api/positions/' + current().position.id + '/schedule?week_start=' + weekStart()).then(function (rows) {
          cells = rows; sel = {};
          rows.forEach(function (c) { if (c.mine) sel[c.shift_id + ':' + c.weekday] = 1; });
          paint();
          var m = document.getElementById('smsg');
          m.hidden = false; m.className = 'msg' + (savedNotice ? ' ' + savedNotice.kind : '');
          m.textContent = 'Đăng ký ca thành công. HR có thể xem lịch đã cập nhật trong mục Lịch làm.' +
            (savedHours != null ? ' Tổng ' + savedHours + ' giờ trong tuần.' : '') +
            (savedNotice ? ' ' + savedNotice.text : '');
        });
      }).catch(function (er) {
        if (/Ca này đã đủ người/.test(er.message)) {
          var wanted = Object.keys(sel);
          A.call('GET', '/api/positions/' + current().position.id + '/schedule?week_start=' + weekStart()).then(function (rows) {
            var full = rows.filter(function (c) {
              var cap = c.max_per_shift == null ? Infinity : Number(c.max_per_shift);
              return wanted.indexOf(c.shift_id + ':' + c.weekday) >= 0 && !c.mine && c.people >= cap;
            }).map(function (c) { return c.shift_name + ' ' + DAY[c.weekday] + ' ' + dm(c.work_date); });
            load('Chưa lưu được vì ' + (full.length ? full.join(', ') + ' đã đủ người' : 'có ca đã đủ người') + '. Lịch đã được tải lại; hãy chọn ca khác rồi lưu lại.');
          }).catch(function () { load(er.message + ' Lịch đã được tải lại; hãy chọn ca khác rồi lưu lại.'); });
        } else {
          save.disabled = false; save.textContent = 'Lưu lịch làm';
          out.hidden = false; out.className = 'msg err'; out.textContent = er.message;
        }
      });
    });

    tabs(load);
    posSel.addEventListener('change', function () { load(); });
    A.call('GET', '/api/employments/mine').then(function (rows) {
      jobs = rows;
      if (!rows.length) { box.innerHTML = empty('Bạn chưa được nhận vào vị trí nào', 'Khi chủ quán nhận hồ sơ, bạn sẽ đăng ký ca tại đây.'); return; }
      posSel.innerHTML = rows.map(function (r) { return '<option>' + esc(r.position.title + ' · ' + (r.position.shop && r.position.shop.name)) + '</option>'; }).join('');
      posBox.hidden = rows.length < 2;
      var selectedPosition = new URLSearchParams(location.search).get('position');
      var selectedIndex = rows.findIndex(function (r) { return String(r.position.id) === selectedPosition; });
      // Liên kết trỏ tới một việc không còn hiệu lực (vd. chủ quán đã xóa khỏi danh sách nhân viên): báo rõ,
      // không lặng lẽ hiện lịch của việc khác để người dùng tưởng vẫn đăng ký được ở việc đó.
      if (selectedPosition && selectedIndex < 0) {
        posBox.hidden = true;
        box.innerHTML = empty('Bạn không còn làm ở vị trí này', 'Chủ quán đã xóa bạn khỏi danh sách nhân viên nên không thể đăng ký lịch làm ở đây.') +
          '<div class="row" style="justify-content:center;margin-top:16px"><a class="btn" href="schedule.html">Xem lịch các việc đang làm</a></div>';
        return;
      }
      if (selectedIndex >= 0) posSel.selectedIndex = selectedIndex;
      load();
    }).catch(function (e) { box.innerHTML = fail(e); });
  }

  // ================= Chủ quán: xem lịch nhân viên =================
  function initEmployer() {
    var positions = [], rule = document.getElementById('rule'), rulebox = document.getElementById('rulebox'),
      rulemsg = document.getElementById('rulemsg'), rulesave = document.getElementById('rulesave'),
      refresh = document.getElementById('refreshSchedule');

    var editing = null, sel = {}, data = null, flash = '', busy = []; // editing = { id, name }: nhân viên đang được chỉnh lịch

    function current() { return positions[posSel.selectedIndex]; }
    function selHours() {
      var h = 0;
      data.cells.forEach(function (c) { if (sel[c.shift_id + ':' + c.weekday]) h += c.end_hour - c.start_hour; });
      return h;
    }

    function render() {
      var cells = data.cells, staff = data.staff;
      var people = '<section class="panel"><h2>Nhân viên (' + staff.length + ')</h2>' + (staff.length
        ? '<ul style="list-style:none;margin:0;padding:0">' + staff.map(function (s) {
          var u = (s.seeker && s.seeker.user) || {};
          return '<li class="row between" style="padding:10px 0;border-top:1px solid var(--line-3)"><span><strong>' + esc(u.full_name || 'Nhân viên') + '</strong> <span class="muted small">từ ' + esc(String(s.started_at || '').slice(0, 10).split('-').reverse().join('/')) + '</span></span>' +
            '<span class="row"><button type="button" class="btn btn-sm" data-edit="' + esc(s.id) + '" data-name="' + esc(u.full_name || 'Nhân viên') + '">Chỉnh lịch</button>' +
            '<button type="button" class="btn btn-danger btn-sm" data-remove="' + esc(s.id) + '">Xóa khỏi danh sách</button></span></li>';
        }).join('') + '</ul>'
        : '<p class="muted small" style="margin:0">Chưa có nhân viên nào ở vị trí này.</p>') + '</section>';
      var schedule;
      if (!cells.length) {
        schedule = empty('Vị trí này chưa có ca làm', 'Thêm ca làm khi đăng tin để nhân viên đăng ký lịch.');
      } else if (editing) {
        schedule = '<section class="panel"><h2>Chỉnh lịch của ' + esc(editing.name) + '</h2>' +
          '<p class="msg info">Bạn có thể chọn cả ca đã đủ người; ca đã qua không đổi được. Đang chọn <strong>' + Object.keys(sel).length + ' ca · ' + selHours() + ' giờ</strong>.</p>' +
          grid(cells, sel, true, true, busy) + '<p class="msg" id="emsg" role="status" hidden></p>' +
          '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" id="ecancel">Hủy</button><button type="button" class="btn btn-primary" id="esave">Lưu lịch</button></div></section>';
      } else {
        var booked = cells.filter(function (c) { return c.people > 0; }).length;
        schedule = '<section class="panel"><div class="row between"><h2 style="margin:0">Lịch đã đăng ký</h2><span class="badge">' + booked + ' ca có người</span></div>' +
          '<p class="muted small">Lịch được cập nhật sau khi nhân viên lưu ca. Tên người đăng ký hiển thị ngay trong từng ca.</p>' + grid(cells, {}, false) + '</section>';
      }
      box.innerHTML = flash + schedule + people;
      flash = '';
    }

    function load(showUpdated, quiet) {
      var p = current();
      if (!quiet) {
        refresh.disabled = true;
        box.innerHTML = '<p class="muted">Đang tải…</p>';
      }
      var ws = weekStart();
      Promise.all([
        A.call('GET', '/api/positions/' + p.id + '/schedule?week_start=' + ws),
        A.call('GET', '/api/positions/' + p.id + '/employees'),
        A.call('GET', '/api/positions/' + p.id),
        editing ? A.call('GET', '/api/employments/' + editing.id + '/schedule?week_start=' + ws) : null,
        editing ? A.call('GET', '/api/employments/' + editing.id + '/busy?week_start=' + ws).catch(function () { return []; }) : null
      ]).then(function (r) {
        busy = r[4] || [];
        if (!quiet) { rule.value = r[2].schedule_note || ''; rulemsg.hidden = true; }
        data = { cells: r[0], staff: r[1] };
        sel = {};
        if (editing) (r[3] || []).forEach(function (c) { sel[c.shift_id + ':' + c.weekday] = 1; });
        if (showUpdated === true) flash = '<p class="msg info" role="status">Đã tải lịch mới nhất từ dữ liệu đăng ký của nhân viên.</p>';
        render();
        refresh.disabled = false;
      }).catch(function (e) {
        if (!quiet) box.innerHTML = fail(e); // làm mới ngầm thất bại thì giữ nguyên lịch đang hiển thị
        refresh.disabled = false;
      });
    }

    box.addEventListener('click', function (e) {
      var cell = e.target.closest('[data-key]');
      if (cell && editing) {
        var k = cell.getAttribute('data-key');
        if (sel[k]) delete sel[k]; else sel[k] = 1;
        var top = window.scrollY; render(); window.scrollTo(0, top);
        return;
      }
      var ed = e.target.closest('[data-edit]');
      if (ed) { editing = { id: ed.getAttribute('data-edit'), name: ed.getAttribute('data-name') }; load(); return; }
      if (e.target.closest('#ecancel')) { editing = null; sel = {}; render(); return; }
      var save = e.target.closest('#esave, #eforce');
      if (save) {
        var out = document.getElementById('emsg'), who = editing, force = save.id === 'eforce';
        var body = data.cells.filter(function (c) { return sel[c.shift_id + ':' + c.weekday]; })
          .map(function (c) { return { shift_id: c.shift_id, weekday: c.weekday }; });
        save.disabled = true; save.textContent = 'Đang lưu…';
        A.call('PUT', '/api/employments/' + who.id + '/manage-schedule', { week_start: weekStart(), cells: body, force: force }).then(function (r) {
          editing = null;
          flash = '<p class="msg" role="status">Đã lưu lịch của ' + esc(who.name) + (r && r.total_hours != null ? '. Tổng ' + r.total_hours + ' giờ trong tuần.' : '.') + '</p>';
          load();
        }).catch(function (er) {
          save.disabled = false; save.textContent = force ? 'Vẫn lưu lịch' : 'Lưu lịch';
          out.hidden = false;
          if (/^Trùng lịch việc khác/.test(er.message)) {
            // Cảnh báo, không chặn: chủ quán có thể chọn vẫn lưu
            out.className = 'msg warn';
            out.textContent = er.message.replace(/^Trùng lịch việc khác: /, 'Nhân viên đang bận vào: ') + '. Bỏ chọn các ca này, hoặc bấm "Vẫn lưu lịch" nếu bạn đã thỏa thuận với nhân viên.';
            if (!document.getElementById('eforce')) {
              var fb = document.createElement('button');
              fb.type = 'button'; fb.className = 'btn'; fb.id = 'eforce'; fb.textContent = 'Vẫn lưu lịch';
              document.getElementById('esave').parentNode.insertBefore(fb, document.getElementById('esave'));
            }
          } else {
            out.className = 'msg err'; out.textContent = er.message;
          }
        });
        return;
      }
      var b = e.target.closest('[data-remove]'); if (!b) return;
      if (!confirm('Xóa nhân viên này khỏi danh sách? Các ca từ tuần này trở đi sẽ bị hủy.')) return;
      b.disabled = true;
      if (editing && editing.id === b.getAttribute('data-remove')) editing = null;
      A.call('DELETE', '/api/employments/' + b.getAttribute('data-remove')).then(function () { load(); })
        .catch(function (er) { b.disabled = false; alert(er.message); });
    });

    rulesave.addEventListener('click', function () {
      rulesave.disabled = true;
      A.call('PUT', '/api/positions/' + current().id, { schedule_note: rule.value.trim() || null }).then(function () {
        rulemsg.hidden = false; rulemsg.className = 'msg'; rulemsg.textContent = 'Đã lưu ghi chú.'; rulesave.disabled = false;
      }).catch(function (er) {
        rulemsg.hidden = false; rulemsg.className = 'msg err'; rulemsg.textContent = er.message; rulesave.disabled = false;
      });
    });

    tabs(load);
    posSel.addEventListener('change', function () { editing = null; load(); });
    refresh.addEventListener('click', function () { load(true); });
    // Tự làm mới lịch mỗi 30 giây (im lặng, không đụng ô ghi chú) để HR thấy ca mới đăng ký; không làm khi đang chỉnh lịch
    setInterval(function () { if (!document.hidden && !editing && positions.length && !refresh.disabled) load(false, true); }, 30000);
    A.call('GET', '/api/me/shop/positions').then(function (rows) {
      positions = rows;
      if (!rows.length) { box.innerHTML = empty('Chưa có vị trí nào', 'Đăng tin tuyển để bắt đầu quản lý lịch làm.'); return; }
      posSel.innerHTML = rows.map(function (r) { return '<option>' + esc(r.title) + '</option>'; }).join('');
      posBox.hidden = false; rulebox.hidden = false;
      load();
    }).catch(function (e) { box.innerHTML = fail(e); });
  }

  if (page === 'schedule') initSeeker(); else if (page === 'staff') initEmployer();
})();
