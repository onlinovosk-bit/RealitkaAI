import { SlackLayout } from '@/components/navigation/SlackLayout';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="antialiased">
        <SlackLayout>
          {children}
        </SlackLayout>
      </body>
    </html>
  );
}
