import { apiClient } from './client'

export interface ShareRequest {
  recipient_email: string
  message?: string
}

export interface ProjectShareRequest extends ShareRequest {
  access_type: 'view' | 'edit'
}

export interface MilestoneShareRequest extends ShareRequest {
  access_type: 'view' | 'edit'
}

export type ShareErrorCode =
  | 'google_not_connected'
  | 'gmail_scope_missing'
  | 'google_token_refresh_failed'

export interface ShareErrorDetail {
  error_code: ShareErrorCode
}

export async function shareProject(projectId: string, data: ProjectShareRequest): Promise<void> {
  await apiClient.post(`/projects/${projectId}/share`, data)
}

export async function shareMilestone(milestoneId: string, data: MilestoneShareRequest): Promise<void> {
  await apiClient.post(`/milestones/${milestoneId}/share`, data)
}
