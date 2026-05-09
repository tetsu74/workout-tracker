import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Dumbbell, LineChart, Calendar as CalendarIcon, Sparkles, History } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Private Muscle Training Management App",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
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
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed');
                });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
