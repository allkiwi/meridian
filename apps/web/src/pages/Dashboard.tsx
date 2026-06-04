import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Navbar */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="font-display text-xl text-white">Meridian</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50">{user?.email}</span>
            <Button variant="ghost" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-2 text-amber-500 text-sm font-medium tracking-widest uppercase">
          Dashboard
        </div>
        <h2 className="font-display text-4xl text-white">
          Welcome to Meridian{user?.name ? `, ${user.name}` : ""}
        </h2>
        <p className="mt-4 max-w-xl text-white/50">
          Your commitment intelligence platform is ready. Connect your email and calendar to start
          tracking milestones and detecting at-risk commitments.
        </p>

        {/* Placeholder cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {["Active Commitments", "At Risk", "Completed"].map((label) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm text-white/40">{label}</p>
              <p className="mt-2 font-display text-3xl text-white">—</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
