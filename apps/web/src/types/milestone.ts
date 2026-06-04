export interface Milestone {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'complete'
  target_date: string | null
  owner_id: string | null
  owner_name: string | null
  project_id: string
  parent_milestone_id: string | null
  sort_order: number
  created_at: string
  children: Milestone[]
  days_until_due: number | null
}

export interface MilestoneCreate {
  title: string
  description?: string
  owner_id?: string
  target_date?: string
  parent_milestone_id?: string
  sort_order?: number
}

export interface MilestoneUpdate {
  title?: string
  description?: string
  owner_id?: string | null
  target_date?: string | null
  status?: string
  sort_order?: number
}

export interface GanttItem {
  id: string
  title: string
  owner_name: string | null
  owner_id: string | null
  target_date: string | null
  status: string
  depth: number
  parent_milestone_id: string | null
}
