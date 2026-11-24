type ClassLocation = {
 term?: string
 studentTab?: 'announcements' | 'materials' | 'classlist' | 'scores' | 'outline'
 item?: string
 publication?: string
 week?: string | number
}

/** URL for one authorized student's class dialog and optional child reader. */
export function studentClassPath(courseId: string, location: ClassLocation = {}) {
 const params = new URLSearchParams({course:courseId})
 for(const [key,value] of Object.entries(location))if(value !== undefined && value !== '')params.set(key,String(value))
 return '/dashboard?' + params
}
