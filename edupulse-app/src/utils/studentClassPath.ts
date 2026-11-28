type ClassLocation = {
 term?: string
 studentTab?: 'stream' | 'announcements' | 'materials' | 'classlist' | 'performance' | 'scores' | 'outline'
 assessmentTab?: 'questions' | 'scores'
 item?: string
 publication?: string
 week?: string | number
}

/** URL for one authorized student's class dialog and optional child reader. */
export function studentClassPath(courseId: string, location: ClassLocation = {}) {
 const params = new URLSearchParams({course:courseId})
 for(const [key,value] of Object.entries(location))if(value !== undefined && value !== '')params.set(key,String(value))
 if (location.studentTab === 'announcements' || location.studentTab === 'materials') params.set('studentTab', 'stream')
 if (location.studentTab === 'scores') {
  params.set('studentTab', 'performance')
  if (location.item && !location.assessmentTab) params.set('assessmentTab', 'scores')
 }
 return '/dashboard?' + params
}
