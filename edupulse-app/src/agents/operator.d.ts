import type { Roster, RosterStudent, Registration } from '../utils/rosterParser'

export type OutlineRow = { week: number; ilos?: string; contents?: string[]; activities?: string; assessments?: string }
export type SyllabusRecord = { id: string; courseCode: string; courseTitle?: string; courseDescription?: string; status: string; version?: number; lastUpdated?: string; sample?: boolean; instructorId?: string | number; courseOutline?: OutlineRow[] }
export type CurriculumCourse = { code: string; title: string; description?: string; programOutcomes?: string[]; yearLevel?: number }
export type CatalogCourse = { code: string; title: string; description: string; outcomes: string[]; yearLevel?: number; syllabus: SyllabusRecord | null; yours: boolean }
export type CourseMatch = { code: string; title: string; yours: boolean; named: boolean; lexical: number; score: number; semantic?: number; matched: { word: string; where: string }[]; strength: 'named' | 'strong' | 'possible' }
export type Page = { path: string; label: string; words: RegExp; roles: string[] | 'all'; denied?: boolean }
export type Attachment = { title: string; fileName: string; text: string; roster?: Roster | null; detectedCourse?: string; sourceType?: string }
export type Proposal =
  | { type: 'register'; attachment: Attachment & { roster: Roster }; courseCode: string; block: string }
  | { type: 'file'; attachment: Attachment; courseCode: string; compact: boolean; after?: boolean }
  | { type: 'study'; attachments: Attachment[] }
  | { type: 'generate-week'; courseCode: string; week: number | null; request: string }
  | { type: 'search'; query: string; fallbackToChat?: boolean; results?: SearchHit[] }
  | { type: 'navigate'; path: string; label: string }
  | { type: 'notice'; text: string; attach?: boolean; path?: string; pathLabel?: string }
export type SearchHit = { group: string; score: number; title: string; detail: string; source: string; path?: string | null; documentId?: string; id?: string }
export type LibraryDocument = { id: string; title: string; file_name?: string | null; chunks: number; page_count?: number | null; quality?: { course?: string } }
export type ContentItem = { title?: string; content?: { title?: string }; week: number; type: string; status: string; syllabusId: string }

export const PAGES: Page[]
export function pickSyllabus(syllabi: SyllabusRecord[], code: string): SyllabusRecord | null
export function courseCatalog(input: { curriculum: CurriculumCourse[]; syllabi?: SyllabusRecord[]; registrations?: Registration[]; enrolled?: Set<string> | null; role?: string; userId?: string | number }): CatalogCourse[]
export function findCourseMentions(text: string, catalog: { code: string; title: string }[]): CatalogCourse[]
export function profileText(course: CatalogCourse): string
export function rankCourses(text: string, catalog: CatalogCourse[], options?: { fileName?: string; limit?: number; floor?: number }): CourseMatch[]
export function refineCourses(text: string, ranked: CourseMatch[], catalog: CatalogCourse[], similarity: ((left: string[], right: string[], signal?: AbortSignal) => Promise<number[][]>) | null | undefined, signal?: AbortSignal): Promise<{ ranked: CourseMatch[]; method: string }>
export function syllabusReference(course: CatalogCourse): { title: string; text: string } | null
export function searchQuery(message: string): string
export function searchRecords(query: string, data: { role?: string; userId?: string | number; catalog?: CatalogCourse[]; registrations?: Registration[]; rosters?: { fileName: string; students: RosterStudent[] }[]; syllabi?: SyllabusRecord[]; content?: Record<string, ContentItem>; documents?: LibraryDocument[] }): SearchHit[]
export function pageFor(message: string, role?: string): Page | null
export function planOperator(input: { message: string; attachments?: Attachment[]; role?: string; catalog?: CatalogCourse[]; currentCourse?: CatalogCourse | null }): { proposals: Proposal[]; chat: boolean; task: 'auto' | 'summarize' | 'draft'; mentioned: CatalogCourse[] }
