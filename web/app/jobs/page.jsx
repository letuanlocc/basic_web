'use client';
import Page from '@/components/Page';
import JobList from '@/components/JobList';

// Người tìm việc; khách chưa đăng nhập vẫn xem được (hiện giao diện khách)
export default function JobsPage() {
  return (
    <Page layout="seeker" active="home" isPublic>
      <JobList variant="seeker" />
    </Page>
  );
}
