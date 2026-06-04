import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth, clearAuth } = useAuthStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const error = params.get('error')

    if (error || !accessToken || !refreshToken) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    useAuthStore.setState({ accessToken })

    getMe()
      .then((user) => {
        setAuth(user, accessToken, refreshToken)
        navigate('/', { replace: true })
      })
      .catch(() => {
        clearAuth()
        navigate('/login?error=oauth_failed', { replace: true })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
    </div>
  )
}
