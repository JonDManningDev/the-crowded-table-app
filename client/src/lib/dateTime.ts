export function formatDate(value: string, short = false) {
  return new Date(value + 'T12:00:00').toLocaleDateString('en-US', {
    month: short ? 'short' : 'long', day: 'numeric',
    ...(!short ? { weekday: 'long' as const } : {}),
  })
}

export function formatTime(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
