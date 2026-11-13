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
  function hh(h) { return String(h).padStart(2, '0') + ':00'; }
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
  function grid(cells, sel, edit) {
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
        var full = !mine && c.people >= cap;
        var cls = 'cell' + (mine ? ' mine' : full ? ' full' : c.understaffed ? ' need' : '');
        var state = mine ? 'Đã chọn' : full ? 'Đã đủ người' : c.understaffed ? 'Đang thiếu người' : '';
        var inner = '<span class="top"><span>' + c.people + (c.max_per_shift != null ? '/' + c.max_per_shift : '') + ' người</span></span>' +
          (state ? '<span class="ppl">' + state + '</span>' : '') +
          (!edit && c.names.length ? '<span class="ppl">' + esc(c.names.join(', ')) + '</span>' : '');
        if (!edit) return '<div class="' + cls + '">' + inner + '</div>';
        var dis = c.is_past || (full && !mine);
        return '<button type="button" class="' + cls + '" data-key="' + key + '" aria-pressed="' + mine + '"' + (dis ? ' disabled' : '') +
          ' aria-label="' + esc(s.shift_name + ', ' + DAY[wd] + ' ' + dm(c.work_date)) + '">' + inner + '</button>';
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

  // ================= Ứng viên: đăng ký ca =================
  function initSeeker() {
    var jobs = [], sel = {}, cells = [];

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

    function paint() {
      var j = current(), p = j.position;
      var hours = 0;
      cells.forEach(function (c) { if (sel[c.shift_id + ':' + c.weekday]) hours += c.end_hour - c.start_hour; });
      var notice = hoursNotice(hours, p, count() > 0);
      var limit = (p.min_week_hours != null || p.max_week_hours != null)
        ? 'Quy định: ' + (p.min_week_hours || 0) + ' – ' + (p.max_week_hours || '…') + ' giờ/tuần. ' : '';
      var note = p.schedule_note ? '<p class="msg info"><strong>Ghi chú từ chủ quán:</strong> <span class="pre-line">' + esc(p.schedule_note) + '</span></p>' : '';
      box.innerHTML = note + '<p class="msg info">' + esc(limit) + 'Mỗi ca có số người tối đa do chủ quán quy định; ai lưu trước được giữ chỗ trước. Bạn đang chọn <strong>' + count() + ' ca · ' + hours + ' giờ</strong>. Ca đã qua không đổi được.</p>' +
        (notice ? '<p class="msg ' + notice.kind + '" role="status">' + esc(notice.text) + '</p>' : '') +
        grid(cells, sel, true) +
        '<p class="msg" id="smsg" role="status" hidden></p>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-primary btn-lg" id="ssave"' + (notice && notice.kind === 'err' ? ' disabled' : '') + '>Lưu lịch làm</button></div>';
    }

    function load(notice) {
      var j = current();
      box.innerHTML = '<p class="muted">Đang tải…</p>';
      A.call('GET', '/api/positions/' + j.position.id + '/schedule?week_start=' + weekStart()).then(function (rows) {
        cells = rows; sel = {};
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
      var cell = e.target.closest('[data-key]');
      if (cell) {
        var k = cell.getAttribute('data-key');
        if (sel[k]) delete sel[k]; else sel[k] = 1;
        var top = window.scrollY; paint(); window.scrollTo(0, top);
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
      var selectedIndex = rows.findIndex(function (r) { return r.position.id === selectedPosition; });
      if (selectedIndex >= 0) posSel.selectedIndex = selectedIndex;
      load();
    }).catch(function (e) { box.innerHTML = fail(e); });
  }

  // ================= Chủ quán: xem lịch nhân viên =================
  function initEmployer() {
    var positions = [], rule = document.getElementById('rule'), rulebox = document.getElementById('rulebox'),
      rulemsg = document.getElementById('rulemsg'), rulesave = document.getElementById('rulesave'),
      refresh = document.getElementById('refreshSchedule');

    function current() { return positions[posSel.selectedIndex]; }

    function load(showUpdated, quiet) {
      var p = current();
      if (!quiet) {
        refresh.disabled = true;
        box.innerHTML = '<p class="muted">Đang tải…</p>';
      }
      Promise.all([
        A.call('GET', '/api/positions/' + p.id + '/schedule?week_start=' + weekStart()),
        A.call('GET', '/api/positions/' + p.id + '/employees'),
        A.call('GET', '/api/positions/' + p.id)
      ]).then(function (r) {
        var cells = r[0], staff = r[1];
        if (!quiet) { rule.value = r[2].schedule_note || ''; rulemsg.hidden = true; }
        var people = '<section class="panel"><h2>Nhân viên (' + staff.length + ')</h2>' + (staff.length
          ? '<ul style="list-style:none;margin:0;padding:0">' + staff.map(function (s) {
            var u = (s.seeker && s.seeker.user) || {};
            return '<li class="row between" style="padding:10px 0;border-top:1px solid var(--line-3)"><span><strong>' + esc(u.full_name || 'Nhân viên') + '</strong> <span class="muted small">từ ' + esc(String(s.started_at || '').slice(0, 10).split('-').reverse().join('/')) + '</span></span>' +
              '<button type="button" class="btn btn-danger btn-sm" data-remove="' + esc(s.id) + '">Xóa khỏi danh sách</button></li>';
          }).join('') + '</ul>'
          : '<p class="muted small" style="margin:0">Chưa có nhân viên nào ở vị trí này.</p>') + '</section>';
        var booked = cells.filter(function (c) { return c.people > 0; }).length;
        var schedule = cells.length
          ? '<section class="panel"><div class="row between"><h2 style="margin:0">Lịch đã đăng ký</h2><span class="badge">' + booked + ' ca có người</span></div>' +
            '<p class="muted small">Lịch được cập nhật sau khi nhân viên lưu ca. Tên người đăng ký hiển thị ngay trong từng ca.</p>' + grid(cells, {}, false) + '</section>'
          : empty('Vị trí này chưa có ca làm', 'Thêm ca làm khi đăng tin để nhân viên đăng ký lịch.');
        box.innerHTML = (showUpdated === true ? '<p class="msg info" role="status">Đã tải lịch mới nhất từ dữ liệu đăng ký của nhân viên.</p>' : '') + schedule + people;
        refresh.disabled = false;
      }).catch(function (e) {
        if (!quiet) box.innerHTML = fail(e); // làm mới ngầm thất bại thì giữ nguyên lịch đang hiển thị
        refresh.disabled = false;
      });
    }

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-remove]'); if (!b) return;
      if (!confirm('Xóa nhân viên này khỏi danh sách? Các ca từ tuần này trở đi sẽ bị hủy.')) return;
      b.disabled = true;
      A.call('DELETE', '/api/employments/' + b.getAttribute('data-remove')).then(load)
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
    posSel.addEventListener('change', function () { load(); });
    refresh.addEventListener('click', function () { load(true); });
    // Tự làm mới lịch mỗi 30 giây (im lặng, không đụng ô ghi chú) để HR thấy ca mới đăng ký
    setInterval(function () { if (!document.hidden && positions.length && !refresh.disabled) load(false, true); }, 30000);
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
