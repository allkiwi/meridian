import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as milestonesApi from '@/api/milestones'
import type { MilestoneCreate, MilestoneUpdate } from '@/types/milestone'

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId),
    enabled: !!projectId,
  })
}

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MilestoneCreate) => milestonesApi.create(projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MilestoneUpdate }) =>
      milestonesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })
}

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => milestonesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
  })
}
