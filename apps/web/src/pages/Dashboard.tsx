import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { ProjectCard } from '@/components/project/ProjectCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useUserProjects, useCreateProject } from '@/hooks/useProject'

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { mutateAsync: createProject } = useCreateProject()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createProject({ name, description: description || undefined })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Create a new project">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Website Redesign"
          required
          autoFocus
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/70">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about? (optional)"
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim()}>Create Project</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Dashboard() {
  const { data: projects, isLoading } = useUserProjects()
  const [showNewProject, setShowNewProject] = useState(false)

  return (
    <PageShell>
      <div className="px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl text-white">Projects</h1>
          <Button onClick={() => setShowNewProject(true)}>New Project</Button>
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {!isLoading && projects?.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-display text-2xl text-white">No projects yet</p>
            <p className="mt-2 text-sm text-white/40">Create your first project to get started</p>
            <Button className="mt-6" onClick={() => setShowNewProject(true)}>New Project</Button>
          </div>
        )}

        {!isLoading && projects && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </PageShell>
  )
}
