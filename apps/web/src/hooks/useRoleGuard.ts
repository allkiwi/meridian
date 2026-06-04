import { useQuery } from '@tanstack/react-query'
import * as projectsApi from '@/api/projects'
import { useAuthStore } from '@/store/authStore'

export function useRoleGuard(projectId: string) {
  const user = useAuthStore((s) => s.user)

  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.getMembers(projectId),
    enabled: !!projectId,
  })

  const myMember = members?.find((m) => m.user_id === user?.id)
  const role = myMember?.role ?? null

  return {
    role,
    isProjectManager: role === 'project_manager',
    isMember: role === 'member',
    isExecutive: role === 'executive',
    canCreateMilestone: role === 'project_manager' || role === 'member',
    canDeleteMilestone: role === 'project_manager',
    canUpdateMilestone: role === 'project_manager' || role === 'member',
    canManageMembers: role === 'project_manager',
  }
}
