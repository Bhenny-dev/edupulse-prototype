export type RosterStudent = { StudentID: string; Name: string; Email: string; YearLevel: string; Block: string }
export type Roster = { students: RosterStudent[]; courseValues: string[]; block: string; warnings: string[]; format: string; skipped: number; duplicates: number }
export type Registration = { id: string; courseCode: string; courseTitle?: string; blockSection: string; studentCount: number; fileName?: string; students?: RosterStudent[]; headers?: string[]; uploadedBy: string | number; uploadedDate?: string; status: string }
export type RegistrationRequest = { courseCode: string; courseTitle?: string; blockSection: string; students: RosterStudent[]; fileName: string; uploadedBy: string | number; date?: string; id?: string }
export type RegistrationResult = { registrations: Registration[]; registration: Registration; previous: Registration | null; added: number; already: number }

export const ROSTER_HEADERS: string[]
export function normalizeBlock(value: string): string
export function studentKey(student: RosterStudent): string
export function parseRoster(text: string, fileName?: string): Roster | null
export function mergeStudents(existing?: RosterStudent[], incoming?: RosterStudent[]): { students: RosterStudent[]; added: number; already: number }
export function applyRegistration(registrations: Registration[], request: RegistrationRequest): RegistrationResult
export function undoRegistration(registrations: Registration[], result: RegistrationResult): Registration[]
