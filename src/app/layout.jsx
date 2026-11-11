import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'ASURA | Defense Intelligence System',
  description: 'Industrial-grade multi-domain defense intelligence infrastructure',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col bg-slate-50 text-slate-900 min-h-screen antialiased">
        {/* Top Operational Classification Banner */}
        <div className="w-full bg-slate-900 text-slate-200 text-[10px] font-mono tracking-widest uppercase text-center py-1 px-4 z-50 flex items-center justify-between border-b border-slate-800">
          <span className="hidden sm:inline">DEFENSE INTELLIGENCE INFRASTRUCTURE</span>
          <span className="font-bold text-sky-400">NATO UNCLASSIFIED // REL TO NATO / CUI</span>
          <span className="hidden sm:inline">MIL-STD-2525D COMPLIANT</span>
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
