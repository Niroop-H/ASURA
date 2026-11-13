import {redirect} from 'next/navigation';

// Legacy deep links now open the main conversational ASURA AI Agent.
export default function QueryPage({searchParams}){redirect(searchParams?.mode==='defense'?'/defense':'/agent');}
