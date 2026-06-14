import type { Project, ProjectMember, ProjectPublic, ProjectRole, ProjectSummary } from '@/types/project'
import { apiClient } from './client'

export async function list(): Promise<ProjectSummary[]> {
  const res = await apiClient.get<ProjectSummary[]>('/projects')
  return res.data
}

export async function get(id: string): Promise<Project> {
  const res = await apiClient.get<Project>(`/projects/${id}`)
  return res.data
}

export async function getPublic(id: string): Promise<ProjectPublic> {
  const res = await apiClient.get<ProjectPublic>(`/projects/${id}/public`)
  return res.data
}

export async function create(data: { name: string; description?: string }): Promise<Project> {
  const res = await apiClient.post<Project>('/projects', data)
  return res.data
}

export async function update(id: string, data: Partial<Project>): Promise<Project> {
  const res = await apiClient.patch<Project>(`/projects/${id}`, data)
  return res.data
}

export async function remove(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`)
}

export async function join(id: string): Promise<Project> {
  const res = await apiClient.post<Project>(`/projects/${id}/join`)
  return res.data
}

export async function getMembers(id: string): Promise<ProjectMember[]> {
  const res = await apiClient.get<ProjectMember[]>(`/projects/${id}/members`)
  return res.data
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<ProjectMember> {
  const res = await apiClient.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, { role })
  return res.data
}
