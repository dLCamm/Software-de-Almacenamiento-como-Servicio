import { useEffect, useMemo, useState } from 'react'

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.results)) return value.results
  return []
}

function errorMessage(error) {
  return error?.message || 'No se pudo completar la operación.'
}

function normalizeCard(card) {
  return {
    card_number: card.number.replace(/\s/g, ''),
    expiry: card.expiry,
    cvv: card.cvv,
  }
}

function validateCard(card) {
  const digits = card.number.replace(/\D/g, '')
  if (digits.length !== 16) return 'Ingresa los 16 dígitos de la tarjeta.'
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return 'Usa el formato MM/AA para la fecha de vencimiento.'
  if (!/^\d{3,4}$/.test(card.cvv)) return 'El CVV debe tener 3 o 4 dígitos.'
  return ''
}

/**
 * Orquesta el flujo de facturación usando adaptadores inyectados por la página.
 * Las dependencias tienen que exponer los métodos de billingApi, accountApi y storageApi.
 */
export default function useBilling({ billingApi, accountApi, storageApi }) {
  const [plans, setPlans] = useState([])
  const [history, setHistory] = useState([])
  const [profile, setProfile] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('CARD')
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' })
  const [lastFour, setLastFour] = useState('')
  const [paymentResult, setPaymentResult] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    async function loadBillingData() {
      setLoading(true)
      const results = await Promise.allSettled([
        billingApi.listPlans(),
        accountApi.getProfile(),
        storageApi.getStorageUsage(),
        billingApi.getPaymentHistory(),
      ])

      if (!active) return
      const failures = []
      const [plansResult, profileResult, usageResult, historyResult] = results

      if (plansResult.status === 'fulfilled') setPlans(toArray(plansResult.value))
      else failures.push(errorMessage(plansResult.reason))

      if (profileResult.status === 'fulfilled') {
        const nextProfile = profileResult.value
        setProfile(nextProfile)
        const planCode = nextProfile?.plan?.code?.toLowerCase()
        const currentPlan = toArray(plansResult.status === 'fulfilled' ? plansResult.value : [])
          .find((plan) => plan.slug?.toLowerCase() === planCode)
        if (currentPlan) setSelectedPlanId(currentPlan.id)
      } else failures.push(errorMessage(profileResult.reason))

      if (usageResult.status === 'fulfilled') setUsage(usageResult.value)
      else failures.push(errorMessage(usageResult.reason))

      if (historyResult.status === 'fulfilled') setHistory(toArray(historyResult.value))
      else failures.push(errorMessage(historyResult.reason))

      setError(failures.join(' '))
      setLoading(false)
    }

    loadBillingData()
    return () => { active = false }
  }, [accountApi, billingApi, refreshKey, storageApi])

  const currentPlan = useMemo(() => {
    const code = profile?.plan?.code?.toLowerCase()
    return plans.find((plan) => plan.slug?.toLowerCase() === code) ?? null
  }, [plans, profile])
  const selectedPlan = useMemo(() => plans.find((plan) => String(plan.id) === String(selectedPlanId)) ?? null, [plans, selectedPlanId])
  const isRenewal = Boolean(selectedPlan && currentPlan && selectedPlan.id === currentPlan.id && currentPlan.slug !== 'free')
  const nextBillingDate = paymentResult?.new_end_date || paymentResult?.end_date || profile?.subscription?.end_date || profile?.subscription_end_date || null

  function selectPlan(plan) {
    setSelectedPlanId(plan.id)
    setError('')
  }

  function startCheckout() {
    if (!selectedPlan) {
      setError('Selecciona un plan antes de continuar.')
      setActiveTab('plans')
      return
    }
    openCheckout()
  }

  // Botón "Contratar" de cada tarjeta: selecciona el plan y abre el pago en un solo paso.
  function contractPlan(plan) {
    setSelectedPlanId(plan.id)
    openCheckout()
  }

  function openCheckout() {
    setError('')
    setNotice('')
    setPaymentResult(null)
    setCard({ number: '', expiry: '', cvv: '' })
    setLastFour('')
    setPaymentMethod('CARD')
    setCheckoutStep(1)
    setActiveTab('payment')
  }

  function choosePaymentMethod(method) {
    setPaymentMethod(method)
    setError('')
  }

  function updateCard(field, value) {
    setCard((current) => ({ ...current, [field]: value }))
  }

  function continueCheckout(event) {
    event?.preventDefault()
    if (checkoutStep === 1) {
      if (paymentMethod !== 'CARD') {
        setError('La API de facturación disponible solo procesa pagos con tarjeta por ahora.')
        return
      }
      setCheckoutStep(2)
      setError('')
      return
    }
    const validationError = validateCard(card)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setCheckoutStep(3)
  }

  function previousCheckoutStep() {
    setError('')
    setCheckoutStep((step) => Math.max(1, step - 1))
  }

  async function confirmPayment() {
    if (!selectedPlan) return
    const validationError = validateCard(card)
    if (validationError) {
      setError(validationError)
      setCheckoutStep(2)
      return
    }

    setLoading(true)
    setError('')
    try {
      const lastDigits = card.number.replace(/\D/g, '').slice(-4)
      const payload = normalizeCard(card)
      const result = isRenewal
        ? await billingApi.renewPlan(payload)
        : await billingApi.changePlan(selectedPlan.id, payload)
      setPaymentResult(result)
      setLastFour(lastDigits)
      setCard({ number: '', expiry: '', cvv: '' })
      setNotice(result.detail || 'La operación se completó correctamente.')
      setCheckoutStep(4)
      setRefreshKey((key) => key + 1)
    } catch (paymentError) {
      setError(errorMessage(paymentError))
    } finally {
      setLoading(false)
    }
  }

  function resetCheckout() {
    setCheckoutStep(1)
    setPaymentResult(null)
    setCard({ number: '', expiry: '', cvv: '' })
    setLastFour('')
    setPaymentMethod('CARD')
    setActiveTab('summary')
    setNotice('')
  }

  function dismissMessages() {
    setError('')
    setNotice('')
  }

  return {
    plans,
    history,
    profile,
    usage,
    loading,
    error,
    notice,
    dismissMessages,
    activeTab,
    setActiveTab,
    currentPlan,
    selectedPlan,
    selectedPlanId,
    selectPlan,
    isRenewal,
    nextBillingDate,
    checkoutStep,
    paymentMethod,
    choosePaymentMethod,
    card,
    updateCard,
    lastFour,
    paymentResult,
    startCheckout,
    contractPlan,
    continueCheckout,
    previousCheckoutStep,
    confirmPayment,
    resetCheckout,
  }
}
