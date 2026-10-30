import './TablePagination.css'

/** Barra de paginación: rango mostrado, tamaño de página y botones Anterior / Siguiente. */
export default function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange, sizes = [10, 25, 50], disabled = false, label = 'Paginación' }) {
  if (!total) return null
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const format = (value) => value.toLocaleString('es-GT')

  return <nav className="table-pagination" aria-label={label}>
    <span>Mostrando <strong>{format(first)}–{format(last)}</strong> de {format(total)}</span>
    {onPageSizeChange && <label className="table-pagination__size">Por página
      <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} disabled={disabled}>
        {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>}
    <div className="table-pagination__buttons">
      <button type="button" className="admin-button admin-button--secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || disabled}>Anterior</button>
      <span>Página {page} de {totalPages}</span>
      <button type="button" className="admin-button admin-button--secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages || disabled}>Siguiente</button>
    </div>
  </nav>
}
