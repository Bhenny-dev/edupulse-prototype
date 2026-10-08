export type OutlineRow = { week: number; ilos: string; contents: string[]; activities: string; assessments: string; teachingMaterials: string[]; assessmentTypes: string[]; resources: { type: string; name: string; url: string }[] }
type Section<T> = { raw: string; parsed: T }
export type ParsedSyllabus = {
  sections: [
    Section<{ courseCode: string; courseTitle: string; periodOffered: string; academicYear: string }>,
    Section<{ description: string; creditUnits: number | ''; classification: string; noOfHours: number | ''; prerequisites: string[] }>,
    Section<{ raw: string }>, Section<{ programOutcomes: string[] }>, Section<{ courseOutline: OutlineRow[] }>,
    Section<{ courseRequirements: string[]; gradingSystem: string; coursePolicy: string[] }>,
    Section<{ books: { title: string; authors: string; year: string; publisher: string }[]; onlineReferences: { title: string; url: string }[] }>
  ];
  courseMatch: { code: string; title: string; units: number; classification?: string } | null;
  metadata?: { title: string; size: number; lastModified: string; scannedPages?: number };
}
export function parseCourseOutline(text: string): OutlineRow[]
/** Outline rows from the first Word table with Week and Topics columns (any object exposing querySelectorAll, such as a parsed HTML document). */
export function tableOutline(document: { querySelectorAll(selector: string): ArrayLike<unknown> & Iterable<unknown> }): OutlineRow[]
export function parseSyllabusText(text: string, outlineOverride?: OutlineRow[]): ParsedSyllabus
export function parseSyllabusFile(file: File, onProgress?: (message: string) => void): Promise<ParsedSyllabus>
export function parsedToFormState(parsed: ParsedSyllabus): { courseCode: string; courseTitle: string; courseOutline: OutlineRow[]; [key: string]: unknown }
