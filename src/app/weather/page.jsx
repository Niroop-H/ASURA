import Header from '@/components/Header';
import WeatherWorkspace from '@/components/WeatherWorkspace';

export const metadata={
 title:'Worldwide Weather | ASURA',
 description:'Search current provider weather and five-day forecasts for global city, state, country and exact coordinate locations.',
};
export default function WeatherPage(){
 return <main className="p-4 md:p-8 max-w-[1550px] mx-auto w-full space-y-5">
  <Header title="Worldwide Weather" subtitle="Global location search · point-specific conditions · provider timestamps · 5-day forecasts"/>
  <WeatherWorkspace/>
 </main>;
}
