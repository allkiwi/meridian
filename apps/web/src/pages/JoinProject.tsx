import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as projectsApi from '@/api/projects'
import { useJoinProject } from '@/hooks/useProject'
import type { ProjectPublic } from '@/types/project'

export default function JoinProject() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<ProjectPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: joinProject, isPending: loading } = useJoinProject()

  useEffect(() => {
    projectsApi.getPublic(id!).then(setProject).catch(() => setNotFound(true))
  }, [id])

  async function handleJoin() {
    setError(null)
    try {
      await joinProject(id!)
      navigate(`/projects/${id}`)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 401) {
        navigate(`/login?return=/join/${id}`)
      } else if (typeof detail === 'string' && detail === 'Already a member of this project') {
        navigate(`/projects/${id}`)
      } else {
        setError('Something went wrong. Please try again.')
      }
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e]">
        <p className="text-white/50">This project link is invalid.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-8 font-display text-3xl text-white">Meridian</h1>

        {project ? (
          <>
            <p className="text-sm text-white/50">You have been invited to join</p>
            <p className="mt-2 font-display text-2xl text-white">{project.name}</p>
            <p className="mt-1 text-xs text-white/30">by {project.owner_name}</p>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="mt-8 w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Joining…
                </span>
              ) : (
                'Join project'
              )}
            </button>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </>
        ) : (
          <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        )}
      </div>
    </div>
  )
}
