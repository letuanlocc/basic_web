'use client';
import Page from '@/components/Page';
import JobList from '@/components/JobList';

// Trang chủ cho khách (đã đăng nhập vẫn xem được, thẻ việc dẫn thẳng vào chi tiết)
export default function Home() {
  return (
    <Page layout="guest">
      <JobList variant="guest" />
    </Page>
  );
}
