import './globals.css';
import Sidebar from '@/components/Sidebar';

const BRAND = 'ASURA Defense Intelligence System™';
export const metadata = {
  title: {
    default: BRAND,
    template: '%s | '+BRAND,
  },
  applicationName: BRAND,
  description: BRAND+' — public-source intelligence visualization and research in development.',
  icons: {
    icon: [{url:'/favicon.jpg',type:'image/jpeg',sizes:'128x128'}],
    shortcut: [{url:'/favicon.jpg',type:'image/jpeg'}],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    siteName: BRAND,
    title: BRAND,
    description: 'ASURA public-data monitoring and research platform',
    images: [{url:'/asura-logo.jpg',width:128,height:128,alt:BRAND+' logo'}],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col bg-slate-50 text-slate-900 min-h-screen antialiased">
        {/* Top Operational Classification Banner */}
        <div className="w-full bg-slate-900 text-slate-200 text-[10px] font-mono tracking-widest uppercase text-center py-1 px-4 z-50 flex items-center justify-between border-b border-slate-800">
          <span className="hidden sm:inline">ASURA Defense Intelligence System™</span>
          <span className="font-bold text-sky-400">DEVELOPMENT BUILD — DATA INTEGRATIONS INCOMPLETE</span>
          <span className="hidden sm:inline">ASSESSMENT NOT COMPLETED</span>
        </div>

        <div className="flex flex-1 w-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto min-h-[calc(100vh-25px)] bg-slate-50 flex flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
