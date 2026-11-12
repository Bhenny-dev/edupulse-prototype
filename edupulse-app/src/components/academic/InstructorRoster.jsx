import {useAcademicRecords} from '../../context/AcademicContext'
import InstructorMonitoring from './InstructorMonitoring'
// Compatibility for callers of the former unscoped roster.
export default function InstructorRoster(){const {data}=useAcademicRecords();return <InstructorMonitoring data={data}/>}
