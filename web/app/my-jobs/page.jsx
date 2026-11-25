'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Page from '@/components/Page';
import { Badge, Empty } from '@/components/ui';
import { Auth } from '@/lib/auth';
import { STATUS, formatSalary } from '@/lib/format';

const TABS = [['apps', 'Đã ứng tuyển'], ['invites', 'Lời mời'], ['saved', 'Đã lưu']];

function PosHead({ p }) {
  return (
    <div className="card-head"><span className="initial" aria-hidden="true">{((p.shop && p.shop.name) || '?').charAt(0).toUpperCase()}</span>
      <div className="grow"><h3><Link href={'/jobs/' + encodeURIComponent(p.id)}>{p.title}</Link></h3><p>{p.shop && p.shop.name}</p></div></div>
  );
}

export default function MyJobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('apps');
  const [data, setData] = useState({ apps: [], invites: [], saved: [], active: null });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const [apps, invites, saved, emp] = await Promise.all([
        Auth.call('GET', '/api/applications/mine'), Auth.call('GET', '/api/invitations/mine'), Auth.call('GET', '/api/me/saved'),
        // Việc đang làm thật sự; lỗi thì để null (giữ cách hiển thị cũ, server vẫn chặn đăng ký lịch)
        Auth.call('GET', '/api/employments/mine').catch(() => null),
      ]);
      const d = {
        // Hồ sơ đã hủy/đã gỡ ("withdrawn") không hiện trong danh sách nữa
        apps: apps.filter((a) => a.status !== 'withdrawn'), invites, saved,
        active: emp ? emp.map((e) => String(e.position.id)) : null,
      };
      setData(d); setLoaded(true);
      return d;
    } catch (e) { setError(e.message); return null; }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(kind, id) {
    let call;
    if (kind === 'withdraw') { if (!window.confirm('Hủy hồ sơ ứng tuyển này?')) return; call = () => Auth.call('POST', '/api/applications/' + id + '/withdraw'); }
    else if (kind === 'dismiss') { if (!window.confirm('Xóa việc đã nghỉ này khỏi danh sách? Bạn vẫn có thể ứng tuyển lại sau.')) return; call = () => Auth.call('POST', '/api/applications/' + id + '/dismiss'); }
    else if (kind === 'accept' || kind === 'decline') call = () => Auth.call('POST', '/api/invitations/' + id + '/respond', { accept: kind === 'accept' });
    else call = () => Auth.call('DELETE', '/api/me/saved/' + id);
    setBusyId(kind + id);
    try {
      const result = await call();
      if (kind === 'accept') {
        setTab('apps');
        const d = await load();
        const application = d && d.apps.find((a) => a.id === (result && result.application_id));
        if (application && application.status === 'accepted') {
          const employments = await Auth.call('GET', '/api/employments/mine');
          if (employments.find((e) => e.position.id === application.position.id)) { router.push('/schedule?position=' + encodeURIComponent(application.position.id)); return; }
          setNotice('Hồ sơ đã được HR chấp nhận nhưng chưa có vị trí đang làm để đăng ký lịch. Vui lòng liên hệ HR.');
        } else setNotice('Đã nhận lời mời ứng tuyển. Bạn chỉ có thể chọn lịch sau khi HR chấp nhận hồ sơ.');
      } else {
        if (kind === 'decline') setNotice('Đã từ chối lời mời.');
        await load();
      }
    } catch (er) { window.alert(er.message); }
    setBusyId('');
  }

  const rows = data[tab];
  let body;
  if (error) body = <Empty title="Không tải được dữ liệu" sub={error} />;
  else if (!loaded) body = <p className="muted">Đang tải…</p>;
  else {
    const note = notice ? <p className="msg info" role="status">{notice}</p> : null;
    if (!rows.length) {
      body = <>{note}<Empty title={tab === 'apps' ? 'Bạn chưa ứng tuyển việc nào' : tab === 'invites' ? 'Chưa có lời mời nào' : 'Chưa lưu việc nào'} sub="Xem các việc mới ở Trang chủ." /></>;
    } else {
      body = (
        <>{note}
          <div className="grid-cards">
            {rows.map((r) => {
              if (tab === 'apps') {
                let st = STATUS[r.status] || ['', r.status];
                // Đơn vẫn là "accepted" sau khi chủ quán xóa nhân viên; việc đã kết thúc thì không còn đăng ký lịch được.
                const ended = r.status === 'accepted' && data.active && data.active.indexOf(String(r.position.id)) < 0;
                if (ended) st = ['', 'Đã nghỉ việc'];
                return (
                  <article className="card" key={r.id}><PosHead p={r.position} />
                    <div className="badges"><Badge kind={st[0]}>{st[1]}</Badge>{r.source === 'invited' ? <Badge>Được mời</Badge> : null}</div>
                    {r.reject_reason ? <p className="desc">{r.reject_reason}</p> : null}
                    {ended ? <p className="desc">Bạn không còn trong danh sách nhân viên của vị trí này nên không thể đăng ký lịch làm.</p> : null}
                    {r.status === 'pending' ? <button type="button" className="btn btn-danger push" disabled={busyId === 'withdraw' + r.id} onClick={() => act('withdraw', r.id)}>Hủy hồ sơ</button>
                      : ended ? <button type="button" className="btn push" disabled={busyId === 'dismiss' + r.id} onClick={() => act('dismiss', r.id)}>Xóa khỏi danh sách</button>
                        : r.status === 'accepted' ? <Link className="btn btn-primary push" href={'/schedule?position=' + encodeURIComponent(r.position.id)}>Chọn lịch làm</Link> : null}
                  </article>
                );
              }
              if (tab === 'invites') {
                return (
                  <article className="card" key={r.id}><PosHead p={r.position} />
                    {r.message ? <p className="desc">“{r.message}”</p> : null}
                    <div className="row"><button type="button" className="btn" disabled={busyId === 'accept' + r.id} onClick={() => act('accept', r.id)}>Nhận lời mời ứng tuyển</button>
                      <button type="button" className="btn" disabled={busyId === 'decline' + r.id} onClick={() => act('decline', r.id)}>Từ chối</button></div>
                  </article>
                );
              }
              const p = r.position;
              return (
                <article className="card" key={p.id}><PosHead p={p} />
                  <dl className="facts"><dt>Lương</dt><dd className="b">{formatSalary(p)}</dd></dl>
                  <button type="button" className="btn push" disabled={busyId === 'unsave' + p.id} onClick={() => act('unsave', p.id)}>Bỏ lưu</button>
                </article>
              );
            })}
          </div>
        </>
      );
    }
  }

  return (
    <Page layout="seeker" active="mine">
      <main className="stack">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/jobs">Trang chủ</Link> → <span>Xem công việc</span></nav>
        <div className="title-row"><h1>Công việc của tôi</h1></div>
        <div className="tabs" role="tablist">
          {TABS.map(([k, text]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{text} <span className="n">{data[k].length}</span></button>
          ))}
        </div>
        <div>{body}</div>
      </main>
    </Page>
  );
}
