import { useId, useState } from 'react'
import { EyeIcon } from '../../components/icons'

export default function FormField({
  icon: Icon,
  isPassword,
  error,
  ...inputProps
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <div className={`field__control${error ? ' has-error' : ''}`}>
        {Icon && <Icon className="field__icon" aria-hidden="true" />}
        <input
          id={id}
          type={isPassword && !visible ? 'password' : 'text'}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="field__toggle"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setVisible((v) => !v)}
          >
            <EyeIcon open={visible} />
          </button>
        )}
      </div>
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}
