// Server Component: đọc trang đầu danh sách việc trên máy chủ rồi truyền xuống JobList.
// Tìm kiếm, lọc và "Xem thêm" vẫn chạy ở trình duyệt trong JobList.
import Page from '@/components/Page';
import JobList from '@/components/JobList';
import { latestPositions } from '@/lib/positions-server';

export const metadata = {
  title: 'Tìm việc part-time · CaRảnh',
  description: 'Danh sách việc part-time đang tuyển, lọc Online/Offline và tìm bằng AI.',
};

// Làm mới dữ liệu tối đa 30 giây một lần (giống cache 30 giây của API danh sách việc)
export const revalidate = 30;

// Người tìm việc; khách chưa đăng nhập vẫn xem được (hiện giao diện khách)
export default async function JobsPage() {
  const initial = await latestPositions();
  return (
    <Page layout="seeker" active="home" isPublic>
      <JobList variant="seeker" initial={initial} />
    </Page>
  );
}
