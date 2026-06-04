import { useState } from 'react'
import type { ProjectMember } from '@/types/project'
import type { MilestoneCreate, MilestoneUpdate } from '@/types/milestone'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface MilestoneFormProps {
  members: ProjectMember[]
  initialValues?: Partial<MilestoneCreate> & { status?: string }
  mode?: 'create' | 'edit'
  onSubmit: (data: MilestoneCreate | MilestoneUpdate) => Promise<void>
  onCancel: () => void
}

export function MilestoneForm({
  members,
  initialValues = {},
  mode = 'create',
  onSubmit,
  onCancel,
}: MilestoneFormProps) {
  const [title, setTitle] = useState(initialValues.title ?? '')
  const [description, setDescription] = useState(initialValues.description ?? '')
  const [ownerId, setOwnerId] = useState(initialValues.owner_id ?? '')
  const [targetDate, setTargetDate] = useState(initialValues.target_date ?? '')
  const [status, setStatus] = useState(initialValues?.status ?? 'pending')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    setLoading(true)
    try {
      const payload: MilestoneCreate = {
        title: title.trim(),
        description: description.trim() || undefined,
        owner_id: ownerId || undefined,
        target_date: targetDate || undefined,
        parent_milestone_id: initialValues.parent_milestone_id,
        sort_order: initialValues.sort_order ?? 0,
      }
      if (mode === 'edit') {
        const update: MilestoneUpdate = { title: payload.title, description: payload.description, owner_id: payload.owner_id ?? null, target_date: payload.target_date ?? null, status }
        await onSubmit(update)
      } else {
        await onSubmit(payload)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 border border-red-500/20">
          {error}
        </p>
      )}

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone title"
        required
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/70">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/70">Owner</label>
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0d1425] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Target date"
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
      />

      {mode === 'edit' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/70">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d1425] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {mode === 'create' ? 'Add milestone' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
