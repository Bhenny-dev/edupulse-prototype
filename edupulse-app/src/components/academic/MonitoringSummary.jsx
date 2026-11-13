import {Users,BookOpen,CheckCircle,Activity} from 'lucide-react'
import SummaryCard from '../ui/SummaryCard'

const icons=[Users,BookOpen,CheckCircle,Activity],tones=['sky','purple','green','amber']
export default function MonitoringSummary({items}){
 return <div className="kpi-grid mb-24 monitoring-summary">{items.map(([label,value,action],index)=><SummaryCard key={label} icon={icons[index%4]} label={label} value={value} color={`var(--${tones[index%4]}-500)`} bg={`var(--${tones[index%4]}-100)`} {...action}/>)}</div>
}
