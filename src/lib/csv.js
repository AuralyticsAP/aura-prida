export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] ?? ''
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      }).join(',')
    )
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function formatDateForFilename(date) {
  return date.toISOString().split('T')[0]
}
