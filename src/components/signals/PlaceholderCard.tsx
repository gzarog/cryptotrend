type Props = {
  title: string
  message?: string
}

export function PlaceholderCard({ title, message = 'Waiting for data…' }: Props) {
  return (
    <div className="glass-panel p-4 text-center">
      <h4 className="text-sm font-medium text-muted-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground/60">{message}</p>
    </div>
  )
}
