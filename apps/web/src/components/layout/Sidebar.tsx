import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useUserProjects } from '@/hooks/useProject'
import { Avatar } from '@/components/ui/Avatar'

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'active' ? 'bg-teal-400' : status === 'completed' ? 'bg-green-400' : 'bg-white/30'
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { setProjects } = useProjectStore()
  const { data: projects, isLoading } = useUserProjects()

  useEffect(() => {
    if (projects) setProjects(projects)
  }, [projects, setProjects])

  function logout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-white/10 bg-[#0a0f1e]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" stroke="#f59e0b" strokeWidth="1.5" />
          <line x1="12" y1="2" x2="12" y2="6" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="18" x2="12" y2="22" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="12" x2="6" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="12" x2="22" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="font-display text-lg text-white">Meridian</span>
      </div>

      {/* Project list */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Projects
        </p>

        {isLoading &&
          [0, 1, 2].map((i) => (
            <div key={i} className="mx-1 mb-1.5 h-8 animate-pulse rounded-md bg-white/5" />
          ))}

        {projects?.map((project) => {
          const active = location.pathname.startsWith(`/projects/${project.id}`)
          return (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all
                ${active
                  ? 'border-l-2 border-amber-500 bg-white/8 pl-[10px] text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`}
            >
              <StatusDot status={project.status} />
              <span className="truncate">{project.name}</span>
            </Link>
          )
        })}

        {!isLoading && projects?.length === 0 && (
          <p className="px-3 py-2 text-xs text-white/30">No projects yet</p>
        )}
      </nav>

      {/* Bottom user row */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5">
          {user && <Avatar name={user.name} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/80">{user?.name}</p>
            <p className="truncate text-[10px] text-white/40">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-white/30 hover:text-white/70 transition-colors"
            title="Log out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
