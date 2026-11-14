import { Navigate, useLocation } from 'react-router-dom'
export default function SyllabusRedirect() {
  const location = useLocation(), query = new URLSearchParams(location.search)
  query.set('view', 'syllabus')
  return <Navigate replace to={`/courseware?${query}`} />
}
