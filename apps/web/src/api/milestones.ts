import type { GanttItem, Milestone, MilestoneCreate, MilestoneUpdate } from '@/types/milestone'
import { apiClient } from './client'

export async function list(projectId: string): Promise<Milestone[]> {
  const res = await apiClient.get<Milestone[]>(`/projects/${projectId}/milestones`)
  return res.data
}

export async function getGantt(projectId: string): Promise<GanttItem[]> {
  const res = await apiClient.get<GanttItem[]>(`/projects/${projectId}/gantt`)
  return res.data
}

export async function get(id: string): Promise<Milestone> {
  const res = await apiClient.get<Milestone>(`/milestones/${id}`)
  return res.data
}

export async function create(projectId: string, data: MilestoneCreate): Promise<Milestone> {
  const res = await apiClient.post<Milestone>(`/projects/${projectId}/milestones`, data)
  return res.data
}

export async function update(id: string, data: MilestoneUpdate): Promise<Milestone> {
  const res = await apiClient.patch<Milestone>(`/milestones/${id}`, data)
  return res.data
}

export async function remove(id: string): Promise<void> {
  await apiClient.delete(`/milestones/${id}`)
}
