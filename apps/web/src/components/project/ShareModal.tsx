import { useState } from 'react'
import type { AxiosError } from 'axios'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { shareProject, shareMilestone } from '@/api/share'
import type { ShareErrorDetail } from '@/api/share'
type AccessType = 'view' | 'edit'

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
  const [accessType, setAccessType] = useState<AccessType>('view')
  const [loading, setLoading] = useState(false)
  const [errorCode, setErrorCode] = useState<ShareErrorDetail['error_code'] | 'unknown' | null>(null)
  const [sent, setSent] = useState(false)

  function handleClose() {
    setRecipientEmail('')
    setMessage('')
    setAccessType('view')
    setErrorCode(null)
    setSent(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorCode(null)
    try {
      if (entityType === 'project') {
        await shareProject(entityId, { recipient_email: recipientEmail, access_type: accessType, message: message || undefined })
      } else {
        await shareMilestone(entityId, {
          recipient_email: recipientEmail,
          access_type: accessType,
          message: message || undefined,
        })
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
          <p className="text-sm text-white/70">
            {accessType === 'edit' ? 'Edit' : 'View'} access sent to <span className="text-white">{recipientEmail}</span>
          </p>
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
            <label className="text-sm font-medium text-white/70">Access level</label>
            <div className="flex gap-3">
              {(['view', 'edit'] as const).map((level) => (
                <label
                  key={level}
                  className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 transition-colors ${
                    accessType === level
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-white/3 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="access_type"
                    value={level}
                    checked={accessType === level}
                    onChange={() => setAccessType(level)}
                    className="sr-only"
                  />
                  <span
                    className={`h-3.5 w-3.5 rounded-full border-2 ${
                      accessType === level ? 'border-amber-500 bg-amber-500' : 'border-white/30'
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${accessType === level ? 'text-amber-300' : 'text-white/70'}`}>
                      {level === 'view' ? 'View' : 'Edit'}
                    </p>
                    <p className="text-xs text-white/30">
                      {level === 'view'
                        ? entityType === 'project' ? 'Can view milestones only' : 'Can view this milestone'
                        : entityType === 'project' ? 'Can create and edit milestones' : 'Can edit this milestone'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

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
