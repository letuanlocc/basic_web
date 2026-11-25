'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import Page from '@/components/Page';
import { Notice } from '@/components/ui';
import { AvatarPick, Chips, LANG_OPTIONS, SEEKER_DEFAULTS, SEEKER_MODE_OPTIONS, SLOT_OPTIONS, useProfileForm } from '@/components/ProfileForm';

export default function SetupSeekerPage() {
  const form = useProfileForm({
    kind: 'seeker', multi: ['availability'], next: '/jobs',
    defaults: { ...SEEKER_DEFAULTS, has_experience: 'false', work_mode: 'offline' },
  });
  const { bind, load } = form;
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page layout="plain" require="seeker">
      <main className="stack-lg">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link> → <Link href="/register">Đăng ký</Link> → <span>Cập nhật hồ sơ</span></nav>
        <form className="form-card" ref={form.formRef} onSubmit={form.submit} style={{ alignSelf: 'center', maxWidth: 820, gap: 24 }}>
          <div><p className="eyebrow">Bước 2/2 · Người tìm việc</p><h1>Hoàn thiện hồ sơ của bạn</h1><p className="lead">Hồ sơ đầy đủ giúp nhà tuyển dụng tìm thấy bạn nhanh hơn. Bạn có thể bỏ qua và cập nhật sau.</p></div>
          <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
            <AvatarPick form={form} />
            <div className="cols" style={{ flex: '1 1 360px' }}>
              <div className="field full"><label htmlFor="fn">Họ và tên</label><input id="fn" type="text" placeholder="Nguyễn Văn A" {...bind('full_name')} /></div>
              <div className="field"><label htmlFor="yob">Năm sinh</label><input id="yob" type="number" placeholder="2005" {...bind('birth_year')} /></div>
              <div className="field"><label htmlFor="gd">Giới tính</label><select id="gd" {...bind('gender')}><option value="">Chọn giới tính</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></div>
              <div className="field full"><label htmlFor="addr">Nơi cư trú</label><input id="addr" type="text" placeholder="Quận/huyện, tỉnh/thành phố" {...bind('area')} /></div>
            </div>
          </div>
          <fieldset><legend>Đã có kinh nghiệm làm thêm chưa?</legend><Chips form={form} name="has_experience" options={[['false', 'Chưa có'], ['true', 'Đã có']]} /></fieldset>
          <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
            <fieldset><legend>Hình thức muốn làm</legend><Chips form={form} name="work_mode" options={SEEKER_MODE_OPTIONS} /></fieldset>
            <fieldset><legend>Thời gian rảnh (chọn nhiều)</legend><Chips form={form} name="availability" multi options={SLOT_OPTIONS} /></fieldset>
          </div>
          <div className="field"><label htmlFor="note">Lịch rảnh chi tiết <span className="hint">(không bắt buộc, hiện trên thẻ ứng viên)</span></label><input id="note" type="text" placeholder="Ví dụ: Tối T2–T6, cả ngày Chủ nhật" maxLength={100} {...bind('availability_note')} /></div>
          <div className="field"><label htmlFor="lang">Trình độ ngoại ngữ</label><select id="lang" {...bind('language_level')}>{LANG_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
          <Notice msg={form.msg} />
          <div className="form-actions"><Link className="btn btn-lg" href="/jobs" style={{ fontWeight: 700 }}>Bỏ qua</Link><button type="submit" className="btn btn-primary btn-lg" disabled={form.busy}>{form.busy ? 'Đang lưu…' : 'Tiếp tục'}</button></div>
        </form>
      </main>
    </Page>
  );
}
