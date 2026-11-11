import Header from '@/components/Header';
import QueryInterface from '@/components/QueryInterface';

export default function QueryPage() {
  return <div className="p-6 md:p-8 space-y-7 max-w-6xl mx-auto w-full">
    <Header title="Evidence queries" subtitle="Acquisition implementation status" />
    <QueryInterface />
  </div>;
}
