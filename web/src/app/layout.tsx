import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import AIAssistantWidget from '@/components/common/AIAssistantWidget';

export const metadata: Metadata = {
  title: 'MedShare – RapidBlood Network | Every Drop Matters. Every Medicine Counts.',
  description:
    'AI-powered healthcare support platform connecting emergency blood donors within minutes and regulating safe medicine redistribution among verified healthcare institutions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <AIAssistantWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
