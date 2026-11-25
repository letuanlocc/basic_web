import './style.css';
import './tailwind.css';
import { DialogProvider } from '@/components/Dialog';
import { SearchProvider } from '@/components/Search';
import Monitoring from '@/components/Monitoring';

export const metadata = {
  title: 'CaRảnh · Việc làm part-time',
  description: 'CaRảnh – tìm việc làm part-time linh hoạt theo ca, lương rõ ràng, đăng ký lịch làm và ứng tuyển nhanh.',
  icons: { icon: '/favicon.svg' },
};
export const viewport = { themeColor: '#0E6F64' };

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <DialogProvider><SearchProvider>{children}</SearchProvider></DialogProvider>
        <Monitoring />
      </body>
    </html>
  );
}
