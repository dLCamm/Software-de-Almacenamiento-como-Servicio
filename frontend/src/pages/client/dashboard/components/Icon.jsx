const content = {
  cloud: <path d="M7 18.5h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.3 4.6 4.6 0 0 0 7 18.5z" />,
  home: <><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" /></>,
  chevron: <path d="m9.5 6 6 6-6 6" />,
  restore: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  upload: <><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" /><path d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13" /></>,
  folderAdd: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M12 11v6m-3-3h6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="4" cy="18" r=".8" /></>,
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
  pdf: <><path d="M6 2.5h8l6 6v13H6z" /><path d="M14 2.5v6h6" /><text x="8" y="17" className="file-glyph-text">PDF</text></>,
  doc: <><path d="M6 2.5h8l6 6v13H6z" /><path d="M14 2.5v6h6" /><text x="8" y="17" className="file-glyph-text">DOC</text></>,
  png: <><path d="M6 2.5h8l6 6v13H6z" /><path d="M14 2.5v6h6" /><text x="8" y="17" className="file-glyph-text">PNG</text></>,
  // Disco de vinilo: borde, surco, etiqueta central y brillo.
  mp3: <><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="6.6" strokeWidth="1" opacity=".45" /><circle cx="12" cy="12" r="3.2" fill="currentColor" fillOpacity=".22" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><path d="M6.4 9.2a6.2 6.2 0 0 1 2.9-3.1" strokeWidth="1.3" /><path d="M17.6 14.8a6.2 6.2 0 0 1-2.9 3.1" strokeWidth="1.3" opacity=".6" /></>,
  more: <><circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" /></>,
  upgrade: <><path d="M3 16.5 9 10l4 4 8-9" /><path d="M15 5h6v6" /></>,
  download: <><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" /><path d="M5 17v3h14v-3" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4m-6.6 9.4 6.6 4.4" /></>,
  rename: <><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4z" /><path d="m14.5 6 3.5 3.5" /></>,
  trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  x: <><path d="m5 5 14 14M19 5 5 19" /></>,
  check: <path d="m5 12 4.2 4.2L19 6.5" />,
  back: <><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
}

export default function Icon({ name, size = 20 }) {
  return <svg className={`dashboard-icon dashboard-icon--${name}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{content[name]}</svg>
}
