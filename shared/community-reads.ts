export type OwnCommunityRequest = { request_id: string; kind: 'join' | 'reactivation'; requested_at: string }
export type OwnCommunityRequestResponse = { request: OwnCommunityRequest | null }
export type AccountReview = { standing: 'pending' | 'approved' | 'suspended' | 'inactive'; revision: string; request_id: string | null }
export type StaffCandidate = { tenant_id: string; user_id: string; standing: 'approved'; display_name: string | null;
  staff_role: 'owner' | 'admin' | null; staff_status: 'active' | 'paused' | 'revoked' | null }
export type CommunityRequest = { id: string; kind: 'join' | 'reactivation'; user_id: string; requested_at: string;
  revision: string; standing: AccountReview['standing']; first_approved_at: string | null;
  has_disciplinary_restriction: boolean; display_name: string | null }
export type CommunityReadPage<T> = { rows: T[]; next: string | null }
