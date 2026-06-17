export default function Skeleton({ className = '', height, width }) {
  return (
    <div
      className={['skeleton', className].join(' ')}
      style={{
        height: height ?? '1rem',
        width: width ?? '100%',
      }}
    />
  )
}
