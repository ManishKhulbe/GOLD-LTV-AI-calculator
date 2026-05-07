import { useEffect, useState } from 'react'
import GoldLoanWorkspace from './components/GoldLoanWorkspace'

const initialForm = {
  carat: '',
  goldType: '',
  emiratesId: '',
  goldWeight: '',
  loanTenure: '',
  jobProfession: '',
}

const BACKEND_BASE_URL = 'http://127.0.0.1:8001'

const formatAed = (value) =>
  value != null ? `AED ${Number(value).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const HEADER_TABS = ['Wealth Management', 'Gold Loans', 'Treasury', 'Institutional']

function App() {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [liveGoldRates, setLiveGoldRates] = useState({})
  const [liveGoldCurrency, setLiveGoldCurrency] = useState('AED')
  const [liveGoldUnit, setLiveGoldUnit] = useState('g')
  const [todayLoanScore, setTodayLoanScore] = useState(null)
  const [isRateLoading, setIsRateLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState('calculator')
  const [valuationResult, setValuationResult] = useState(null)

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleReset = () => {
    setForm(initialForm)
    setStatusMessage('Form has been reset.')
  }

  const submitValuation = async (formData) => {
    const response = await fetch(`${BACKEND_BASE_URL}/loan/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emirates_id: formData.emiratesId,
        carat: formData.carat,
        gold_type: formData.goldType,
        gold_weight_grams: parseFloat(formData.goldWeight),
        tenure_months: parseInt(formData.loanTenure, 10),
        job_profession: formData.jobProfession,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to calculate valuation.')
    }

    return response.json()
  }

  const handleCalculate = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatusMessage('Calculating gold loan value...')

    try {
      const result = await submitValuation(form)
      setValuationResult(result)
      setStatusMessage('Valuation calculated successfully.')
      setActiveScreen('summary')
    } catch (error) {
      setStatusMessage(`${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const fetchLiveGoldRate = async () => {
      setIsRateLoading(true)
      try {
        const [liveRateResponse, scoreResponse] = await Promise.all([
          fetch(`${BACKEND_BASE_URL}/api/gold-rate/live`),
          fetch(`${BACKEND_BASE_URL}/api/gold-loan-score/today`),
        ])
        if (!liveRateResponse.ok) throw new Error('Failed to fetch live gold rate.')
        if (!scoreResponse.ok) throw new Error('Failed to fetch today loan score.')

        const [rateData, scoreData] = await Promise.all([
          liveRateResponse.json(),
          scoreResponse.json(),
        ])
        setLiveGoldRates(rateData.karats ?? {})
        setLiveGoldCurrency(rateData.currency ?? 'AED')
        setLiveGoldUnit(rateData.unit ?? 'g')
        setTodayLoanScore(scoreData)
      } catch (error) {
        setStatusMessage(error.message)
      } finally {
        setIsRateLoading(false)
      }
    }

    fetchLiveGoldRate()
  }, [])

  return (
    <main className="min-h-screen bg-[#f3f4f6] p-4 md:p-6">
      <header className="rounded-2xl border border-[#d9dce1] bg-white px-6 py-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f9fafb] text-xs font-bold text-[#111827]">
              FH
            </div>
            <p className="text-[30px] font-semibold tracking-[-0.02em] text-[#111827]">Finance House</p>
          </div>
          <nav className="flex items-end gap-10">
            {HEADER_TABS.map((tab) => {
              const isActive = tab === 'Gold Loans'
              return (
                <button
                  key={tab}
                  type="button"
                  className={`relative pb-2 text-sm font-medium transition-colors ${isActive ? 'text-[#8d7440]' : 'text-[#707580] hover:text-[#1f2937]'}`}
                >
                  {tab}
                  {isActive ? (
                    <span className="absolute inset-x-0 -bottom-[1px] mx-auto h-[2px] w-full rounded-full bg-[#c8aa6f]" />
                  ) : null}
                </button>
              )
            })}
          </nav>
          <div className="flex items-center gap-3 text-[#4b5563]">
            <button type="button" className="rounded-full p-2 transition hover:bg-[#f3f4f6]" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
            </button>
            <button type="button" className="rounded-full p-2 transition hover:bg-[#f3f4f6]" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 1 1-3.6 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 1 1 0-3.6h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 1 1 3.6 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.8 1.8 0 1 1 0 3.6h-.2a1 1 0 0 0-.9.6Z" />
              </svg>
            </button>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#d1d5db] bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] text-[11px] font-semibold text-[#1e3a8a]">
              Exe
            </div>
          </div>
        </div>
      </header>

      {activeScreen === 'calculator' ? (
        <CalculatorScreen
          form={form}
          handleChange={handleChange}
          handleCalculate={handleCalculate}
          handleReset={handleReset}
          isSubmitting={isSubmitting}
          statusMessage={statusMessage}
          isRateLoading={isRateLoading}
          liveGoldRates={liveGoldRates}
          liveGoldCurrency={liveGoldCurrency}
          liveGoldUnit={liveGoldUnit}
          todayLoanScore={todayLoanScore}
        />
      ) : (
        <SummaryScreen setActiveScreen={setActiveScreen} valuationResult={valuationResult} />
      )}
    </main>
  )
}

function CalculatorScreen({
  form,
  handleChange,
  handleCalculate,
  handleReset,
  isSubmitting,
  statusMessage,
  isRateLoading,
  liveGoldRates,
  liveGoldCurrency,
  liveGoldUnit,
  todayLoanScore,
}) {
  return (
    <GoldLoanWorkspace
      form={form}
      handleChange={handleChange}
      handleCalculate={handleCalculate}
      handleReset={handleReset}
      isSubmitting={isSubmitting}
      statusMessage={statusMessage}
      isRateLoading={isRateLoading}
      liveGoldRates={liveGoldRates}
      liveGoldCurrency={liveGoldCurrency}
      liveGoldUnit={liveGoldUnit}
      todayLoanScore={todayLoanScore}
    />
  )
}

function SummaryScreen({ setActiveScreen, valuationResult }) {
  const r = valuationResult ?? {}
  const customer = r.customer_profile ?? {}
  const history = r.loan_history ?? {}
  const gold = r.gold_insights ?? {}
  const risk = r.risk_insights ?? {}
  const loanItems = history.loan_items ?? []

  const [emiMode, setEmiMode] = useState('monthly')
  const [emiMonths, setEmiMonths] = useState(String(r.suggested_tenure_months ?? 12))
  const [emiRate, setEmiRate] = useState('')

  const principal = r.eligible_loan_amount_aed ?? 0
  const parsedRate = parseFloat(emiRate)
  const parsedMonths = parseInt(emiMonths, 10)

  const emiResult = (() => {
    if (!principal || !parsedRate || parsedRate <= 0 || !parsedMonths) return null
    const monthlyRate = parsedRate / 100 / 12
    if (emiMode === 'monthly') {
      if (monthlyRate === 0) return principal / parsedMonths
      return principal * monthlyRate * Math.pow(1 + monthlyRate, parsedMonths) / (Math.pow(1 + monthlyRate, parsedMonths) - 1)
    } else {
      return principal * (1 + (parsedRate / 100) * (parsedMonths / 12))
    }
  })()

  const amortizationSchedule = (() => {
    if (emiMode !== 'monthly' || !emiResult || !principal || !parsedMonths) return []
    const monthlyRate = parsedRate / 100 / 12
    const schedule = []
    let balance = principal
    for (let m = 1; m <= parsedMonths; m++) {
      const interest = balance * monthlyRate
      const principalPaid = emiResult - interest
      balance = Math.max(balance - principalPaid, 0)
      schedule.push({ month: m, emi: emiResult, interest, principalPaid, balance })
    }
    return schedule
  })()


  const riskLabel = risk.user_risk_label ?? 'N/A'
  const riskBadgeColor =
    riskLabel === 'LOW' ? 'text-[#9bd6ac]' : riskLabel === 'MEDIUM' ? 'text-[#f6dd92]' : 'text-[#f6a692]'
  const summaryKaratRates = r.live_gold_rates ?? {}
  const summaryCurrency = r.live_gold_currency ?? 'AED'

  return (
    <section className="px-6 pb-10 pt-6">
      <h1 className="text-lg font-semibold text-[#4b5563]">Gold Loan Eligibility Summary</h1>
      <p className="mt-1 text-xs text-[#8a919f]">
        Review collateral valuation and applicant risk profile for final approval.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_290px]">
        <div className="flex h-[580px] flex-col rounded-xl border border-[#1f2d4a] bg-[radial-gradient(circle_at_top,#0b1c42,#02091a_60%)] p-4 text-white shadow-[inset_0_0_40px_rgba(65,105,225,0.12)]">
          <div className="flex items-start justify-between">
            <span className={`rounded-full border border-[#2d3f60] bg-[#0c1f3a] px-3 py-1 text-[11px] font-semibold ${riskBadgeColor}`}>
              ● {riskLabel} Category
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3a4b67] bg-[#212738]/80 text-xl">
              ◈
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4">
            <div>
              <p className="text-[20px] font-semibold tracking-wide text-[#ecd39f]">RECOMMENDED LTV</p>
              <div className="mt-1 flex items-end gap-3">
                <p className="text-[86px] font-bold leading-[0.9] text-[#f2cf84]">
                  {r.recommended_ltv_pct != null ? `${Math.round(r.recommended_ltv_pct)}%` : '--%'}
                </p>
                <p className="pb-2 text-[80px] leading-[0.8] text-[#f2cf84]">Max</p>
              </div>
            </div>

            <div className="w-[178px] rounded-xl border border-[#243149] bg-[#0e1c33]/90 px-4 py-3">
              <p className="text-center text-[13px] text-[#c0cade]">SIMAH Score</p>
              <CibilGauge score={r.cibil_score ?? 780} label={r.cibil_label ?? 'Excellent'} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricChip label="Gold Valuation" value={formatAed(r.gold_valuation_aed)} />
            <MetricChip label="Eligible Loan Amount" value={formatAed(r.eligible_loan_amount_aed)} />
          </div>
          {r.future_eligible_loan_amount_aed != null && r.eligible_loan_amount_aed != null && (() => {
            const delta = r.future_eligible_loan_amount_aed - r.eligible_loan_amount_aed
            const deltaPct = r.eligible_loan_amount_aed !== 0
              ? ((delta / r.eligible_loan_amount_aed) * 100).toFixed(1)
              : '0.0'
            const rising = delta >= 0
            return (
              <div className="mt-3 rounded-lg border border-dashed border-[#f2cf84]/40 bg-[#0f1f38] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-[#c8a84b]">Future-Adjusted Loan Estimate</p>
                    <p className="mt-1 text-lg font-semibold text-[#f2cf84]">{formatAed(r.future_eligible_loan_amount_aed)}</p>
                    <p className="mt-0.5 text-[10px] text-[#6b839f]">
                      Based on predicted gold price at {r.suggested_tenure_months}-month tenure end
                    </p>
                  </div>
                  <div className={`flex shrink-0 flex-col items-end gap-0.5 rounded-md px-2 py-1 ${rising ? 'bg-[#0e3a20]' : 'bg-[#3a0e0e]'}`}>
                    <span className={`text-base font-bold leading-none ${rising ? 'text-[#5ece7d]' : 'text-[#f87171]'}`}>
                      {rising ? '▲' : '▼'}
                    </span>
                    <span className={`text-xs font-semibold ${rising ? 'text-[#5ece7d]' : 'text-[#f87171]'}`}>
                      {rising ? '+' : ''}{deltaPct}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        <div className="flex h-[580px] flex-col overflow-y-auto rounded-xl border border-[#d8dce3] bg-white p-3">
          <div className="space-y-2 text-sm text-[#4b5563]">
            <p className="flex justify-between">
              <span>Recommended Amount</span>
              <span className="font-semibold">{formatAed(r.eligible_loan_amount_aed)}</span>
            </p>
            <p className="flex justify-between">
              <span>Suggested Tenure</span>
              <span className="font-semibold">
                {r.suggested_tenure_months != null ? `${r.suggested_tenure_months} Months` : '—'}
              </span>
            </p>
          </div>
          <div className="mt-4 border-t border-[#e5e7eb] pt-3">
            <p className="mb-2 text-xs font-semibold text-[#4b5563]">EMI Calculator</p>
            <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setEmiMode('monthly')}
                className={`flex-1 py-1.5 transition-colors ${emiMode === 'monthly' ? 'bg-[#071c44] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f9fafb]'}`}
              >
                Monthly EMI
              </button>
              <button
                type="button"
                onClick={() => setEmiMode('upfront')}
                className={`flex-1 py-1.5 transition-colors ${emiMode === 'upfront' ? 'bg-[#071c44] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f9fafb]'}`}
              >
                Bullet Payment
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-[#9aa1af]">Months</label>
                <select
                  value={emiMonths}
                  onChange={(e) => setEmiMonths(e.target.value)}
                  className="w-full rounded-md border border-[#d3d8e0] px-2 py-1.5 text-xs text-[#374151] focus:border-[#071c44] focus:outline-none"
                >
                  {[3, 6, 12, 18, 24, 36, 48].map((m) => (
                    <option key={m} value={m}>{m} Months</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-[#9aa1af]">Annual Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 12"
                  value={emiRate}
                  onChange={(e) => setEmiRate(e.target.value)}
                  className="w-full rounded-md border border-[#d3d8e0] px-2 py-1.5 text-xs text-[#374151] focus:border-[#071c44] focus:outline-none"
                />
              </div>
            </div>
            <div className={`mt-2 rounded-lg p-2.5 ${emiResult != null ? 'bg-[#f0f4ff] border border-[#c7d4f5]' : 'bg-[#f9fafb] border border-[#e5e7eb]'}`}>
              {emiResult != null ? (
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-[#6b7280]">
                    {emiMode === 'monthly' ? `Monthly EMI · ${emiMonths} payments` : `Bullet Payment · due at ${emiMonths}-month end`}
                  </p>
                  <p className="text-sm font-bold text-[#071c44]">{formatAed(emiResult)}</p>
                </div>
              ) : (
                <p className="text-center text-[10px] text-[#9aa1af]">Enter rate to calculate</p>
              )}
            </div>

            {emiMode === 'monthly' && amortizationSchedule.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9aa1af]">Repayment Schedule</p>
                <div className="max-h-[220px] overflow-y-auto rounded-md border border-[#e5e7eb]">
                  <table className="w-full text-[10px]">
                    <thead className="sticky top-0 bg-[#f3f4f6] text-[#6b7280]">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold">Mo.</th>
                        <th className="px-2 py-1.5 text-right font-semibold">EMI</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Principal</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Interest</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amortizationSchedule.map((row) => (
                        <tr key={row.month} className="border-t border-[#f0f0f0] even:bg-[#fafafa]">
                          <td className="px-2 py-1.5 text-[#374151]">{row.month}</td>
                          <td className="px-2 py-1.5 text-right text-[#374151]">{row.emi.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right font-medium text-[#16a34a]">{row.principalPaid.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right text-[#dc2626]">{row.interest.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right text-[#374151]">{row.balance.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[9px] text-[#9aa1af]">Principal (green) ↑ each month · Interest (red) ↓ each month · All values in AED</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveScreen('calculator')}
            className="mt-2 w-full rounded-md border border-[#d3d8e0] bg-white py-2 text-sm text-[#566071]"
          >
            Back to Calculator
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e1e4ea] bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#4b5563]">Customer Profile</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">
            {[
              ['Customer Name', customer.customer_name ?? '—'],
              ['Arabic Name', customer.full_name_ar ?? '—'],
              ['Emirates ID', customer.emirates_id ?? '—'],
              ['Nationality', customer.nationality ?? '—'],
              ['Nationality (AR)', customer.nationality_ar ?? '—'],
              ['Mobile', customer.mobile ?? '—'],
              ['Email', customer.email ?? '—'],
              ['Gender', customer.gender ?? '—'],
              ['Customer Type', customer.customer_type ?? '—'],
              ['Risk Category', customer.risk_category ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-[#9aa1af]">{label}</p>
                <p className="text-sm font-medium text-[#374151]">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <InfoCard
          title="Loan History Overview"
          rows={[
            ['Total Previous', history.total_previous ?? '—'],
            ['Active Loans', history.active_loans ?? '—'],
            ['Closed Loans', history.closed_loans ?? '—'],
            ['Missed EMIs', history.missed_emis ?? '—'],
            ['Outstanding Balance', formatAed(history.outstanding_balance)],
          ]}
        />
      </div>

      <PredictedLtvGoldTrendChart goldInsights={gold} />

      <div className="mt-4 rounded-xl border border-[#1d2b46] bg-[linear-gradient(135deg,#071430,#04101f)] p-4 text-white">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <div className="rounded-lg border border-[#22314a] bg-[#0a1830] p-3">
              <p className="text-xs text-[#9db0d1]">Current Gold Price</p>
              <p className="mt-2 text-2xl font-semibold text-[#8ae89f]">
                {summaryKaratRates['24K']
                  ? `${summaryCurrency} ${Number(summaryKaratRates['24K']).toFixed(2)}/g`
                  : '—'}
              </p>
              <div className="mt-2 space-y-1 text-xs text-[#d6def0]">
                {['18K', '20K', '21K', '22K', '24K'].map((karat) => (
                  <p key={karat} className="flex items-center justify-between">
                    <span>{karat}</span>
                    <span>
                      {summaryKaratRates[karat] != null
                        ? `${Number(summaryKaratRates[karat]).toFixed(2)} ${summaryCurrency}/g`
                        : '--.--'}
                    </span>
                  </p>
                ))}
              </div>
              {gold.trend ? (
                <p className="mt-1 text-xs text-[#9db0d1]">
                  Trend: {gold.trend}
                  {gold.predicted_change_pct != null
                    ? ` (${gold.predicted_change_pct > 0 ? '+' : ''}${gold.predicted_change_pct.toFixed(1)}% over tenure)`
                    : ''}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-[#22314a] bg-[#0a1830] p-3 space-y-4">
              <HorizontalRiskBar
                title="User Risk"
                score={risk.user_risk_score}
                label={risk.user_risk_label}
              />
              <div className="border-t border-[#1b2a43]" />
              <HorizontalRiskBar
                title="Company Risk"
                score={risk.company_risk_score}
                label={risk.company_risk_label}
                exposure={risk.company_risk_exposure}
              />
            </div>
          </div>
          <div className="rounded-lg border border-[#22314a] bg-[#0a1830] p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#9db0d1]">Loan History</p>
            {loanItems.length > 0 ? (
              <div className="space-y-2">
                {loanItems.map((row) => {
                  const statusColor =
                    row.status === 'ACTIVE'    ? 'bg-[#0e3a20] text-[#5ece7d] ring-1 ring-[#5ece7d]/30' :
                    row.status === 'DEFAULTED' ? 'bg-[#3a0e0e] text-[#f87171] ring-1 ring-[#f87171]/30' :
                                                 'bg-[#1b2a43] text-[#9fb0c7] ring-1 ring-[#9fb0c7]/20'
                  return (
                    <div key={row.loan_id} className="flex items-center justify-between rounded-md border border-[#1b2a43] bg-[#071224] px-3 py-2.5 hover:border-[#2d4060] transition-colors">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#dce8ff]">{row.loan_id}</p>
                        <p className="mt-0.5 text-[10px] text-[#6b839f]">{row.tenure_months} Months · {row.missed_emis} missed EMI{row.missed_emis !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusColor}`}>
                          {row.status}
                        </span>
                        <p className="text-[10px] font-medium text-[#c8d8ef]">{formatAed(row.amount)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <svg className="mb-3 opacity-30" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9db0d1" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                <p className="text-sm font-medium text-[#4a607a]">No prior loans</p>
                <p className="mt-1 text-xs text-[#354f6a]">This customer has no loan history on record</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function PredictedLtvGoldTrendChart({ goldInsights = {} }) {
  const historicalRaw = goldInsights.historical_prices ?? []
  const predictedRaw = goldInsights.predicted_prices ?? []
  const livePrice = goldInsights.live_price_aed_per_gram ?? null

  const fmtLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleString('en', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2)
  }

  const histPoints = historicalRaw.map((p) => ({
    label: fmtLabel(p.date),
    date: p.date,
    price: p.price_aed_per_gram,
    type: 'historical',
  }))

  const nowLabel = (() => {
    const d = new Date()
    return d.toLocaleString('en', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2)
  })()

  const currentPoint = livePrice != null
    ? [{ label: nowLabel, price: livePrice, type: 'current' }]
    : []

  const predPoints = predictedRaw.map((p) => ({
    label: fmtLabel(p.date),
    price: p.price_aed_per_gram,
    type: 'predicted',
  }))

  const allPoints = [...histPoints, ...currentPoint, ...predPoints]

  const currentIdx = allPoints.findIndex((p) => p.type === 'current')
  const defaultHover = currentIdx >= 0 ? currentIdx : Math.max(0, allPoints.length - 1)
  const [hoverIndex, setHoverIndex] = useState(defaultHover)

  const width = 920
  const height = 270
  const pad = { top: 24, right: 24, bottom: 52, left: 72 }
  const gW = width - pad.left - pad.right
  const gH = height - pad.top - pad.bottom

  if (allPoints.length < 2) {
    return (
      <div className="mt-4 rounded-xl border border-[#1d2b46] bg-[linear-gradient(135deg,#071430,#04101f)] p-4">
        <p className="text-sm font-semibold text-[#dce8ff]">Gold Price — Historical &amp; Forecast</p>
        <p className="mt-6 text-center text-xs text-[#9fb0c7]">No chart data available</p>
      </div>
    )
  }

  const prices = allPoints.map((p) => p.price)
  const minY = Math.min(...prices) * 0.975
  const maxY = Math.max(...prices) * 1.025

  const xPos = (i) => pad.left + (i / (allPoints.length - 1)) * gW
  const yPos = (val) => pad.top + ((maxY - val) / (maxY - minY)) * gH

  const histEndIdx = currentIdx >= 0 ? currentIdx : histPoints.length - 1
  const predStartIdx = currentIdx >= 0 ? currentIdx : histPoints.length

  const histPath = allPoints
    .slice(0, histEndIdx + 1)
    .map((p, i) => `${xPos(i)},${yPos(p.price)}`)
    .join(' ')

  const predPath = allPoints
    .slice(predStartIdx)
    .map((p, i) => `${xPos(predStartIdx + i)},${yPos(p.price)}`)
    .join(' ')

  const hovered = allPoints[hoverIndex] ?? allPoints[0]

  // Historical points are already monthly — every point gets a label
  const monthBoundaries = histPoints.map((_, idx) => idx)

  // Predicted: every point already monthly, thin if many
  const predShowEvery = predPoints.length > 18 ? 3 : predPoints.length > 9 ? 2 : 1

  return (
    <div className="mt-4 rounded-xl border border-[#1d2b46] bg-[linear-gradient(135deg,#071430,#04101f)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[#dce8ff]">Gold Price — Historical &amp; Forecast</p>
          <div className="mt-1.5 flex items-center gap-5 text-[11px] text-[#9fb0c7]">
            <span className="flex items-center gap-1.5">
              <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#7aa3d4" strokeWidth="2.5" /></svg>
              Historical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#5ece7d] ring-2 ring-[#5ece7d]/30" />
              Current
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#f2cf84" strokeWidth="2.5" strokeDasharray="5,3" /></svg>
              Forecast
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-[#9fb0c7]">
          <p className="font-semibold text-[#dce8ff]">
            {hovered.type === 'historical' && hovered.date ? hovered.date : hovered.label}
          </p>
          <p>AED {hovered.price.toFixed(2)}/g</p>
          {hovered.type === 'predicted' && <p className="text-[10px] text-[#f2cf84]">Forecast</p>}
          {hovered.type === 'current' && <p className="text-[10px] text-[#5ece7d]">Live Price</p>}
          {hovered.type === 'historical' && <p className="text-[10px] text-[#7aa3d4]">Historical</p>}
        </div>
      </div>

      <div className="mt-3 w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px]">
          {/* Y-axis grid + labels */}
          {[0, 1, 2, 3, 4].map((tick) => {
            const val = maxY - ((maxY - minY) / 4) * tick
            const yp = yPos(val)
            return (
              <g key={tick}>
                <line x1={pad.left} y1={yp} x2={width - pad.right} y2={yp} stroke="#1e3354" strokeDasharray="4,4" />
                <text x={pad.left - 8} y={yp + 4} fontSize="10" fill="#8ea5c7" textAnchor="end">
                  {val.toFixed(0)}
                </text>
              </g>
            )
          })}

          {/* Y-axis label */}
          <text x={-(height / 2)} y={14} transform="rotate(-90)" textAnchor="middle" fontSize="10" fill="#9fb0c7">
            AED / gram
          </text>

          {/* Forecast shaded region */}
          {predPoints.length > 0 && currentIdx >= 0 && (
            <rect
              x={xPos(predStartIdx)}
              y={pad.top}
              width={xPos(allPoints.length - 1) - xPos(predStartIdx)}
              height={gH}
              fill="#f2cf840a"
            />
          )}

          {/* Vertical "now" marker */}
          {currentIdx >= 0 && (
            <>
              <line
                x1={xPos(currentIdx)} y1={pad.top}
                x2={xPos(currentIdx)} y2={height - pad.bottom}
                stroke="#5ece7d" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.55"
              />
              <text x={xPos(currentIdx)} y={pad.top - 6} textAnchor="middle" fontSize="9" fill="#5ece7d" fontWeight="600">
                NOW
              </text>
            </>
          )}

          {/* Historical polyline */}
          {histPoints.length > 0 && (
            <polyline points={histPath} fill="none" stroke="#7aa3d4" strokeWidth="2.5" strokeLinejoin="round" />
          )}

          {/* Historical dots (one per month) */}
          {histPoints.map((p, idx) => (
            <circle
              key={`hdot-${idx}`}
              cx={xPos(idx)} cy={yPos(p.price)}
              r={hoverIndex === idx ? 5 : 3.5}
              fill="#7aa3d4"
              stroke={hoverIndex === idx ? '#ffffff' : '#071430'}
              strokeWidth="1.5"
            />
          ))}

          {/* Forecast polyline */}
          {predPoints.length > 0 && (
            <polyline points={predPath} fill="none" stroke="#f2cf84" strokeWidth="2.5" strokeDasharray="7,4" strokeLinejoin="round" />
          )}

          {/* Historical: invisible wide hit-area strips per day for hover */}
          {histPoints.map((_p, idx) => (
            <rect
              key={idx}
              x={xPos(idx) - (gW / (allPoints.length - 1)) / 2}
              y={pad.top}
              width={gW / (allPoints.length - 1)}
              height={gH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(idx)}
              className="cursor-crosshair"
            />
          ))}

          {/* Hover crosshair on historical */}
          {hoverIndex < histPoints.length && histPoints.length > 0 && (
            <line
              x1={xPos(hoverIndex)} y1={pad.top}
              x2={xPos(hoverIndex)} y2={height - pad.bottom}
              stroke="#7aa3d4" strokeWidth="1" opacity="0.4"
            />
          )}

          {/* Current + predicted dots (not dense — render all) */}
          {allPoints.map((p, idx) => {
            if (p.type === 'historical') return null
            const isCurrent = p.type === 'current'
            const isHovered = hoverIndex === idx
            const r = isCurrent ? 6 : isHovered ? 5 : 3.5
            const fill = isCurrent ? '#5ece7d' : '#f2cf84'
            return (
              <circle
                key={idx}
                cx={xPos(idx)} cy={yPos(p.price)}
                r={r}
                fill={fill}
                stroke={isCurrent ? '#e0fff0' : isHovered ? '#ffffff' : 'none'}
                strokeWidth={isCurrent ? 2 : isHovered ? 1 : 0}
                onMouseEnter={() => setHoverIndex(idx)}
                className="cursor-pointer"
              />
            )
          })}

          {/* X-axis: month boundaries for historical */}
          {monthBoundaries.map((idx) => (
            <g key={idx}>
              <line
                x1={xPos(idx)} y1={height - pad.bottom}
                x2={xPos(idx)} y2={height - pad.bottom + 4}
                stroke="#3a4f6a" strokeWidth="1"
              />
              <text
                x={xPos(idx)} y={height - 8}
                textAnchor="middle" fontSize="9" fill="#9fb0c7"
              >
                {allPoints[idx].label}
              </text>
            </g>
          ))}

          {/* X-axis: current label */}
          {currentIdx >= 0 && (
            <text
              x={xPos(currentIdx)} y={height - 8}
              textAnchor="middle" fontSize="9" fill="#5ece7d" fontWeight="700"
            >
              {allPoints[currentIdx].label}
            </text>
          )}

          {/* X-axis: predicted labels (monthly, thinned) */}
          {allPoints.map((p, idx) => {
            if (p.type !== 'predicted') return null
            const predIdx = idx - predStartIdx
            if (predIdx % predShowEvery !== 0) return null
            return (
              <text
                key={idx}
                x={xPos(idx)} y={height - 8}
                textAnchor="middle" fontSize="9" fill="#c8a84b"
              >
                {p.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function HorizontalRiskBar({ title, score, label, exposure }) {
  const clamped = Math.max(0, Math.min(100, Number(score ?? 0)))
  const fillColor =
    clamped <= 33 ? '#5ece7d' :
    clamped <= 66 ? '#f2cf84' : '#f87171'
  const trackColor =
    clamped <= 33 ? '#0e3a20' :
    clamped <= 66 ? '#3a2e0e' : '#3a0e0e'
  const labelColor =
    clamped <= 33 ? 'text-[#5ece7d]' :
    clamped <= 66 ? 'text-[#f2cf84]' : 'text-[#f87171]'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-[#9db0d1]">{title}</p>
        <span className={`text-[11px] font-semibold ${labelColor}`}>{label ?? '—'}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ background: trackColor }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clamped}%`, background: fillColor, boxShadow: `0 0 8px ${fillColor}55` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-[#4a607a]">Low Risk</span>
        <span className={`text-[11px] font-bold ${labelColor}`}>{clamped.toFixed(0)}<span className="text-[9px] font-normal text-[#4a607a]">/100</span></span>
        <span className="text-[10px] text-[#4a607a]">High Risk</span>
      </div>
      {exposure != null && (
        <p className="mt-1 text-[10px] text-[#6b839f]">Exposure: <span className="text-[#9db0d1]">{exposure}</span></p>
      )}
    </div>
  )
}


function CibilGauge({ score, label }) {
  return (
    <div className="mt-1">
      <svg viewBox="0 0 160 100" className="h-[92px] w-full">
        <defs>
          <linearGradient id="cibilArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef6c63" />
            <stop offset="50%" stopColor="#f2cf84" />
            <stop offset="100%" stopColor="#58c873" />
          </linearGradient>
        </defs>
        <path d="M 28 74 A 52 52 0 0 1 132 74" fill="none" stroke="url(#cibilArc)" strokeWidth="10" strokeLinecap="round" />
        <line x1="80" y1="74" x2="112" y2="45" stroke="#e6edf8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="80" cy="74" r="4.5" fill="#e6edf8" />
        <text x="80" y="71" textAnchor="middle" fontSize="20" fontWeight="700" fill="#e9eef8">
          {score}
        </text>
        <text x="80" y="93" textAnchor="middle" fontSize="7" fill="#f2cf84">
          {label}
        </text>
      </svg>
    </div>
  )
}

function InfoCard({ title, rows }) {
  return (
    <div className="rounded-xl border border-[#e1e4ea] bg-white p-4">
      <p className="text-sm font-semibold text-[#4b5563]">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] text-[#9aa1af]">{label}</p>
            <p className="text-sm font-medium text-[#374151]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricChip({ label, value }) {
  return (
    <div className="rounded-lg border border-[#22314a] bg-[#0f1f38] p-3">
      <p className="text-xs text-[#9eb2cd]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#ecf2ff]">{value}</p>
    </div>
  )
}

export default App
