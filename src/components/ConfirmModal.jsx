import { useState } from 'react'

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  const [step, setStep] = useState(1)
  const [typed, setTyped] = useState('')

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <div className="confirm-icon-wrap">⚠️</div>
            <p>{message || '¿Seguro que desea eliminar este registro?'}</p>
            <div className="confirm-actions">
              <button className="btn-export" onClick={onCancel}>Cancelar</button>
              <button className="btn-danger" onClick={() => setStep(2)}>Continuar</button>
            </div>
          </>
        ) : (
          <>
            <div className="confirm-icon-wrap">🗑️</div>
            <p>Escribe <strong>ELIMINAR</strong> para confirmar</p>
            <input
              className="confirm-input"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="ELIMINAR"
              autoFocus
            />
            <div className="confirm-actions">
              <button className="btn-export" onClick={onCancel}>Cancelar</button>
              <button
                className="btn-danger"
                onClick={onConfirm}
                disabled={typed !== 'ELIMINAR'}
              >
                Eliminar definitivamente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
