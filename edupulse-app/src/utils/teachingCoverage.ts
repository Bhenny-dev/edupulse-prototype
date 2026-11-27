/** Which delivered teaching an assessment covers. Shared by the browser sequence and the server practice reader. */
export type CoverageItem = { id: string; type: string; position?: number; workspace_item_id?: string; content?: { courseItemId?: string; overallAssessment?: boolean; assessmentRole?: string; submissionOnly?: boolean; teachingOrder?: number; coverage?: { materialIds: string[] } } | null }

export const isTeachingMaterial = (item: CoverageItem) => item.type !== 'assessment' && !item.content?.submissionOnly
export const coversMaterial = (assessment: CoverageItem, material: CoverageItem) => {
  const ids = assessment.content?.coverage?.materialIds
  return isTeachingMaterial(material) && Array.isArray(ids) && ids.some(id => id === material.id || id === material.workspace_item_id || id === material.content?.courseItemId)
}
