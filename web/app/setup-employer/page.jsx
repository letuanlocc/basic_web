'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import Page from '@/components/Page';
import { Notice } from '@/components/ui';
import { Chips, INDUSTRIES, SHOP_DEFAULTS, ShopPhotosField, useProfileForm } from '@/components/ProfileForm';

export default function SetupEmployerPage() {
  const form = useProfileForm({ kind: 'shop', next: '/candidates', defaults: { ...SHOP_DEFAULTS, mode: 'offline', city: 'Đà Nẵng' } });
  const { bind, load } = form;
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page layout="plain" require="employer">
      <main className="stack-lg">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Trang chủ</Link> → <Link href="/register">Đăng ký</Link> → <span>Cập nhật hồ sơ nhà tuyển dụng</span></nav>
        <form className="form-card" ref={form.formRef} onSubmit={form.submit} style={{ alignSelf: 'center', maxWidth: 720, gap: 20 }}>
          <div><p className="eyebrow">Bước 2/2 · Nhà tuyển dụng</p><h1>Thông tin công ty / cửa hàng</h1><p className="lead">Ứng viên sẽ thấy thông tin này trên mọi tin tuyển dụng của bạn.</p></div>
          <div className="field"><label htmlFor="shop">Tên công ty / cửa hàng *</label><input id="shop" type="text" placeholder="Ví dụ: Quán cà phê Mộc" {...bind('name')} /></div>
          <fieldset><legend>Hình thức làm việc *</legend><Chips form={form} name="mode" options={[['offline', 'Offline'], ['online', 'Online'], ['both', 'Cả hai']]} /></fieldset>
          <div className="field"><label htmlFor="field">Lĩnh vực làm việc *</label>
            <select id="field" {...bind('industry')}><option value="">Chọn lĩnh vực</option>{INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
          <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))' }}>
            <div className="field"><label htmlFor="city">Tỉnh / thành phố *</label><select id="city" {...bind('city')}><option value="Đà Nẵng">Đà Nẵng</option><option value="Hà Nội">Hà Nội</option><option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option></select></div>
            <div className="field"><label htmlFor="ward">Phường / xã *</label><input id="ward" type="text" placeholder="Ví dụ: Phường Hải Châu" {...bind('ward')} /></div>
            <div className="field"><label htmlFor="addr">Địa chỉ cụ thể *</label><input id="addr" type="text" placeholder="Số nhà, đường" {...bind('address')} /></div>
            <div className="field"><label htmlFor="sp">SĐT cửa hàng *</label><input id="sp" type="tel" placeholder="10 số" {...bind('phone')} /></div>
            <div className="field full"><label htmlFor="web">Website / fanpage</label><input id="web" type="url" placeholder="https://" {...bind('fanpage_url')} /></div>
          </div>
          <ShopPhotosField form={form} />
          <p className="msg info">Bạn có thể bỏ qua và điền sau ở <strong>Hồ sơ cửa hàng</strong> (bấm vào tên quán trên thanh đầu trang). Cần đủ tên, hình thức, lĩnh vực, địa chỉ, SĐT và ít nhất 1 ảnh nơi làm việc thì mới đăng được tin tuyển. Các thông tin này hiện ở mục &quot;4. Thông tin nhà tuyển dụng&quot; trên mọi tin bạn đăng.</p>
          <Notice msg={form.msg} />
          <div className="form-actions"><Link className="btn btn-lg" href="/candidates" style={{ fontWeight: 700 }}>Bỏ qua</Link><button type="submit" className="btn btn-primary btn-lg" disabled={form.busy}>{form.busy ? 'Đang lưu…' : 'Tiếp tục'}</button></div>
        </form>
      </main>
    </Page>
  );
}
