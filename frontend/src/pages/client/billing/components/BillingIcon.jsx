const paths = {
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 6-7" /></>,
  close: <><path d="m5 5 14 14M19 5 5 19" /></>,
  document: <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
}

export default function BillingIcon({ name, size = 20 }) {
  return <svg className={`billing-icon billing-icon--${name}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
