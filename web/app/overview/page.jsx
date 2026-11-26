import Link from 'next/link';
import Page from '@/components/Page';
import { IconShop, IconUser } from '@/components/Icons';
import JobCard from '@/components/JobCard';

export const metadata = {
  title: 'Giới thiệu chức năng · CaRảnh',
  description: 'Giới thiệu các chức năng của CaRảnh dành cho người tìm việc và chủ quán.',
};

// Thẻ minh họa cho phần giới thiệu, không phải tin tuyển thật.
const sampleJob = {
  title: 'Phục vụ ca tối',
  shop_name: 'Quán cà phê minh họa',
  mode: 'offline',
  salary_unit: 'hour',
  salary_amount: 25000,
  work_days: [0, 2, 4],
  open_hour: 17.5,
  close_hour: 22,
  address: 'Hải Châu, Đà Nẵng',
  summary: 'Đón khách, ghi món và dọn bàn. Không cần kinh nghiệm, được hướng dẫn ngày đầu.',
};

const steps = [
  ['1', false, 'Đăng ký', 'Tạo tài khoản, chọn vai trò người tìm việc hoặc nhà tuyển dụng'],
  ['2', false, 'Hoàn thiện hồ sơ', 'Nhập thông tin cá nhân hoặc thông tin cửa hàng, có thể bỏ qua'],
  ['3', true, 'Tìm và ứng tuyển', 'Lọc việc Online / Offline, xem chi tiết rồi ứng tuyển hoặc lưu lại'],
  ['4', false, 'Duyệt và xếp lịch', 'Nhà tuyển dụng duyệt hồ sơ, hai bên cùng xem lịch làm theo ca'],
];

export default function OverviewPage() {
  return (
    <Page layout="overview" wide>
      <main>
        <section className="hero">
          <div className="tw-flex tw-flex-col tw-gap-[22px]">
            <span className="badge warn b tw-self-start tw-py-1.5 tw-px-3.5 tw-rounded-full tw-text-[14px]">Nền tảng việc làm part-time</span>
            <h1>Việc part-time <em>đúng giờ rảnh</em>, đúng nơi bạn muốn</h1>
            <p className="lead">Kết nối người tìm việc và nhà tuyển dụng, làm Online hoặc Offline, có lịch làm rõ ràng cho cả hai bên.</p>
            <div className="row"><Link className="btn btn-primary btn-lg" href="/register">Tôi đang tìm việc</Link><Link className="btn btn-lg tw-font-bold" href="/register">Tôi cần tuyển người</Link></div>
            <div className="badges tw-gap-2"><span className="badge ok b tw-py-1.5 tw-px-3 tw-text-[14px] tw-rounded">Tìm kiếm bằng AI</span><span className="badge ok b tw-py-1.5 tw-px-3 tw-text-[14px] tw-rounded">Lọc Online / Offline</span><span className="badge ok b tw-py-1.5 tw-px-3 tw-text-[14px] tw-rounded">Đăng ký lịch theo ca</span></div>
          </div>
          <div className="tw-flex tw-flex-col tw-gap-2.5 tw-justify-self-center tw-w-full tw-max-w-[420px]">
            <span className="tiny tw-font-bold tw-tracking-[.08em] tw-text-ink-3">THẺ VIỆC LÀM MẪU</span>
            <JobCard p={sampleJob} preview />
          </div>
        </section>

        <section className="block">
          <h2>Hai vai trò, một nền tảng</h2>
          <div className="roles">
            <div className="role"><div className="row tw-flex-nowrap tw-gap-3.5"><span className="ico tw-text-white"><IconUser size={24} /></span><div><h3 className="tw-m-0 tw-text-[20px]">Người tìm việc</h3><p className="tw-mt-0.5 tw-mx-0 tw-mb-0 tw-text-primary-dark tw-text-[14px] tw-font-semibold">Tìm ca làm hợp thời gian rảnh</p></div></div>
              <ul><li>Lập hồ sơ: điểm mạnh, kinh nghiệm, giờ mong muốn</li><li>Nhận gợi ý việc làm và tìm bằng câu tự nhiên</li><li>Ứng tuyển, lưu việc, theo dõi trạng thái</li><li>Đăng ký lịch làm theo từng ca</li></ul></div>
            <div className="role alt"><div className="row tw-flex-nowrap tw-gap-3.5"><span className="ico tw-text-white"><IconShop size={24} /></span><div><h3 className="tw-m-0 tw-text-[20px]">Nhà tuyển dụng</h3><p className="tw-mt-0.5 tw-mx-0 tw-mb-0 tw-text-primary-dark tw-text-[14px] tw-font-semibold">Tìm nhân viên part-time đúng ca</p></div></div>
              <ul><li>Đăng tin: yêu cầu, mức lương hoặc &quot;Thỏa thuận&quot;</li><li>Xem danh sách ứng viên tiềm năng</li><li>Duyệt hoặc từ chối hồ sơ ứng tuyển</li><li>Xem lịch làm của nhiều nhân viên cùng lúc</li></ul></div>
          </div>
        </section>

        <section className="block tw-pb-14 tw-gap-7">
          <h2>Hành trình 4 bước</h2>
          <ol className="steps">
            {steps.map(([n, off, title, sub]) => (
              <li key={n}><span className={'n' + (off ? ' off' : '')}>{n}</span><strong className="tw-text-[18px]">{title}</strong><span className="muted small tw-leading-normal">{sub}</span></li>
            ))}
          </ol>
        </section>

        <section className="wrap-lg tw-pb-14">
          <div className="band">
            <strong className="tw-text-primary-line tw-text-[13px] tw-tracking-[.08em] tw-leading-[1.4]">BA HỆ THỐNG<br />KẾT NỐI</strong>
            <div className="tw-flex-[1_1_200px] tw-flex tw-flex-col tw-gap-0.5"><strong>Giao diện web</strong><span className="tw-text-primary-line tw-text-[14px]">Next.js · React · Responsive</span></div>
            <div className="tw-flex-[1_1_200px] tw-flex tw-flex-col tw-gap-0.5"><strong>Máy chủ và dữ liệu</strong><span className="tw-text-primary-line tw-text-[14px]">Node.js · Supabase</span></div>
            <div className="tw-flex-[1_1_200px] tw-flex tw-flex-col tw-gap-0.5"><strong>Tìm kiếm AI</strong><span className="tw-text-primary-line tw-text-[14px]">Câu tự nhiên → bộ lọc</span></div>
          </div>
        </section>
      </main>
    </Page>
  );
}
