import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Dumbbell, LineChart, Calendar as CalendarIcon, Sparkles, History } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Private Muscle Training Management App",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Workout Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json?v=3" />
        <link rel="apple-touch-icon" href="/icon-192.png?v=3" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <main className="container">
          <header className="header">
            <h1 className="chic-text">Workout Tracker</h1>
            <p style={{ color: '#737373', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Record your progress, break your limits
            </p>
          </header>
          
          <nav className="nav" style={{ flexWrap: 'wrap' }}>
            <Link href="/" className="nav-item">
              <Dumbbell size={16} />
              <span>Record</span>
            </Link>
            <Link href="/calendar" className="nav-item">
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </Link>
            <Link href="/history" className="nav-item">
              <History size={16} />
              <span>History</span>
            </Link>
            <Link href="/dashboard" className="nav-item">
              <LineChart size={16} />
              <span>Summary</span>
            </Link>
            <Link href="/trainer" className="nav-item">
              <Sparkles size={16} />
              <span>AI Trainer</span>
            </Link>
          </nav>

          <div className="card">
            {children}
          </div>
        </main>
        
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js?v=3').then(function(registration) {
                  console.log('SW registered');
                }).catch(function(err) {
                  console.log('SW failed', err);
                });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
