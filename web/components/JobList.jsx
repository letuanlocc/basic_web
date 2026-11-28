'use client';
// Danh sách việc + tìm bằng AI (NER) + chip bộ lọc. Dùng cho trang chủ (khách) và /jobs (người tìm việc).
// initial: trang đầu (bộ lọc mặc định) đã đọc sẵn trên máy chủ; null/không truyền thì tự tải ở trình duyệt.
import { useCallback, useEffect, useRef, useState } from 'react';
import { pub } from '@/lib/auth';
import { JOB_PAGE as LIMIT } from '@/lib/format';
import JobCard from './JobCard';
import { useSearch, useSearchHandlers } from './Search';
import { Empty, Notice } from './ui';

const FILTERS = [['all', 'Tất cả'], ['online', 'Online'], ['offline', 'Offline'], ['salary', 'Lương cao nhất']];
const NO_AI = { q: '', skills: [], jobs: [], loc: '', times: [] };

export default function JobList({ variant, initial = null }) {
  const search = useSearch();
  const [filter, setFilter] = useState('all');
  const [ai, setAi] = useState(NO_AI); // q = cụm gõ tay/từ khóa còn lại; jobs, skills, loc, times = từ NER
  const [rows, setRows] = useState(initial || []);
  const [more, setMore] = useState(!!initial && initial.length === LIMIT);
  const [loading, setLoading] = useState(!initial);
  const fromServer = useRef(initial); // dùng một lần cho lần hiển thị đầu
  const [err, setErr] = useState(null);
  const reqId = useRef(0);
  const typing = useRef(null);

  const mode = filter === 'online' || filter === 'offline' ? filter : '';
  const sort = filter === 'salary' ? 'salary' : 'new';

  // Gửi lên server: q là cụm gõ tay; mỗi chip (tên việc, kỹ năng) là một điều kiện riêng t=…, server ghép bằng AND.
  const url = useCallback((offset) => '/api/positions?limit=' + LIMIT + '&offset=' + offset + '&sort=' + sort +
    (mode ? '&mode=' + mode : '') +
    (ai.q ? '&q=' + encodeURIComponent(ai.q) : '') +
    ai.jobs.concat(ai.skills).map((t) => '&t=' + encodeURIComponent(t)).join('') +
    (ai.loc ? '&loc=' + encodeURIComponent(ai.loc) : ''), [sort, mode, ai]);

  useEffect(() => { search.setValue(''); return () => clearTimeout(typing.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tải lại từ đầu mỗi khi đổi bộ lọc
  useEffect(() => {
    if (fromServer.current) { fromServer.current = null; return; } // đã có dữ liệu từ máy chủ
    const id = ++reqId.current;
    setLoading(true);
    pub(url(0)).then((d) => {
      if (id !== reqId.current) return;
      setErr(null); setRows(d); setMore(d.length === LIMIT); setLoading(false);
    }).catch((e) => {
      if (id !== reqId.current) return;
      setErr('Không tải được danh sách việc: ' + e.message); setLoading(false);
    });
  }, [url]);

  function loadMore() {
    const id = ++reqId.current;
    setLoading(true);
    pub(url(rows.length)).then((d) => {
      if (id !== reqId.current) return;
      setRows((r) => r.concat(d)); setMore(d.length === LIMIT); setLoading(false);
    }).catch((e) => {
      if (id !== reqId.current) return;
      setErr('Không tải được danh sách việc: ' + e.message); setLoading(false);
    });
  }

  useSearchHandlers({
    // gõ chữ: tìm theo nguyên văn sau 350ms, bỏ chip AI cũ
    onInput: (text) => { clearTimeout(typing.current); typing.current = setTimeout(() => setAi({ ...NO_AI, q: text }), 350); },
    // Enter: nhờ AI tách nhãn + bỏ từ thừa. Lỗi mạng thì tìm theo nguyên văn.
    onSubmit: (text) => {
      clearTimeout(typing.current);
      if (!text) { setAi(NO_AI); return; }
      pub('/api/positions/parse?q=' + encodeURIComponent(text)).then((r) => {
        const by = (l) => r.entities.filter((e) => e.label === l).map((e) => e.text);
        const skills = by('SKILL'), jobs = by('JOB');
        // Chữ còn dư (vd "trình độ") không hiện thành chip nên người dùng không bỏ được: có chip thì không dùng nó để lọc.
        setAi({ q: jobs.length || skills.length ? '' : r.keyword, skills, jobs, times: by('TIME'), loc: by('LOC')[0] || '' });
      }).catch(() => setAi({ ...NO_AI, q: text }));
    },
  });

  const removeChip = (key, i) => {
    if (key === 'loc') setAi((a) => ({ ...a, loc: '' }));
    else setAi((a) => ({ ...a, [key]: a[key].filter((_, j) => j !== i) }));
  };
  const chips = [
    ...ai.jobs.map((t, i) => ['Việc', t, 'jobs', i]),
    ...ai.skills.map((t, i) => ['Kỹ năng', t, 'skills', i]),
    ...(ai.loc ? [['Khu vực', ai.loc, 'loc', 0]] : []),
  ];
  const count = rows.length + (more ? '+' : '') + ' việc';

  const filterBox = (
    <section className="panel tw-flex-row tw-flex-wrap tw-items-center tw-py-3.5 tw-px-4 tw-gap-y-2.5 tw-gap-x-4" aria-labelledby="flt">
      <h2 className="tw-text-[14px] tw-font-semibold tw-text-ink-2" id="flt">Lọc và sắp xếp</h2>
      <div className="chips scroll-x" role="group" aria-label="Lọc việc">
        {FILTERS.map(([k, text]) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{text}</button>
        ))}
      </div>
    </section>
  );
  const aiChips = (
    <div className="chips" role="group" aria-label="Bộ lọc từ AI" hidden={!chips.length}>
      {chips.map(([label, text, key, i]) => (
        <button key={key + i} type="button" className="chip" aria-pressed="true" aria-label={'Bỏ lọc ' + label + ' ' + text} onClick={() => removeChip(key, i)}>
          {label}: {text} ✕
        </button>
      ))}
    </div>
  );
  const results = (
    <>
      <Notice msg={err ? { text: err } : null} />
      <div className="grid-cards">
        {rows.map((p) => <JobCard key={p.id} p={p} />)}
      </div>
      {!loading && !err && rows.length === 0 && <Empty title="Chưa có việc phù hợp" sub="Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm." />}
      <div className="row tw-justify-center"><button type="button" className="btn" hidden={!more} disabled={loading} onClick={loadMore}>Xem thêm</button></div>
    </>
  );

  if (variant === 'guest') {
    return (
      <main className="stack">
        {filterBox}
        <section className="tw-flex tw-flex-col tw-gap-4" aria-labelledby="jobs-h">
          <div className="title-row"><h1 id="jobs-h">Việc làm mới nhất</h1><span className="muted small">{count}</span></div>
          {aiChips}
          {results}
        </section>
      </main>
    );
  }
  return (
    <main className="stack">
      {filterBox}
      <div className="title-row"><h1>Việc làm dành cho bạn</h1><span className="muted small">{count}</span></div>
      {aiChips}
      {results}
    </main>
  );
}
