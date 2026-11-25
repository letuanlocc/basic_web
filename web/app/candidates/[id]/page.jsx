'use client';
// Hồ sơ ứng viên + mời ứng tuyển
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Avatar, { candidateName } from '@/components/Avatar';
import Page from '@/components/Page';
import { Badge, Empty, Notice } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { LANG, SLOT, WORKMODE } from '@/lib/format';

const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const age = (c) => (c.birth_year ? new Date().getFullYear() - c.birth_year : null);
const Text = ({ title, v }) => (v ? <section className="sect"><h2>{title}</h2><p style={{ margin: 0 }}>{v}</p></section> : null);

function Invite({ c, positions }) {
  const [pos, setPos] = useState(positions[0] ? String(positions[0].id) : '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [out, setOut] = useState(null);

  if (!positions.length) return <p className="msg info">Bạn chưa có vị trí nào đang tuyển để mời. <Link href="/new-post">Đăng tin tuyển</Link> trước.</p>;
  async function send() {
    setOut(null); setState('sending');
    try {
      await Auth.call('POST', '/api/positions/' + pos + '/invitations', { seeker_id: c.user_id, message: message.trim() || null });
      setState('sent');
      setOut({ kind: 'ok', text: 'Đã gửi lời mời tới ' + candidateName(c) + '. Ứng viên sẽ thấy ở mục "Lời mời".' });
    } catch (e) { setState('idle'); setOut({ text: e.message }); }
  }
  return (
    <>
      <div className="field"><label htmlFor="ipos">Mời vào vị trí</label>
        <select id="ipos" value={pos} onChange={(e) => setPos(e.target.value)}>{positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <div className="field"><label htmlFor="imsg">Lời nhắn (không bắt buộc)</label>
        <textarea id="imsg" rows={3} maxLength={300} placeholder="Giới thiệu ngắn về công việc…" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
      <Notice msg={out} />
      <button type="button" className="btn btn-primary btn-lg" disabled={state !== 'idle'} onClick={send}>
        {state === 'sending' ? 'Đang gửi…' : state === 'sent' ? 'Đã gửi lời mời' : 'Mời ứng tuyển'}
      </button>
    </>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([Auth.call('GET', '/api/seekers/' + id), Auth.call('GET', '/api/me/shop/positions').catch(() => [])])
      .then(([c, ps]) => setData({ c, positions: ps.filter((p) => p.is_open) }))
      .catch((e) => setError(e.message));
  }, [id]);

  let body;
  if (error) body = <Empty title="Không tải được hồ sơ" sub={error} />;
  else if (!data) body = <p className="muted">Đang tải…</p>;
  else {
    const { c, positions } = data;
    const slots = (c.availability || []).map((a) => SLOT[a.slot] || a.slot);
    body = (
      <>
        <div className="card-head"><Avatar c={c} size="xl" />
          <div className="grow"><h1 style={{ margin: 0, fontSize: 26 }}>{candidateName(c)}</h1>
            <div className="badges"><Badge kind={c.has_experience ? 'ok' : ''}>{c.has_experience ? 'Có kinh nghiệm' : 'Chưa có kinh nghiệm'}</Badge><Badge>{WORKMODE[c.work_mode] || '—'}</Badge></div></div></div>
        <div className="two-col">
          <div className="stack-col" style={{ gap: 16 }}>
            <section className="sect"><h2>Thông tin chung</h2>
              <dl className="facts">
                <dt>Tuổi</dt><dd>{age(c) ? age(c) + ' (sinh ' + c.birth_year + ')' : '—'}</dd>
                <dt>Giới tính</dt><dd>{GENDER[c.gender] || '—'}</dd>
                <dt>Khu vực</dt><dd>{c.area || '—'}</dd>
                <dt>Ngoại ngữ</dt><dd>{LANG[c.language_level] || '—'}</dd>
                <dt>Thời gian rảnh</dt><dd>{slots.join(', ') || '—'}</dd></dl>
              {c.availability_note ? <p style={{ margin: 0 }}>{c.availability_note}</p> : null}</section>
            <Text title="Kinh nghiệm" v={c.experience} /><Text title="Điểm mạnh" v={c.strengths} /><Text title="Điểm cần cải thiện" v={c.improvements} />
          </div>
          <aside className="panel" aria-label="Mời ứng tuyển"><Invite c={c} positions={positions} /></aside>
        </div>
      </>
    );
  }
  return (
    <Page layout="employer" active="candidates">
      <main className="stack">
        <Link className="back" href="/candidates">← Ứng viên tiềm năng</Link>
        <div>{body}</div>
      </main>
    </Page>
  );
}
