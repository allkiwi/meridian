import { useState } from 'react'
import type { Milestone } from '@/types/milestone'
import type { ProjectMember } from '@/types/project'
import { Avatar } from '@/components/ui/Avatar'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-white/10 text-white/50',
  in_progress: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-green-500/15 text-green-400',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  complete: 'Complete',
}

interface Props {
  milestone: Milestone
  depth: number
  projectId: string
  members: ProjectMember[]
  onAddChild: (parentId: string) => void
  onEdit: (milestone: Milestone) => void
  onDelete: (milestoneId: string) => void
  onShare: (milestoneId: string) => void
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
}

export function MilestoneRow({
  milestone,
  depth,
  projectId,
  members,
  onAddChild,
  onEdit,
  onDelete,
  onShare,
  canEdit,
  canDelete,
  canShare,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    onDelete(milestone.id)
    setConfirming(false)
  }

  const daysLabel = (() => {
    if (milestone.days_until_due === null) return null
    if (milestone.days_until_due < 0) return `${Math.abs(milestone.days_until_due)}d overdue`
    if (milestone.days_until_due === 0) return 'Due today'
    return `${milestone.days_until_due}d`
  })()

  return (
    <div>
      <div
        className="relative"
        style={{ paddingLeft: depth * 24 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      >
        {/* Connector line */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-white/10"
            style={{ left: depth * 24 - 12 }}
          />
        )}

        <div className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/4">
          {/* Status dot */}
          <div className="mt-1 shrink-0">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                milestone.status === 'complete'
                  ? 'bg-green-400'
                  : milestone.status === 'in_progress'
                  ? 'bg-amber-400'
                  : 'bg-white/20'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">{milestone.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  STATUS_STYLES[milestone.status] ?? STATUS_STYLES.pending
                }`}
              >
                {STATUS_LABELS[milestone.status] ?? milestone.status}
              </span>
            </div>

            {milestone.description && (
              <p className="mt-0.5 text-xs text-white/40 line-clamp-2">{milestone.description}</p>
            )}

            <div className="mt-1.5 flex items-center gap-3 text-xs text-white/40">
              {milestone.owner_name && (
                <div className="flex items-center gap-1.5">
                  <Avatar name={milestone.owner_name} size="sm" />
                  <span>{milestone.owner_name}</span>
                </div>
              )}
              {milestone.target_date && (
                <span>
                  {new Date(milestone.target_date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short',
                  })}
                  {daysLabel && (
                    <span
                      className={`ml-1 ${
                        (milestone.days_until_due ?? 0) < 0 ? 'text-red-400' : 'text-amber-400/70'
                      }`}
                    >
                      · {daysLabel}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons — visible on hover */}
          {hovered && (
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <>
                  <button
                    onClick={() => onAddChild(milestone.id)}
                    className="rounded px-2 py-1 text-xs text-white/40 hover:bg-white/10 hover:text-white/80 transition-colors"
                    title="Add sub-milestone"
                  >
                    + Sub
                  </button>
                  <button
                    onClick={() => onEdit(milestone)}
                    className="rounded px-2 py-1 text-xs text-white/40 hover:bg-white/10 hover:text-white/80 transition-colors"
                  >
                    Edit
                  </button>
                </>
              )}
              {canShare && (
                <button
                  onClick={() => onShare(milestone.id)}
                  className="rounded px-2 py-1 text-xs text-white/40 hover:bg-white/10 hover:text-white/80 transition-colors"
                  title="Share milestone"
                >
                  Share
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    confirming
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'text-white/30 hover:bg-white/10 hover:text-red-400'
                  }`}
                >
                  {confirming ? 'Sure?' : 'Del'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Children — recursive */}
      {milestone.children.map((child) => (
        <MilestoneRow
          key={child.id}
          milestone={child}
          depth={depth + 1}
          projectId={projectId}
          members={members}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
          onShare={onShare}
          canEdit={canEdit}
          canDelete={canDelete}
          canShare={canShare}
        />
      ))}
    </div>
  )
}
