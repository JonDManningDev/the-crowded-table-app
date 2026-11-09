export type HistoryCategory = 'community_account' | 'staff_account'
export type HistoryQuery = {
  target?: string
  category?: HistoryCategory
  eventId?: string
  cursor?: string
  limit?: string
}
export type HistoryEntry = {
  id: string
  tenant_id: string
  action: string
  target_user_id: string | null
  content_key: string | null
  created_at: string
  created_by: string | null
  operation_id: string
  reason: string | null
  details: Record<string, unknown>
  categories: HistoryCategory[]
}
export type HistoryPage = { rows: HistoryEntry[]; next: string | null }
