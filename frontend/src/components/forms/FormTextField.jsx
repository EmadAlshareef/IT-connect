import { formInput } from '../home/homeTheme.js'

function inputBaseClass(hasError) {
  const invalid =
    'border-rose-500 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500 dark:focus:border-rose-400 dark:focus:ring-rose-950/40'
  return `${formInput} ${hasError ? invalid : ''}`
}

/**
 * Reusable labeled text input with validation error display (Tailwind).
 */
function FormTextField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  disabled,
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputBaseClass(Boolean(error))}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FormTextField
