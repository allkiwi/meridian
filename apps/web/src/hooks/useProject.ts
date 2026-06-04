import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as projectsApi from '@/api/projects'

export function useUserProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => projectsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useJoinProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, passcode }: { id: string; passcode: string }) =>
      projectsApi.join(id, passcode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
