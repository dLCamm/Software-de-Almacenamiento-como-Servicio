import { useState } from 'react'

/**
 * Paginación para listas que llegan completas del backend (usuarios, pagos…).
 * Devuelve solo los elementos de la página actual. Si la lista se achica (por ejemplo al filtrar),
 * la página se ajusta sola para no quedar fuera de rango.
 */
export default function usePagedList(items, initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return {
    page: currentPage,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize: (size) => { setPageSize(size); setPage(1) },
    resetPage: () => setPage(1),
  }
}
