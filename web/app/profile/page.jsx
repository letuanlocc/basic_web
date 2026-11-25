'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import Page from '@/components/Page';
import { Notice } from '@/components/ui';
import { AREAS, AvatarPick, Chips, LANG_OPTIONS, SEEKER_DEFAULTS, SEEKER_MODE_OPTIONS, SLOT_OPTIONS, useProfileForm } from '@/components/ProfileForm';

export default function ProfilePage() {
  const form = useProfileForm({ kind: 'seeker', defaults: SEEKER_DEFAULTS, multi: ['availability'] });
  const { bind, load } = form;
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page layout="seeker" active="profile">
      <main className="stack">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/jobs">Trang chủ</Link> → <span>Hồ sơ</span></nav>
        <form className="form-card" ref={form.formRef} onSubmit={form.submit} style={{ maxWidth: 900, alignSelf: 'center', gap: 22 }}>
          <h1 style={{ fontSize: 24, letterSpacing: '.02em' }}>HỒ SƠ</h1>
          <div className="row" style={{ alignItems: 'flex-start', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}><AvatarPick form={form} /><span className="badge ok b">NGƯỜI TÌM VIỆC</span></div>
            <div className="cols" style={{ flex: '1 1 360px' }}>
              <div className="field full"><label htmlFor="pn">Họ tên *</label><input id="pn" type="text" placeholder="Nhập họ tên" {...bind('full_name')} /></div>
              <div className="field"><label htmlFor="py">Năm sinh *</label><input id="py" type="number" placeholder="Nhập năm sinh" {...bind('birth_year')} /></div>
              <div className="field"><label htmlFor="pp">Số điện thoại *</label><input id="pp" type="tel" placeholder="Nhập số điện thoại" {...bind('phone')} /></div>
            </div>
          </div>
          <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))' }}>
            <div className="field"><label htmlFor="pg">Giới tính *</label><select id="pg" {...bind('gender')}><option value="">Chọn giới tính</option><option value="female">Nữ</option><option value="male">Nam</option><option value="other">Khác</option></select></div>
            <div className="field"><label htmlFor="pa">Nơi cư trú (quận) *</label><select id="pa" {...bind('area')}><option value="">Chọn khu vực</option>{AREAS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            <div className="field"><label htmlFor="pl">Trình độ ngoại ngữ</label><select id="pl" {...bind('language_level')}>{LANG_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
          </div>
          <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
            <fieldset><legend>Hình thức muốn làm *</legend><Chips form={form} name="work_mode" options={SEEKER_MODE_OPTIONS} /></fieldset>
            <fieldset><legend>Thời gian rảnh (chọn nhiều) *</legend><Chips form={form} name="availability" multi options={SLOT_OPTIONS} /></fieldset>
          </div>
          <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
            <div className="field"><label htmlFor="ps">Điểm mạnh</label><textarea id="ps" rows={3} placeholder="Ví dụ: giao tiếp tốt, nhanh nhẹn" {...bind('strengths')} /></div>
            <div className="field"><label htmlFor="pw">Điểm cần cải thiện</label><textarea id="pw" rows={3} placeholder="Ví dụ: chưa quen pha chế" {...bind('improvements')} /></div>
          </div>
          <fieldset><legend>Đã có kinh nghiệm làm thêm chưa?</legend><Chips form={form} name="has_experience" options={[['false', 'Chưa có'], ['true', 'Đã có']]} /></fieldset>
          <div className="field"><label htmlFor="pe">Ghi rõ kinh nghiệm</label><textarea id="pe" rows={3} placeholder="Ví dụ: phục vụ quán cà phê 6 tháng" {...bind('experience')} /></div>
          <div className="field"><label htmlFor="pt">Lịch rảnh chi tiết <span className="hint">(hiện trên thẻ ứng viên)</span></label><input id="pt" type="text" placeholder="Ví dụ: Tối T2–T6, cả ngày Chủ nhật" maxLength={100} {...bind('availability_note')} /></div>
          <Notice msg={form.msg} />
          <div className="form-actions"><Link className="btn btn-lg" href="/change-password" style={{ fontWeight: 700 }}>Đổi mật khẩu</Link><button type="submit" className="btn btn-primary btn-lg" disabled={form.busy}>{form.busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></div>
        </form>
      </main>
    </Page>
  );
}
