import type { ProjectMember } from '@/types/project'
import { Avatar } from '@/components/ui/Avatar'
import { ProjectStatusBadge } from '@/components/project/ProjectStatusBadge'
import { ViewToggle } from './ViewToggle'

const VIEW_OPTIONS = [
  { label: 'Milestones', value: 'milestones' },
  { label: 'Gantt', value: 'gantt' },
  { label: 'Files', value: 'files', disabled: true },
  { label: 'Costs', value: 'costs', disabled: true },
]

interface TopbarProps {
  projectName: string
  projectStatus: string
  members: ProjectMember[]
  view: string
  onViewChange: (v: string) => void
}

export function Topbar({ projectName, projectStatus, members, view, onViewChange }: TopbarProps) {
  const visible = members.slice(0, 4)
  const overflow = members.length - 4

  return (
    <div className="border-b border-white/10 bg-[#0a0f1e] px-6 py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl text-white">{projectName}</h1>
            <ProjectStatusBadge status={projectStatus} />
          </div>
          <div className="mt-2.5">
            <ViewToggle options={VIEW_OPTIONS} value={view} onChange={onViewChange} />
          </div>
        </div>

        {/* Avatar stack */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {visible.map((m) => (
              <Avatar key={m.user_id} name={m.name} size="sm" className="ring-2 ring-[#0a0f1e]" />
            ))}
          </div>
          {overflow > 0 && (
            <span className="ml-2 text-xs text-white/40">+{overflow}</span>
          )}
        </div>
      </div>
    </div>
  )
}
