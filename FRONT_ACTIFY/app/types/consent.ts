// Shapes returned by API_ACTIFY_NODE's /consents routes (see api-routes-complete.md).

export interface ConsentRecord {
  category: string
  isGranted: boolean
  policyVersion: string | null
  createdAt: string
  updatedAt: string
}
