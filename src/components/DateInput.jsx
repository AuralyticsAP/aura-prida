import DatePicker, { registerLocale } from 'react-datepicker'
import { es } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('es', es)

function isoToDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dateToISO(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DateInput({ value, onChange, name, required, className }) {
  const handleChange = (date) => {
    onChange({ target: { name: name ?? '', value: dateToISO(date) } })
  }

  return (
    <DatePicker
      selected={isoToDate(value)}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      locale="es"
      required={required}
      className={className}
      placeholderText="dd/mm/aaaa"
      popperPlacement="bottom-start"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      autoComplete="off"
    />
  )
}
