'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import Page from '@/components/Page';
import { Notice } from '@/components/ui';
import { Chips, INDUSTRIES, SHOP_DEFAULTS, ShopPhotosField, useProfileForm } from '@/components/ProfileForm';

export default function ShopPage() {
  const form = useProfileForm({ kind: 'shop', defaults: SHOP_DEFAULTS });
  const { bind, load } = form;
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page layout="employer" active="shop">
      <main className="stack">
        <form className="form-card" ref={form.formRef} onSubmit={form.submit} style={{ maxWidth: 820, alignSelf: 'center', gap: 20 }}>
          <div><h1 style={{ fontSize: 26 }}>Hồ sơ cửa hàng</h1><p className="lead">Ứng viên thấy các thông tin này ở mục &quot;4. Thông tin nhà tuyển dụng&quot; trên mọi tin.</p></div>
          <div className="field"><label htmlFor="s_name">Tên công ty / cửa hàng *</label><input id="s_name" type="text" placeholder="Ví dụ: Quán cà phê Mộc" {...bind('name')} /></div>
          <fieldset><legend>Hình thức làm việc *</legend><Chips form={form} name="mode" options={[['offline', 'Offline'], ['online', 'Online'], ['both', 'Cả hai']]} /></fieldset>
          <div className="cols" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))' }}>
            <div className="field"><label htmlFor="s_field">Lĩnh vực *</label><select id="s_field" {...bind('industry')}><option value="">Chọn lĩnh vực</option>{INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
            <div className="field"><label htmlFor="s_city">Tỉnh / thành phố *</label><select id="s_city" {...bind('city')}><option value="">Chọn tỉnh / thành</option><option value="Đà Nẵng">Đà Nẵng</option><option value="Hà Nội">Hà Nội</option><option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option></select></div>
            <div className="field"><label htmlFor="s_ward">Phường / xã *</label><input id="s_ward" type="text" placeholder="Ví dụ: Phường Hải Châu" {...bind('ward')} /></div>
            <div className="field"><label htmlFor="s_addr">Địa chỉ cụ thể *</label><input id="s_addr" type="text" placeholder="Số nhà, đường" {...bind('address')} /></div>
            <div className="field"><label htmlFor="s_phone">SĐT cửa hàng *</label><input id="s_phone" type="tel" placeholder="10 số, bắt đầu bằng 0" {...bind('phone')} /></div>
            <div className="field"><label htmlFor="s_web">Website / fanpage</label><input id="s_web" type="text" placeholder="facebook.com/tenquan" {...bind('fanpage_url')} /></div>
          </div>
          <ShopPhotosField form={form} />
          <Notice msg={form.msg} />
          <div className="form-actions"><Link className="btn btn-lg" href="/change-password" style={{ fontWeight: 700 }}>Đổi mật khẩu</Link><button type="submit" className="btn btn-primary btn-lg" disabled={form.busy}>{form.busy ? 'Đang lưu…' : 'Lưu hồ sơ cửa hàng'}</button></div>
        </form>
      </main>
    </Page>
  );
}
