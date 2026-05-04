import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, Legend
} from 'recharts'

const API = 'http://localhost:8001'

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatSar(value) {
  if (value == null || isNaN(value)) return 'SAR —'
  return 'SAR ' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPct(v, decimals = 2) {
  if (v == null) return '—'
  const n = Number(v)
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%'
}

// ── Risk bar ───────────────────────────────────────────────────────────────────

function RiskBar({ score, label }) {
  const pct = Math.min(Math.max(score, 0), 100)
  const color = pct <= 25 ? '#22C55E' : pct <= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-[#7A8FB0]">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{pct.toFixed(0)} / 100</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#0B1628] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  )
}

// ── Decision badge ─────────────────────────────────────────────────────────────

function DecisionBadge({ decision }) {
  if (decision === 'Pre-Approved') return (
    <span className="badge-approved">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Pre-Approved
    </span>
  )
  if (decision === 'Rejected') return <span className="badge-rejected">✕ Rejected</span>
  return <span className="badge-review">⚠ Manual Review</span>
}

// ── Loan status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    CLOSED: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    DEFAULTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${map[status] || map.CLOSED}`}>
      {status}
    </span>
  )
}

// ── CIBIL badge ────────────────────────────────────────────────────────────────

function CibilBadge({ score, label }) {
  const color = score >= 720 ? '#22C55E' : score >= 640 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-extrabold" style={{ color }}>{score}</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
        style={{ color, borderColor: color + '50', background: color + '18' }}>
        {label}
      </span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CALCULATOR SCREEN
// ══════════════════════════════════════════════════════════════════════════════

function CalculatorScreen({ onResult }) {
  const [goldRates, setGoldRates] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [form, setForm] = useState({
    emirates_id: '',
    carat: '22K',
    gold_weight_grams: '',
    tenure_months: '12',
    job_profession: 'Government Employee',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    fetch(`${API}/api/gold-rate/live`)
      .then(r => r.json())
      .then(d => setGoldRates(d.karats))
      .catch(() => setGoldRates(null))
      .finally(() => setRatesLoading(false))
  }, [])

  function validate() {
    const e = {}
    if (!form.emirates_id) {
      e.emirates_id = 'Emirates ID is required'
    } else if (!/^784-\d{4}-\d{7}-\d$/.test(form.emirates_id)) {
      e.emirates_id = 'Format: 784-YYYY-XXXXXXX-C'
    }
    if (!form.gold_weight_grams || isNaN(form.gold_weight_grams) || Number(form.gold_weight_grams) <= 0) {
      e.gold_weight_grams = 'Enter a valid weight greater than 0'
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setApiError('')
    setLoading(true)
    try {
      const payload = {
        emirates_id: form.emirates_id,
        carat: form.carat,
        gold_weight_grams: Number(form.gold_weight_grams),
        tenure_months: Number(form.tenure_months),
        job_profession: form.job_profession,
      }
      const resp = await fetch(`${API}/loan/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) {
        if (resp.status === 404) setApiError('Customer not found. Please check the Emirates ID.')
        else if (resp.status === 422) setApiError('Invalid input: ' + (data.detail?.[0]?.msg || JSON.stringify(data.detail)))
        else setApiError(data.detail || 'An error occurred. Please try again.')
        return
      }
      onResult(data)
    } catch {
      setApiError('Could not connect to the server. Please ensure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const karatOptions = ['24K', '22K', '21K', '18K', '14K']
  const tenureOptions = [6, 12, 18, 24, 36]
  const professions = [
    'Government Employee', 'Private Employee', 'Business Owner',
    'Self Employed', 'Retired', 'Freelancer',
  ]

  return (
    <div className="min-h-screen bg-[#0B1628]">
      {/* Header */}
      <header className="border-b border-[#243556] bg-[#0B1628]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#E2C068] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0B1628]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-[#F0F4FF]">Finance House</span>
              <span className="text-xs text-[#7A8FB0] ml-2">Dubai</span>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <span className="text-[#C9A84C] font-semibold border-b-2 border-[#C9A84C] pb-0.5">Gold Valuation</span>
            <span className="text-[#7A8FB0] hover:text-[#F0F4FF] cursor-pointer transition-colors">Dashboard</span>
            <span className="text-[#7A8FB0] hover:text-[#F0F4FF] cursor-pointer transition-colors">Reports</span>
          </nav>
          <div className="flex items-center gap-2 bg-[#152038] border border-[#243556] rounded-full px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8a7035] flex items-center justify-center text-xs font-bold text-[#0B1628]">CO</div>
            <span className="text-xs text-[#7A8FB0]">Credit Officer</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-10">
        <div className="grid grid-cols-[1fr_340px] gap-8 items-start">

          {/* Left: Form */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-[#F0F4FF] mb-2">Gold Loan Valuation</h1>
              <p className="text-[#7A8FB0]">Enter asset and client details to initiate AI-powered valuation and eligibility assessment.</p>
            </div>

            {apiError && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="card p-8 space-y-6">
              {/* Emirates ID */}
              <div>
                <label className="label">Emirates ID</label>
                <input
                  type="text"
                  placeholder="784-YYYY-XXXXXXX-C"
                  className={`input-field ${errors.emirates_id ? 'border-red-500/60' : ''}`}
                  value={form.emirates_id}
                  onChange={e => setForm(f => ({ ...f, emirates_id: e.target.value }))}
                />
                {errors.emirates_id && <p className="text-red-400 text-xs mt-1">{errors.emirates_id}</p>}
                <p className="text-[#4a6080] text-xs mt-1">Format: 784-YYYY-XXXXXXX-C</p>
              </div>

              {/* Carat + Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Gold Carat</label>
                  <select
                    className="select-field"
                    value={form.carat}
                    onChange={e => setForm(f => ({ ...f, carat: e.target.value }))}
                  >
                    {karatOptions.map(k => (
                      <option key={k} value={k}>{k} — {(goldRates && goldRates[k]) ? `SAR ${goldRates[k].toFixed(2)}/g` : '...'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Gold Weight (grams)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 100"
                      className={`input-field pr-14 ${errors.gold_weight_grams ? 'border-red-500/60' : ''}`}
                      value={form.gold_weight_grams}
                      onChange={e => setForm(f => ({ ...f, gold_weight_grams: e.target.value }))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#7A8FB0]">grams</span>
                  </div>
                  {errors.gold_weight_grams && <p className="text-red-400 text-xs mt-1">{errors.gold_weight_grams}</p>}
                </div>
              </div>

              {/* Tenure + Profession */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Loan Tenure</label>
                  <select
                    className="select-field"
                    value={form.tenure_months}
                    onChange={e => setForm(f => ({ ...f, tenure_months: e.target.value }))}
                  >
                    {tenureOptions.map(t => (
                      <option key={t} value={t}>{t} months</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Profession</label>
                  <select
                    className="select-field"
                    value={form.job_profession}
                    onChange={e => setForm(f => ({ ...f, job_profession: e.target.value }))}
                  >
                    {professions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live rate preview */}
              {goldRates && form.carat && form.gold_weight_grams > 0 && (
                <div className="p-4 rounded-lg bg-[#C9A84C]/8 border border-[#C9A84C]/20">
                  <p className="text-xs text-[#C9A84C] font-medium mb-1">Estimated Valuation Preview</p>
                  <p className="text-lg font-bold text-[#F0F4FF]">
                    {(() => {
                      const purity = { '24K': 1, '22K': 0.9167, '21K': 0.875, '18K': 0.75, '14K': 0.5833 }
                      const rate = goldRates[form.carat] || 0
                      const val = Number(form.gold_weight_grams) * purity[form.carat] * rate
                      return formatSar(val)
                    })()}
                  </p>
                  <p className="text-xs text-[#7A8FB0] mt-0.5">Based on live SAR rate · Final valuation computed server-side</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3.5 text-base">
                  {loading ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg> Calculating…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg> Calculate Eligibility</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-ghost px-8"
                  onClick={() => { setForm({ emirates_id: '', carat: '22K', gold_weight_grams: '', tenure_months: '12', job_profession: 'Government Employee' }); setErrors({}); setApiError('') }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live rates panel */}
          <div className="space-y-4 sticky top-24">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#F0F4FF]">Live Gold Rates</h3>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${ratesLoading ? 'text-[#7A8FB0]' : 'text-emerald-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ratesLoading ? 'bg-[#7A8FB0]' : 'bg-emerald-400 animate-pulse'}`}/>
                  {ratesLoading ? 'Loading…' : 'Live'}
                </span>
              </div>
              <div className="space-y-2.5">
                {['24K', '22K', '21K', '18K', '14K'].map(k => (
                  <div key={k} className="flex items-center justify-between py-2 border-b border-[#243556] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center text-xs font-bold text-[#C9A84C]">{k}</div>
                    </div>
                    <span className="text-sm font-semibold text-[#F0F4FF]">
                      {goldRates ? `SAR ${goldRates[k]?.toFixed(2)}/g` : <span className="text-[#7A8FB0]">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#F0F4FF]">System Status</h3>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                All systems operational
              </div>
              <p className="text-xs text-[#7A8FB0] leading-relaxed">Customer identity verified via Emirates ID. Data secured per Finance House compliance policy.</p>
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-medium text-[#7A8FB0] uppercase tracking-wider mb-3">Test Emirates IDs</h3>
              <div className="space-y-2">
                {[
                  ['784-1985-1234567-1', 'Ahmed Al-Mansoori', 'A+'],
                  ['784-1990-2345678-2', 'Sara Al-Rashidi', 'B'],
                  ['784-1978-3456789-3', 'Khalid Al-Zaabi', 'C'],
                ].map(([id, name, cat]) => (
                  <button
                    key={id}
                    className="w-full text-left p-2.5 rounded-lg bg-[#0B1628] border border-[#243556] hover:border-[#C9A84C]/50 transition-colors group"
                    onClick={() => setForm(f => ({ ...f, emirates_id: id }))}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#C9A84C] group-hover:text-[#E2C068]">{id}</span>
                      <span className="text-xs text-[#7A8FB0]">{cat}</span>
                    </div>
                    <p className="text-xs text-[#7A8FB0] mt-0.5">{name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// GOLD CHART
// ══════════════════════════════════════════════════════════════════════════════

function GoldChart({ insights }) {
  const { historical_prices, predicted_prices, live_price_sar_per_gram, trend } = insights

  const today = new Date()
  const liveLabel = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  const histData = historical_prices.map(p => ({
    label: p.label,
    historical: p.price_sar_per_gram,
    type: 'history',
  }))

  const livePoint = { label: 'Live', live: live_price_sar_per_gram, type: 'live' }

  const predData = predicted_prices.map(p => ({
    label: p.label,
    predicted: p.price_sar_per_gram,
    type: 'predicted',
  }))

  const allData = [
    ...histData,
    livePoint,
    ...predData,
  ]

  const trendColor = trend === 'RISING' ? '#22C55E' : trend === 'FALLING' ? '#EF4444' : '#F59E0B'
  const trendBg = trend === 'RISING' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : trend === 'FALLING' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F0F4FF]">Gold Price Forecast</h3>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${trendBg}`}>
            {trend === 'RISING' ? '↑' : trend === 'FALLING' ? '↓' : '→'} {trend}
          </span>
          <span className={`text-xs font-semibold`} style={{ color: trendColor }}>
            {formatPct(insights.predicted_change_pct)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={allData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243556" />
          <XAxis dataKey="label" tick={{ fill: '#7A8FB0', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: '#7A8FB0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip
            contentStyle={{ background: '#152038', border: '1px solid #243556', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#7A8FB0' }}
            formatter={(v, name) => [`SAR ${Number(v).toFixed(2)}/g`, name]}
          />
          <Line type="monotone" dataKey="historical" stroke="#94A3B8" strokeWidth={2} dot={false} name="Historical" connectNulls />
          <Line type="monotone" dataKey="live" stroke="#22C55E" strokeWidth={0} dot={{ fill: '#22C55E', r: 6, strokeWidth: 2, stroke: '#fff' }} name="Live Price" connectNulls />
          <Line type="monotone" dataKey="predicted" stroke="#C9A84C" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast" connectNulls />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3 text-xs text-[#7A8FB0]">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#94A3B8] inline-block" /> Historical</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block" /> Live</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#C9A84C] inline-block border-t-2 border-dashed border-[#C9A84C]" /> Forecast</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EMI CALCULATOR
// ══════════════════════════════════════════════════════════════════════════════

function EmiCalculator({ principal }) {
  const [mode, setMode] = useState('monthly')
  const [tenure, setTenure] = useState(12)
  const [rate, setRate] = useState('')

  const P = principal || 0
  const r = rate !== '' && !isNaN(rate) ? Number(rate) : null
  const n = tenure

  let emiResult = null
  let bulletResult = null
  let schedule = []

  if (r !== null && P > 0) {
    const monthly_r = r / 100 / 12
    if (mode === 'monthly') {
      if (monthly_r === 0) {
        emiResult = P / n
      } else {
        emiResult = P * monthly_r * Math.pow(1 + monthly_r, n) / (Math.pow(1 + monthly_r, n) - 1)
      }

      // Amortization schedule
      if (r > 0) {
        let balance = P
        for (let m = 1; m <= n; m++) {
          const interest = balance * monthly_r
          let principalPaid = emiResult - interest
          if (m === n) principalPaid = balance  // clear remaining exactly
          balance -= principalPaid
          schedule.push({
            month: m,
            emi: emiResult,
            interest,
            principalPaid: m === n ? emiResult - interest : principalPaid,
            balance: Math.max(balance, 0),
          })
        }
      }
    } else {
      bulletResult = P * (1 + (r / 100) * (n / 12))
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#F0F4FF] mb-4">EMI Calculator</h3>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-[#0B1628] rounded-lg mb-5 border border-[#243556]">
        {[['monthly', 'Monthly EMI'], ['bullet', 'Bullet Payment']].map(([m, label]) => (
          <button
            key={m}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === m ? 'bg-[#C9A84C] text-[#0B1628]' : 'text-[#7A8FB0] hover:text-[#F0F4FF]'}`}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="label">Tenure</label>
          <select className="select-field" value={tenure} onChange={e => setTenure(Number(e.target.value))}>
            {[3, 6, 12, 18, 24, 36].map(t => <option key={t} value={t}>{t} months</option>)}
          </select>
        </div>
        <div>
          <label className="label">Annual Interest Rate (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 7.5"
            className="input-field"
            value={rate}
            onChange={e => setRate(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-[#C9A84C]/8 border border-[#C9A84C]/20 mb-4">
        <p className="text-xs text-[#7A8FB0] mb-1">{mode === 'monthly' ? 'Monthly EMI' : 'Total Bullet Payment'}</p>
        <p className="text-2xl font-extrabold text-[#C9A84C]">
          {mode === 'monthly'
            ? (emiResult !== null ? formatSar(emiResult) : '—')
            : (bulletResult !== null ? formatSar(bulletResult) : '—')}
        </p>
        {mode === 'monthly' && emiResult !== null && <p className="text-xs text-[#7A8FB0] mt-1">Total: {formatSar(emiResult * n)} over {n} months</p>}
        {mode === 'bullet' && bulletResult !== null && <p className="text-xs text-[#7A8FB0] mt-1">Principal: {formatSar(P)} + Interest: {formatSar(bulletResult - P)}</p>}
      </div>

      {/* Amortization schedule */}
      {mode === 'monthly' && r > 0 && schedule.length > 0 && (
        <div>
          <p className="text-xs text-[#7A8FB0] uppercase tracking-wide font-medium mb-2">Amortization Schedule</p>
          <div className="rounded-lg border border-[#243556] overflow-hidden">
            <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#1c2d4a]">
                  <tr>
                    <th className="text-left px-3 py-2 text-[#7A8FB0] font-semibold">Month</th>
                    <th className="text-right px-3 py-2 text-[#7A8FB0] font-semibold">EMI</th>
                    <th className="text-right px-3 py-2 text-emerald-400 font-semibold">Principal</th>
                    <th className="text-right px-3 py-2 text-red-400 font-semibold">Interest</th>
                    <th className="text-right px-3 py-2 text-[#7A8FB0] font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(row => (
                    <tr key={row.month} className="border-t border-[#243556] hover:bg-[#0B1628]/50 transition-colors">
                      <td className="px-3 py-2 text-[#7A8FB0]">{row.month}</td>
                      <td className="px-3 py-2 text-right text-[#F0F4FF]">{row.emi.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-emerald-400">{row.principalPaid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-red-400">{row.interest.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-[#7A8FB0]">{row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY SCREEN
// ══════════════════════════════════════════════════════════════════════════════

function SummaryScreen({ data, onBack }) {
  const {
    system_decision, recommended_ltv_pct, gold_valuation_sar, eligible_loan_amount_sar,
    future_gold_valuation_sar, future_eligible_loan_amount_sar, suggested_tenure_months,
    cibil_score, cibil_label, ltv_breakdown, customer_profile, loan_history,
    gold_insights, risk_insights, live_gold_rates,
  } = data

  const deltaPct = ((future_eligible_loan_amount_sar - eligible_loan_amount_sar) / eligible_loan_amount_sar) * 100

  return (
    <div className="min-h-screen bg-[#0B1628]">
      {/* Header */}
      <header className="border-b border-[#243556] bg-[#0B1628]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-2 text-[#7A8FB0] hover:text-[#C9A84C] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm">New Calculation</span>
            </button>
            <span className="text-[#243556]">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9A84C] to-[#E2C068] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0B1628]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-[#F0F4FF]">Finance House</span>
            </div>
          </div>
          <h2 className="text-sm font-semibold text-[#F0F4FF]">Gold Loan Eligibility Summary</h2>
          <div className="flex items-center gap-2">
            <DecisionBadge decision={system_decision} />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="grid grid-cols-[1fr_380px] gap-6">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Hero card */}
            <div className="card p-6 bg-gradient-to-br from-[#152038] to-[#0e1a30]">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs text-[#7A8FB0] uppercase tracking-wider mb-1">System Decision</p>
                  <DecisionBadge decision={system_decision} />
                </div>
                <CibilBadge score={cibil_score} label={cibil_label} />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="stat-label">Eligible Loan Amount</p>
                  <p className="text-2xl font-extrabold text-[#C9A84C] mt-1">{formatSar(eligible_loan_amount_sar)}</p>
                </div>
                <div>
                  <p className="stat-label">Gold Valuation</p>
                  <p className="stat-value mt-1">{formatSar(gold_valuation_sar)}</p>
                </div>
                <div>
                  <p className="stat-label">Recommended LTV</p>
                  <p className="stat-value mt-1">{recommended_ltv_pct.toFixed(2)}%</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[#0B1628] overflow-hidden">
                    <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${recommended_ltv_pct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Future estimate */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#F0F4FF]">Future Loan Estimate</h3>
                  <p className="text-xs text-[#7A8FB0] mt-0.5">Model Estimate — Not a Guarantee</p>
                </div>
                <span className={`text-sm font-bold ${deltaPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(2)}% vs current
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="stat-label">Future Eligible Loan</p>
                  <p className="text-xl font-bold text-[#F0F4FF] mt-1">{formatSar(future_eligible_loan_amount_sar)}</p>
                  <p className="text-xs text-[#7A8FB0] mt-0.5">at {suggested_tenure_months}mo tenure end</p>
                </div>
                <div>
                  <p className="stat-label">Future Gold Valuation</p>
                  <p className="text-xl font-bold text-[#F0F4FF] mt-1">{formatSar(future_gold_valuation_sar)}</p>
                  <p className="text-xs text-[#7A8FB0] mt-0.5">3% safety buffer applied</p>
                </div>
              </div>
            </div>

            {/* Gold forecast chart */}
            <div className="card p-5">
              <GoldChart insights={gold_insights} />
            </div>

            {/* LTV breakdown */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#F0F4FF] mb-4">LTV Factor Breakdown</h3>
              <div className="overflow-hidden rounded-lg border border-[#243556]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1c2d4a]">
                      <th className="text-left px-4 py-2.5 text-[#7A8FB0] font-medium text-xs uppercase tracking-wide">Factor</th>
                      <th className="text-center px-4 py-2.5 text-[#7A8FB0] font-medium text-xs uppercase tracking-wide">Multiplier</th>
                      <th className="text-right px-4 py-2.5 text-[#7A8FB0] font-medium text-xs uppercase tracking-wide">LTV Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Base LTV', '—', ltv_breakdown.base_ltv * 100, null],
                      ['Carat Quality', ltv_breakdown.carat_multiplier, null, ltv_breakdown.carat_adjustment],
                      ['CIBIL / Credit Score', ltv_breakdown.cibil_multiplier, null, ltv_breakdown.cibil_adjustment],
                      ['Active Loans', ltv_breakdown.active_loans_multiplier, null, ltv_breakdown.active_loans_adjustment],
                      ['Profession', ltv_breakdown.profession_multiplier, null, ltv_breakdown.profession_adjustment],
                      ['Gold Trend', ltv_breakdown.gold_trend_multiplier, null, ltv_breakdown.gold_trend_adjustment],
                    ].map(([label, mult, base, delta]) => (
                      <tr key={label} className="border-t border-[#243556] hover:bg-[#0B1628]/30 transition-colors">
                        <td className="px-4 py-2.5 text-[#F0F4FF]">{label}</td>
                        <td className="px-4 py-2.5 text-center text-[#7A8FB0]">
                          {base !== null ? `${base.toFixed(2)}%` : (mult === '—' ? mult : `×${Number(mult).toFixed(3)}`)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          {delta === null ? (
                            <span className="text-[#C9A84C] font-bold">{base?.toFixed(2)}%</span>
                          ) : (
                            <span className={delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#C9A84C]/30 bg-[#C9A84C]/5">
                      <td className="px-4 py-2.5 font-bold text-[#F0F4FF]">Final LTV</td>
                      <td className="px-4 py-2.5 text-center text-[#C9A84C] font-bold">—</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-[#C9A84C]">{recommended_ltv_pct.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk bars */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#F0F4FF] mb-4">Risk Assessment</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-[#7A8FB0] mb-3">Borrower Risk</p>
                  <RiskBar score={risk_insights.user_risk_score} label={risk_insights.user_risk_label} />
                </div>
                <div>
                  <p className="text-xs text-[#7A8FB0] mb-3">Company Exposure</p>
                  <RiskBar score={risk_insights.company_risk_score} label={risk_insights.company_risk_label} />
                  <p className="text-xs text-[#7A8FB0] mt-1.5">Exposure: <span className="font-semibold text-[#F0F4FF]">{risk_insights.company_risk_exposure}</span></p>
                </div>
              </div>
            </div>

            {/* EMI Calculator */}
            <div className="card p-5">
              <EmiCalculator principal={eligible_loan_amount_sar} />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* Customer profile */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center text-lg font-bold text-[#C9A84C]">
                  {customer_profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-[#F0F4FF] text-sm">{customer_profile.name}</p>
                  <p className="text-xs text-[#7A8FB0]">{customer_profile.customer_type} · {customer_profile.risk_category}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  ['Emirates ID', customer_profile.emirates_id],
                  ['Nationality', customer_profile.nationality],
                  ['Mobile', customer_profile.mobile],
                  ['Email', customer_profile.email],
                  ['Gender', customer_profile.gender],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1.5 border-b border-[#243556] last:border-0">
                    <span className="text-[#7A8FB0]">{k}</span>
                    <span className="text-[#F0F4FF] font-medium text-right max-w-[60%] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live rates */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#F0F4FF] mb-3">Live Gold Rates</h3>
              <div className="space-y-2">
                {Object.entries(live_gold_rates).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-[#243556] last:border-0">
                    <span className="text-[#7A8FB0]">{k}</span>
                    <span className="text-[#C9A84C] font-semibold">SAR {Number(v).toFixed(2)}/g</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Loan history overview */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[#F0F4FF] mb-4">Loan History</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Total Loans', loan_history.total_loans],
                  ['Active', loan_history.active_loans],
                  ['Closed', loan_history.closed_loans],
                  ['Missed EMIs', loan_history.total_missed_emis],
                ].map(([label, val]) => (
                  <div key={label} className="p-3 rounded-lg bg-[#0B1628] border border-[#243556] text-center">
                    <p className="text-lg font-bold text-[#F0F4FF]">{val}</p>
                    <p className="text-xs text-[#7A8FB0] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {loan_history.outstanding_balance_sar > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 mb-4">
                  <p className="text-xs text-[#7A8FB0]">Outstanding Balance</p>
                  <p className="text-base font-bold text-amber-400">{formatSar(loan_history.outstanding_balance_sar)}</p>
                </div>
              )}
              <div className="space-y-3">
                {loan_history.loans.map(loan => (
                  <div key={loan.loan_id} className="p-3 rounded-lg border border-[#243556] bg-[#0B1628]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-[#7A8FB0]">{loan.loan_id}</span>
                      <StatusBadge status={loan.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#7A8FB0]">Amount</span>
                        <span className="text-[#F0F4FF] font-medium">{formatSar(loan.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8FB0]">Tenure</span>
                        <span className="text-[#F0F4FF] font-medium">{loan.tenure_months}mo</span>
                      </div>
                      {loan.missed_emis > 0 && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-[#7A8FB0]">Missed EMIs</span>
                          <span className="text-red-400 font-medium">{loan.missed_emis}</span>
                        </div>
                      )}
                      {loan.outstanding_balance > 0 && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-[#7A8FB0]">Outstanding</span>
                          <span className="text-amber-400 font-medium">{formatSar(loan.outstanding_balance)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [activeScreen, setActiveScreen] = useState('calculator')
  const [resultData, setResultData] = useState(null)

  function handleResult(data) {
    setResultData(data)
    setActiveScreen('summary')
  }

  function handleBack() {
    setActiveScreen('calculator')
  }

  if (activeScreen === 'summary' && resultData) {
    return <SummaryScreen data={resultData} onBack={handleBack} />
  }

  return <CalculatorScreen onResult={handleResult} />
}
