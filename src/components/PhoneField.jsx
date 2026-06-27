import { Input } from './ui'

export default function PhoneField({
  value,
  onChange,
  error,
  required = false,
  label = 'Phone number',
  kiosk = false,
  size,
  showHint = true,
}) {
  const helper = required
    ? "We'll text you when your order is ready."
    : 'Optional — used to notify you when your order is ready.'

  return (
    <Input
      label={required ? `${label} *` : label}
      placeholder="10-digit mobile number"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={10}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
      error={error}
      hint={!error && showHint ? helper : undefined}
      kiosk={kiosk}
      size={size}
    />
  )
}
