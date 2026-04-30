import { SlackLayout } from '@/components/navigation/SlackLayout';
import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body>
        <SlackLayout>
          {children}
        </SlackLayout>
      </body>
    </html>
  );
}
