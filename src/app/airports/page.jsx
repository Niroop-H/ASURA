import AirportOperationsWorkspace from '@/components/AirportOperationsWorkspace';
import LiveGeoMap from '@/components/LiveGeoMap';
import Header from '@/components/Header';

export const metadata={title:'All Airports & Flight Boards | ASURA'};
export default function AirportDirectory(){
 return <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
  <Header title="All Airports — World Directory" subtitle="Search airports worldwide, view live nearby aircraft and licensed departures/arrivals"/>
  <AirportOperationsWorkspace map={<LiveGeoMap/>}/>
 </div>;
}
