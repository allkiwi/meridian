import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageShell } from '@/components/layout/PageShell'
import { Topbar } from '@/components/layout/Topbar'
import { MilestoneRow } from '@/components/project/MilestoneRow'
import { MilestoneForm } from '@/components/project/MilestoneForm'
import { ShareModal } from '@/components/project/ShareModal'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useProject } from '@/hooks/useProject'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestone'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { useProjectStore } from '@/store/projectStore'
import * as projectsApi from '@/api/projects'
import * as milestonesApi from '@/api/milestones'
import type { Milestone, MilestoneCreate, MilestoneUpdate } from '@/types/milestone'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const projectId = id!
  const setActiveProject = useProjectStore((s) => s.setActiveProject)

  const [view, setView] = useState('milestones')
  const [milestoneModal, setMilestoneModal] = useState<{
    open: boolean
    parentId?: string
    editing?: Milestone
  }>({ open: false })
  const [shareModal, setShareModal] = useState<{
    entityType: 'project' | 'milestone'
    entityId: string
    entityName: string
  } | null>(null)

  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(projectId)
  const { data: ganttData } = useQuery({
    queryKey: ['gantt', projectId],
    queryFn: () => milestonesApi.getGantt(projectId),
    enabled: view === 'gantt',
  })
  const { data: members = [] } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.getMembers(projectId),
    enabled: !!projectId,
  })
  const { canCreateMilestone, canDeleteMilestone, canUpdateMilestone, canShare } = useRoleGuard(projectId)
  const { mutateAsync: createMilestone } = useCreateMilestone(projectId)
  const { mutateAsync: updateMilestone } = useUpdateMilestone(projectId)
  const { mutateAsync: deleteMilestone } = useDeleteMilestone(projectId)

  useEffect(() => {
    setActiveProject(projectId)
    return () => setActiveProject(null)
  }, [projectId, setActiveProject])

  function openNewMilestone(parentId?: string) {
    setMilestoneModal({ open: true, parentId })
  }

  function openEdit(milestone: Milestone) {
    setMilestoneModal({ open: true, editing: milestone })
  }

  async function handleMilestoneSubmit(data: MilestoneCreate | MilestoneUpdate) {
    if (milestoneModal.editing) {
      await updateMilestone({ id: milestoneModal.editing.id, data: data as MilestoneUpdate })
    } else {
      const payload = data as MilestoneCreate
      await createMilestone({ ...payload, parent_milestone_id: milestoneModal.parentId })
    }
    setMilestoneModal({ open: false })
  }

  async function handleDelete(milestoneId: string) {
    await deleteMilestone(milestoneId)
  }

  function openMilestoneShare(milestoneId: string) {
    const flatten = (items: Milestone[]): Milestone[] =>
      items.flatMap((m) => [m, ...flatten(m.children ?? [])])
    const found = flatten(milestones ?? []).find((m) => m.id === milestoneId)
    setShareModal({ entityType: 'milestone', entityId: milestoneId, entityName: found?.title ?? 'Milestone' })
  }

  if (projectLoading) {
    return (
      <PageShell>
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </PageShell>
    )
  }

  if (!project) {
    return (
      <PageShell>
        <div className="flex h-full items-center justify-center text-white/40">Project not found.</div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Topbar
        projectName={project.name}
        projectStatus={project.status}
        members={members}
        view={view}
        onViewChange={setView}
        onShareProject={canShare ? () => setShareModal({ entityType: 'project', entityId: projectId, entityName: project.name }) : undefined}
      />

      <div className="px-8 py-6">
        {/* ── Milestones view ── */}
        {view === 'milestones' && (
          <>
            {milestonesLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            )}

            {!milestonesLoading && milestones?.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="font-display text-xl text-white">No milestones yet</p>
                <p className="mt-2 text-sm text-white/40">Break this project down into trackable milestones</p>
                {canCreateMilestone && (
                  <Button className="mt-6" onClick={() => openNewMilestone()}>
                    Add the first milestone
                  </Button>
                )}
              </div>
            )}

            {!milestonesLoading && milestones && milestones.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/3">
                {milestones.map((m) => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    depth={0}
                    projectId={projectId}
                    members={members}
                    onAddChild={openNewMilestone}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onShare={openMilestoneShare}
                    canEdit={canUpdateMilestone}
                    canDelete={canDeleteMilestone}
                    canShare={canShare}
                  />
                ))}
              </div>
            )}

            {canCreateMilestone && (milestones?.length ?? 0) > 0 && (
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => openNewMilestone()}
              >
                + Add milestone
              </Button>
            )}
          </>
        )}

        {/* ── Gantt view (simple table) ── */}
        {view === 'gantt' && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-white/40">
                  <th className="px-4 py-3 font-medium">Milestone</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Target date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ganttData?.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-white/80"
                        style={{ paddingLeft: item.depth * 20 }}
                      >
                        {item.depth > 0 && <span className="mr-2 text-white/20">└</span>}
                        {item.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50">{item.owner_name ?? '—'}</td>
                    <td className="px-4 py-3 text-white/50">
                      {item.target_date
                        ? new Date(item.target_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-white/50 capitalize">
                      {item.status.replace('_', ' ')}
                    </td>
                  </tr>
                ))}
                {!ganttData?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-white/30">
                      No milestones to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Milestone create/edit modal */}
      <Modal
        open={milestoneModal.open}
        onClose={() => setMilestoneModal({ open: false })}
        title={milestoneModal.editing ? 'Edit milestone' : milestoneModal.parentId ? 'Add sub-milestone' : 'Add milestone'}
      >
        <MilestoneForm
          members={members}
          mode={milestoneModal.editing ? 'edit' : 'create'}
          initialValues={
            milestoneModal.editing
              ? {
                  title: milestoneModal.editing.title,
                  description: milestoneModal.editing.description ?? undefined,
                  owner_id: milestoneModal.editing.owner_id ?? undefined,
                  target_date: milestoneModal.editing.target_date ?? undefined,
                  status: milestoneModal.editing.status,
                }
              : { parent_milestone_id: milestoneModal.parentId }
          }
          onSubmit={handleMilestoneSubmit}
          onCancel={() => setMilestoneModal({ open: false })}
        />
      </Modal>
      {shareModal && (
        <ShareModal
          open={true}
          onClose={() => setShareModal(null)}
          entityType={shareModal.entityType}
          entityId={shareModal.entityId}
          entityName={shareModal.entityName}
        />
      )}
    </PageShell>
  )
}
