const COLORS = [
  'bg-violet-600',
  'bg-blue-600',
  'bg-teal-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-emerald-600',
]

interface AvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const color = COLORS[name.charCodeAt(0) % COLORS.length]
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'
  return (
    <div
      className={`${sizeClass} ${color} ${className} flex shrink-0 items-center justify-center rounded-full font-medium text-white`}
      title={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
