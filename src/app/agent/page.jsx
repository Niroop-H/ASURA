import Header from '@/components/Header';
import AgentWorkspace from '@/components/AgentWorkspace';

export const metadata={
 title:'DEVASHRI AI | ASURA Command Intelligence',
 description:'General conversational intelligence with selectively retrieved public news, aviation, weather, camera directories and Earth observation records',
};

export default function AgentPage(){
 return <div className="p-4 md:p-7 space-y-6 max-w-[1600px] mx-auto w-full">
  <Header title="DEVASHRI" subtitle="ASURA AI Agent · conversational intelligence and connected public data"/>
  <AgentWorkspace/>
 </div>;
}
