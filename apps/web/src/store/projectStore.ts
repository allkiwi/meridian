import { create } from 'zustand'
import type { ProjectSummary } from '@/types/project'

interface ProjectState {
  activeProjectId: string | null
  projects: ProjectSummary[]
  setActiveProject: (id: string | null) => void
  setProjects: (projects: ProjectSummary[]) => void
  clearProjects: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  projects: [],
  setActiveProject: (id) => set({ activeProjectId: id }),
  setProjects: (projects) => set({ projects }),
  clearProjects: () => set({ projects: [], activeProjectId: null }),
}))
