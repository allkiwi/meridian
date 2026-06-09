import { useState } from 'react'
import type { AxiosError } from 'axios'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { shareProject, shareMilestone } from '@/api/share'
import type { ShareErrorDetail } from '@/api/share'

interface Props {
  open: boolean
  onClose: () => void
  entityType: 'project' | 'milestone'
  entityId: string
  entityName: string
}

export function ShareModal({ open, onClose, entityType, entityId, entityName }: Props) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorCode, setErrorCode] = useState<ShareErrorDetail['error_code'] | 'unknown' | null>(null)
  const [sent, setSent] = useState(false)

  function handleClose() {
    setRecipientEmail('')
    setMessage('')
    setErrorCode(null)
    setSent(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorCode(null)
    try {
      const data = { recipient_email: recipientEmail, message: message || undefined }
      if (entityType === 'project') {
        await shareProject(entityId, data)
      } else {
        await shareMilestone(entityId, data)
      }
      setSent(true)
    } catch (err) {
      const detail = (err as AxiosError<{ detail: ShareErrorDetail }>)?.response?.data?.detail
      if (detail?.error_code) {
        setErrorCode(detail.error_code)
      } else {
        setErrorCode('unknown')
      }
    } finally {
      setLoading(false)
    }
  }

  const title = entityType === 'project' ? `Share project` : `Share milestone`

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-white/70">Email sent to <span className="text-white">{recipientEmail}</span></p>
          <Button variant="ghost" onClick={handleClose}>Close</Button>
        </div>
      ) : errorCode === 'google_not_connected' ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-300">Google account not connected</p>
            <p className="mt-1 text-sm text-white/60">Connect your Google account to send emails via Gmail.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={() => { window.location.href = '/api/auth/google/login' }}>
              Connect Google
            </Button>
          </div>
        </div>
      ) : errorCode === 'gmail_scope_missing' || errorCode === 'google_token_refresh_failed' ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-300">Gmail permission needed</p>
            <p className="mt-1 text-sm text-white/60">Re-connect your Google account to enable sending emails from Gmail.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={() => { window.location.href = '/api/auth/google/reauth' }}>
              Re-connect Google
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-white/50">
            Sharing: <span className="text-white/80">{entityName}</span>
          </p>

          <Input
            label="Recipient email"
            type="email"
            required
            autoFocus
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="colleague@example.com"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              Message <span className="text-white/30">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal note…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {errorCode === 'unknown' && (
            <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={!recipientEmail}>
              Send email
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
