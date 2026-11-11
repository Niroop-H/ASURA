import Header from '@/components/Header';
import LiveGeoMap from '@/components/LiveGeoMap';
import AirportOperationsWorkspace from '@/components/AirportOperationsWorkspace';

export const metadata = {
 title:'Airport & Flight Operations | ASURA',
 description:'Worldwide airport search, real public ADS-B positions and license-gated FlightAware airport operations and tracks',
};

export default function FlightExplorer(){
 return <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
  <Header title="Airport & Flight Operations" subtitle="Global airport directory, movements, selected flight tracking, satellite and street maps"/>
  <AirportOperationsWorkspace map={<LiveGeoMap/>}/>
 </div>;
}
