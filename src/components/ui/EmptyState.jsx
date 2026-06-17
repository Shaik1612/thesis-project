import { Inbox } from 'lucide-react'
import Button from './Button'

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className = '',
}) {
  return (
    <div className={['flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className].join(' ')}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-ink-400">
        <Icon className="h-7 w-7" />
      </div>
      {title && <h4 className="text-base font-display font-semibold text-ink-900">{title}</h4>}
      {message && <p className="max-w-sm text-sm text-ink-600">{message}</p>}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
