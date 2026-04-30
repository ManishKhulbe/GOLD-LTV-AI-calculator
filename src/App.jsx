import { useEffect, useState } from 'react'

const initialForm = {
  carat: '',
  emiratesId: '',
  goldWeight: '',
  loanTenure: '',
  jobProfession: '',
}

const BACKEND_BASE_URL = 'http://127.0.0.1:8001'

const formatAed = (value) =>
  value != null ? `AED ${Number(value).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

function App() {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [liveGoldRates, setLiveGoldRates] = useState({})
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
        const response = await fetch(`${BACKEND_BASE_URL}/api/gold-rate/live`)
        if (!response.ok) throw new Error('Failed to fetch live gold rate.')
        const data = await response.json()
        setLiveGoldRates(data.karats ?? {})
      } catch (error) {
        setStatusMessage(error.message)
      } finally {
        setIsRateLoading(false)
      }
    }

    fetchLiveGoldRate()
  }, [])

  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
        <p className="text-sm font-semibold text-[#1f2937]">Finance House Dubai</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="text-[#6b7280] transition hover:text-[#111827]"
          >
            <span className="text-[15px]">◦</span>
          </button>
          <button type="button" aria-label="Settings" className="text-[#6b7280] transition hover:text-[#111827]">
            <span className="text-[15px]">⚙</span>
          </button>
          <div className="h-8 w-8 rounded-full bg-[linear-gradient(145deg,#0b1220,#f4d9a4)]" />
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
}) {
  return (
    <section className="px-6 pb-12 pt-8">
      <h1 className="text-[46px] font-semibold tracking-tight text-[#0f172a]">Gold Loan Valuation</h1>
      <p className="mt-2 text-[18px] text-[#6b7280]">Enter asset and client details to initiate valuation.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
        <form className="rounded-xl border border-[#e5e7eb] bg-white p-6" onSubmit={handleCalculate}>
          <h2 className="text-[36px] font-medium text-[#1f2937]">Valuation Details</h2>
          <div className="mt-4 border-t border-[#e5e7eb]" />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Carat">
              <SelectField value={form.carat} onChange={handleChange('carat')}>
                <option value="">Select Carat</option>
                <option value="14K">14K</option>
                <option value="18K">18K</option>
                <option value="21K">21K</option>
                <option value="22K">22K</option>
                <option value="24K">24K</option>
              </SelectField>
            </Field>

            <Field label="Emirates ID">
              <InputField
                value={form.emiratesId}
                onChange={handleChange('emiratesId')}
                placeholder="784-XXXX-XXXXXXX-X"
              />
            </Field>

            <Field label="Gold Weight">
              <InputField
                value={form.goldWeight}
                onChange={handleChange('goldWeight')}
                placeholder="0.00"
                suffix="grams"
                type="number"
              />
            </Field>

            <Field label="Loan Tenure">
              <SelectField value={form.loanTenure} onChange={handleChange('loanTenure')}>
                <option value="">Select Tenure</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="18">18 Months</option>
                <option value="24">24 Months</option>
                <option value="36">36 Months</option>
              </SelectField>
            </Field>

            <Field label="Job Profession">
              <SelectField value={form.jobProfession} onChange={handleChange('jobProfession')}>
                <option value="">Select Profession</option>
                <option value="Government Employee">Government Employee</option>
                <option value="Private Employee">Private Employee</option>
                <option value="Business Owner">Business Owner</option>
                <option value="Self Employed">Self Employed</option>
                <option value="Retired">Retired</option>
                <option value="Freelancer">Freelancer</option>
              </SelectField>
            </Field>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#0c2d5b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a264d]"
            >
              {isSubmitting ? 'Calculating...' : 'Calculate Gold Loan Value'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
            >
              Reset
            </button>
          </div>
          {statusMessage ? (
            <p className="mt-4 text-sm text-[#4b5563]" aria-live="polite">
              {statusMessage}
            </p>
          ) : null}
        </form>

        <aside className="h-fit rounded-xl border border-[#e5e7eb] bg-white p-5">
          <h3 className="text-[34px] font-medium text-[#1f2937]">System Information</h3>
          <div className="mt-4 border-t border-[#e5e7eb]" />

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">Live Gold Rate</p>
            <p className="mt-1 text-[42px] font-semibold text-[#111827]">
              {isRateLoading || !liveGoldRates['24K']
                ? 'SAR ---.--'
                : `SAR ${Number(liveGoldRates['24K']).toFixed(2)}`}{' '}
              /g
            </p>
            <div className="mt-3 space-y-1.5">
              {['24K', '22K', '21K', '20K', '18K', '16K', '14K', '10K'].map((karat) => (
                <p key={karat} className="flex items-center justify-between text-sm text-[#4b5563]">
                  <span>{karat}</span>
                  <span className="font-medium text-[#111827]">
                    {isRateLoading || !liveGoldRates[karat]
                      ? '--.--'
                      : Number(liveGoldRates[karat]).toFixed(2)}{' '}
                    SAR/g
                  </span>
                </p>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">System Status</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#16a34a]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
              Ready
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function SummaryScreen({ setActiveScreen, valuationResult }) {
  const r = valuationResult ?? {}
  const customer = r.customer_profile ?? {}
  const history = r.loan_history ?? {}
  const gold = r.gold_insights ?? {}
  const risk = r.risk_insights ?? {}
  const loanItems = history.loan_items ?? []

  const decisionColor =
    r.system_decision === 'Pre-Approved'
      ? 'bg-[#e8fff1] text-[#20a35a]'
      : r.system_decision === 'Manual Review'
        ? 'bg-[#fff8e8] text-[#b07d1e]'
        : 'bg-[#fff1f1] text-[#c02b2b]'

  const riskLabel = risk.user_risk_label ?? 'N/A'
  const riskBadgeColor =
    riskLabel === 'LOW' ? 'text-[#9bd6ac]' : riskLabel === 'MEDIUM' ? 'text-[#f6dd92]' : 'text-[#f6a692]'
  const summaryKaratRates = r.live_gold_rates ?? {}
  const summaryCurrency = r.live_gold_currency ?? 'SAR'

  return (
    <section className="px-6 pb-10 pt-6">
      <h1 className="text-lg font-semibold text-[#4b5563]">Gold Loan Eligibility Summary</h1>
      <p className="mt-1 text-xs text-[#8a919f]">
        Review collateral valuation and applicant risk profile for final approval.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_290px]">
        <div className="rounded-xl border border-[#1f2d4a] bg-[radial-gradient(circle_at_top,#0b1c42,#02091a_60%)] p-4 text-white shadow-[inset_0_0_40px_rgba(65,105,225,0.12)]">
          <div className="flex items-start justify-between">
            <span className={`rounded-full border border-[#2d3f60] bg-[#0c1f3a] px-3 py-1 text-[11px] font-semibold ${riskBadgeColor}`}>
              ● {riskLabel} Category
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#3a4b67] bg-[#212738]/80 text-xl">
              ◈
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
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
              <p className="text-center text-[13px] text-[#c0cade]">CIBIL Score</p>
              <CibilGauge score={r.cibil_score ?? 780} label={r.cibil_label ?? 'Excellent'} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricChip label="Gold Valuation" value={formatAed(r.gold_valuation_aed)} />
            <MetricChip label="Eligible Loan Amount" value={formatAed(r.eligible_loan_amount_aed)} />
          </div>
        </div>

        <div className="rounded-xl border border-[#d8dce3] bg-white p-3">
          <p className="text-sm font-semibold text-[#4b5563]">System Decision</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-[#8b95a7]">Recommendation</span>
            <span className={`rounded-md px-2 py-1 text-[10px] ${decisionColor}`}>
              {r.system_decision ?? '—'}
            </span>
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#4b5563]">
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
          {r.remarks ? (
            <div className="mt-3 rounded-md border border-[#e5e7eb] bg-[#fbfbfc] p-2 text-xs text-[#7b8496]">
              {r.remarks}
            </div>
          ) : null}
          <button className="mt-3 w-full rounded-md bg-[#071c44] py-2 text-sm font-medium text-white">
            Proceed to Approval
          </button>
          <button className="mt-2 w-full rounded-md bg-[#f5d785] py-2 text-sm font-medium text-[#5a4a1e]">
            Review Manually
          </button>
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
            {customer.uaepass_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ff] px-2 py-0.5 text-[10px] font-semibold text-[#0070d8]">
                ✓ UAE PASS Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[10px] text-[#6b7280]">
                Local Profile
              </span>
            )}
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
            <div className="rounded-lg border border-[#22314a] bg-[#0a1830] p-3">
              <p className="text-xs text-[#9db0d1]">User Risk Factor</p>
              <RiskGauge
                score={risk.user_risk_score ?? 18}
                label={risk.user_risk_label ?? 'LOW RISK'}
                textColorClass={riskBadgeColor}
              />
              <p className="mt-1 text-xs text-[#9db0d1]">
                Company Exposure: {risk.company_risk_exposure ?? '—'}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#22314a] bg-[#0a1830] p-2">
            <table className="w-full text-left text-xs">
              <thead className="text-[#9fb0c7]">
                <tr>
                  <th className="px-2 py-2">Loan ID</th>
                  <th className="px-2 py-2">Tenure</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Missed EMIs</th>
                  <th className="px-2 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loanItems.length > 0 ? (
                  loanItems.map((row) => (
                    <tr key={row.loan_id} className="border-t border-[#1b2a43] text-[#e8edf7]">
                      <td className="px-2 py-2">{row.loan_id}</td>
                      <td className="px-2 py-2">{row.tenure_months} Mos</td>
                      <td className="px-2 py-2">{row.status}</td>
                      <td className="px-2 py-2">{row.missed_emis}</td>
                      <td className="px-2 py-2">{formatAed(row.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-[#1b2a43] text-[#e8edf7]">
                    <td colSpan={5} className="px-2 py-4 text-center text-[#9db0d1]">
                      No loan history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function PredictedLtvGoldTrendChart({ goldInsights = {} }) {
  const historicalRaw = goldInsights.historical_prices ?? []
  const predictedRaw = goldInsights.predicted_prices ?? []
  const livePrice = goldInsights.live_price_sar_per_gram ?? goldInsights.live_price_aed_per_gram ?? null

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
          <p>SAR {hovered.price.toFixed(2)}/g</p>
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
            SAR / gram
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
          {histPoints.map((p, idx) => (
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

function RiskGauge({ score, label, textColorClass }) {
  const clampedScore = Math.max(0, Math.min(100, Number(score)))
  const angle = -120 + (clampedScore / 100) * 240
  const radians = (angle * Math.PI) / 180
  const needleLength = 44
  const centerX = 90
  const centerY = 72
  const needleX = centerX + needleLength * Math.cos(radians)
  const needleY = centerY + needleLength * Math.sin(radians)
  const normalizedLabel = String(label).replace('_', ' ')

  return (
    <div className="mt-2">
      <svg viewBox="0 0 180 104" className="h-[84px] w-full">
        <defs>
          <linearGradient id="riskArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e56767" />
            <stop offset="50%" stopColor="#f2cf84" />
            <stop offset="100%" stopColor="#5ece7d" />
          </linearGradient>
        </defs>

        <path
          d="M 28 72 A 62 62 0 0 1 152 72"
          fill="none"
          stroke="url(#riskArc)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="#f8fafc"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="5.2" fill="#f8fafc" />
      </svg>
      <p className={`-mt-1 text-center text-sm font-semibold ${textColorClass}`}>{normalizedLabel}</p>
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[#6b7280]">{label}</span>
      {children}
    </label>
  )
}

function InputField({ value, onChange, placeholder, suffix, type = 'text' }) {
  return (
    <div className="flex h-12 items-center justify-between rounded-md border border-[#d1d5db] bg-white px-3">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-full w-full border-none bg-transparent text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
      />
      {suffix ? <span className="text-sm text-[#9ca3af]">{suffix}</span> : null}
    </div>
  )
}

function SelectField({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-12 w-full rounded-md border border-[#d1d5db] bg-white px-3 text-sm text-[#6b7280] outline-none"
    >
      {children}
    </select>
  )
}

export default App
