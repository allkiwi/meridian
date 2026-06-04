import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as projectsApi from '@/api/projects'
import { useAuthStore } from '@/store/authStore'
import { useJoinProject } from '@/hooks/useProject'
import type { ProjectPublic } from '@/types/project'

const MAX_ATTEMPTS = 5

export default function JoinProject() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [project, setProject] = useState<ProjectPublic | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [chars, setChars] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { mutateAsync: joinProject } = useJoinProject()

  useEffect(() => {
    projectsApi.getPublic(id!).then(setProject).catch(() => setNotFound(true))
  }, [id])

  async function submit(passcode: string) {
    if (loading || attempts >= MAX_ATTEMPTS) return
    setLoading(true)
    setError(null)
    try {
      if (!user) {
        navigate(`/login?return=/join/${id}&passcode=${passcode}`)
        return
      }
      await joinProject({ id: id!, passcode })
      navigate(`/projects/${id}`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setChars(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)

      if (newAttempts >= MAX_ATTEMPTS) {
        setError('Too many attempts. Please ask your project manager to resend the invite.')
      } else {
        setError(typeof detail === 'string' ? 'Incorrect passcode. Please try again.' : 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleInput(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.slice(-1).toUpperCase()
    const next = [...chars]
    next[idx] = val
    setChars(next)
    setError(null)

    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
    if (val && idx === 5) {
      const full = [...next.slice(0, 5), val].join('')
      if (full.length === 6) submit(full)
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e]">
        <p className="text-white/50">This project link is invalid.</p>
      </div>
    )
  }

  const locked = attempts >= MAX_ATTEMPTS

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1e] px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-8 font-display text-3xl text-white">Meridian</h1>

        {project ? (
          <>
            <p className="text-sm text-white/50">You have been invited to join</p>
            <p className="mt-2 font-display text-2xl text-white">{project.name}</p>
            <p className="mt-1 text-xs text-white/30">by {project.owner_name}</p>

            <p className="mt-8 text-sm text-white/60">
              Enter the passcode shared with you by your project manager
            </p>

            <div className="mt-4 flex justify-center gap-2">
              {chars.map((ch, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el }}
                  value={ch}
                  onChange={(e) => handleInput(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={locked || loading}
                  maxLength={1}
                  className={`h-12 w-10 rounded-lg border text-center text-lg font-mono font-semibold uppercase text-white outline-none transition-colors
                    ${error ? 'border-red-500 bg-red-500/10' : 'border-white/20 bg-white/5 focus:border-amber-500'}
                    disabled:opacity-40`}
                />
              ))}
            </div>

            {loading && (
              <div className="mt-4 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </>
        ) : (
          <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        )}
      </div>
    </div>
  )
}
