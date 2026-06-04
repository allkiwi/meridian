import { useNavigate } from 'react-router-dom'
import type { ProjectSummary } from '@/types/project'
import { ProjectStatusBadge } from './ProjectStatusBadge'

interface Props {
  project: ProjectSummary
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLabel(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  return `${diff}d away`
}

export function ProjectCard({ project }: Props) {
  const navigate = useNavigate()
  const dayLabel = daysLabel(project.next_milestone_date)

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group w-full rounded-xl border border-[#1e2d4a] bg-[#111827] p-5 text-left transition-all hover:border-[#2e4d7a] hover:bg-[#1a2436]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-display text-base text-white leading-tight">{project.name}</h3>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-white/40">
        <span>{project.member_count} {project.member_count === 1 ? 'member' : 'members'}</span>

        {project.next_milestone_date ? (
          <>
            <span>·</span>
            <span>{formatDate(project.next_milestone_date)}</span>
            {dayLabel && (
              <>
                <span>·</span>
                <span className={dayLabel.includes('overdue') ? 'text-red-400' : 'text-amber-400/80'}>
                  {dayLabel}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span>·</span>
            <span>No milestones yet</span>
          </>
        )}
      </div>
    </button>
  )
}
