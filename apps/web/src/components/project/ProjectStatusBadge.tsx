interface Props {
  status: string
}

const styles: Record<string, string> = {
  active: 'bg-teal-500/15 text-teal-400',
  archived: 'bg-white/10 text-white/40',
  completed: 'bg-green-500/15 text-green-400',
}

const labels: Record<string, string> = {
  active: 'Active',
  archived: 'Archived',
  completed: 'Completed',
}

export function ProjectStatusBadge({ status }: Props) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.active}`}>
      {labels[status] ?? status}
    </span>
  )
}
