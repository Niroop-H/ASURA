import Header from '@/components/Header';
import PublicCameraExplorer from '@/components/PublicCameraExplorer';

export const metadata={
 title:'Public Camera Explorer | ASURA',
 description:'Search authorized public traffic cameras and webcams by continent, country, state, district and region',
};
export default function CamerasPage(){
 return <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
  <Header title="Public Camera Explorer" subtitle="Continent → Country → State → District → Region · Authorized public sources only"/>
  <PublicCameraExplorer/>
 </div>;
}
