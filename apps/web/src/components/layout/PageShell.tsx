import { Sidebar } from './Sidebar'

interface PageShellProps {
  children: React.ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
