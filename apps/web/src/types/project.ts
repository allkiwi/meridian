export type ProjectRole = 'project_manager' | 'member' | 'viewer'
export type ProjectStatus = 'active' | 'archived' | 'completed'

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  owner_id: string
  created_at: string
  member_count: number
  milestone_count: number
}

export interface ProjectSummary {
  id: string
  name: string
  status: ProjectStatus
  owner_id: string
  created_at: string
  member_count: number
  next_milestone_date: string | null
}

export interface ProjectPublic {
  id: string
  name: string
  owner_name: string
}

export interface ProjectMember {
  user_id: string
  name: string
  email: string
  role: ProjectRole
  joined_at: string
}
