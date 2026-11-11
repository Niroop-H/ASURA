import Header from '@/components/Header';
import TargetTracker from '@/components/TargetTracker';

export default function Page() {
  return <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
    <Header title="Observation records" subtitle="Source integration status" />
    <TargetTracker />
  </div>;
}
