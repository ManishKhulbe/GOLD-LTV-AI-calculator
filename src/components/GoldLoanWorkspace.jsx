import { useMemo, useState } from 'react'

const KARAT_OPTIONS = ['24K', '22K', '21K', '18K', '14K']

const KARAT_PURITY = {
  '24K': 1,
  '22K': 0.9167,
  '21K': 0.875,
  '18K': 0.75,
  '14K': 0.5833,
}

export default function GoldLoanWorkspace({
  form,
  handleChange,
  handleCalculate,
  handleReset,
  isSubmitting,
  isRateLoading,
  liveGoldRates,
  liveGoldCurrency = 'AED',
  liveGoldUnit = 'g',
  todayLoanScore,
  statusMessage,
}) {
  const [desiredLoan, setDesiredLoan] = useState('250000')
  const [reverseAmount, setReverseAmount] = useState('250000')

  const reverseRows = useMemo(() => {
    const amount = Number.parseFloat(reverseAmount)
    if (!amount || amount <= 0) return []

    return KARAT_OPTIONS.map((karat) => {
      const liveRate = Number(liveGoldRates?.[karat] ?? 0)
      if (!liveRate) return { karat, grams: null }
      return { karat, grams: amount / liveRate }
    })
  }, [reverseAmount, liveGoldRates])

  const handleReverseReset = () => {
    setDesiredLoan('250000')
    setReverseAmount('250000')
  }

  const handleReverseCalculate = () => {
    const parsed = Number.parseFloat(desiredLoan)
    if (!parsed || parsed <= 0) return
    setReverseAmount(String(parsed))
  }

  return (
    <section className="px-2 pb-10 pt-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <h1 className="text-[34px] font-semibold tracking-tight text-[#0f172a]">Gold Loan Valuation</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Instant estimates based on your gold assets.</p>

          <form className="mt-5 rounded-xl border border-[#eef0f4] bg-[#f9fafb] p-4" onSubmit={handleCalculate}>
            <div className="grid gap-3 md:grid-cols-3">
              <InputBlock label="Carat">
                <select
                  value={form.carat}
                  onChange={handleChange('carat')}
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-white px-3 text-sm text-[#374151] outline-none"
                >
                  <option value="">Select</option>
                  {KARAT_OPTIONS.map((karat) => (
                    <option key={karat} value={karat}>
                      {karat}
                    </option>
                  ))}
                </select>
              </InputBlock>
              <InputBlock label="Emirates ID">
                <input
                  value={form.emiratesId}
                  onChange={handleChange('emiratesId')}
                  placeholder="784-XXXX-XXXXXXX-X"
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-white px-3 text-sm text-[#374151] outline-none"
                />
              </InputBlock>
              <InputBlock label="Gold Weight (grams)">
                <input
                  type="number"
                  value={form.goldWeight}
                  onChange={handleChange('goldWeight')}
                  placeholder="0.00"
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-white px-3 text-sm text-[#374151] outline-none"
                />
              </InputBlock>
              <InputBlock label="Gold Type">
                <select
                  value={form.goldType}
                  onChange={handleChange('goldType')}
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-white px-3 text-sm text-[#374151] outline-none"
                >
                  <option value="">Select</option>
                  <option value="Coin">Coin</option>
                  <option value="Jewellery">Jewellery</option>
                  <option value="Stone Jewellery">Stone Jewellery</option>
                </select>
              </InputBlock>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <InputBlock label="Purity %">
                <input
                  value={form.carat ? (KARAT_PURITY[form.carat] * 100).toFixed(2) : ''}
                  placeholder="eg. 99.9"
                  readOnly
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-[#f3f4f6] px-3 text-sm text-[#4b5563] outline-none"
                />
              </InputBlock>
              <InputBlock label="Loan Tenure (months)">
                <select
                  value={form.loanTenure}
                  onChange={handleChange('loanTenure')}
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-white px-3 text-sm text-[#374151] outline-none"
                >
                  <option value="">Select</option>
                  {[6, 12, 18, 24, 36, 48].map((months) => (
                    <option key={months} value={months}>
                      {months} Months
                    </option>
                  ))}
                </select>
              </InputBlock>
              <InputBlock label="Job Profession">
                <select
                  value={form.jobProfession}
                  onChange={handleChange('jobProfession')}
                  className="h-10 w-full rounded-md border border-[#dce0e6] bg-white px-3 text-sm text-[#374151] outline-none"
                >
                  <option value="">Select</option>
                  <option value="Government Employee">Government Employee</option>
                  <option value="Private Employee">Private Employee</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Self Employed">Self Employed</option>
                  <option value="Retired">Retired</option>
                  <option value="Freelancer">Freelancer</option>
                </select>
              </InputBlock>
            </div>
            <div className="mt-3 flex items-end gap-2 md:max-w-[420px]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full rounded-md bg-[#020b2a] px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#091a4a] hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Estimating...' : 'Estimate Gold Price'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-10 rounded-md border border-[#dce0e6] bg-white px-4 text-sm font-medium text-[#4b5563] hover:bg-[#f8fafc]"
              >
                Reset
              </button>
            </div>
            {statusMessage ? <p className="mt-3 text-sm text-[#4b5563]">{statusMessage}</p> : null}
          </form>

          <div className="mt-8 border-t border-[#eceff3] pt-8">
            <h2 className="text-[34px] font-semibold tracking-tight text-[#0f172a]">Reverse Gold Valuation</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Calculate required gold weight based on your desired loan amount.</p>
            <div className="mt-4 rounded-xl border border-[#e9edf3] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4b5563]">Desired Loan Amount</label>
                <span className="rounded-full bg-[#06173d] px-3 py-1 text-[10px] font-semibold text-[#f2cf84]">Secure Calculation</span>
              </div>
              <div className="mt-3 rounded-md border border-[#e5e7eb] bg-[#f3f4f6] px-5 py-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-[22px] font-semibold tracking-tight text-[#4b5563]">{liveGoldCurrency}</span>
                  <input
                    value={desiredLoan}
                    onChange={(e) => setDesiredLoan(e.target.value.replace(/[^\d.]/g, ''))}
                    className="w-full bg-transparent text-[48px] font-semibold leading-none tracking-tight text-[#0f172a] outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_120px] gap-3">
                <button
                  type="button"
                  onClick={handleReverseCalculate}
                  className="h-11 rounded-md bg-[#020b2a] px-4 text-sm font-semibold text-white transition hover:bg-[#091a4a]"
                >
                  Calculate Weight
                </button>
                <button
                  type="button"
                  onClick={handleReverseReset}
                  className="h-11 rounded-md border border-[#cfd5df] bg-white px-4 text-sm font-semibold text-[#4b5563] transition hover:bg-[#f8fafc]"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="text-sm text-[#4b5563]">◧</span>
              <h3 className="text-[18px] font-semibold tracking-tight text-[#1f2937]">Required Gold Weight Breakdown</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {reverseRows.map((row) => (
                <div key={row.karat} className="rounded-2xl border border-[#e7ebf2] bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                  <p className="text-sm font-medium text-[#6b7280]">{row.karat} Gold</p>
                  <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-[#1f2937]">
                    {row.grams != null ? row.grams.toFixed(2) : '--'}
                    <span className="ml-1 text-[22px] font-medium text-[#6b7280]">grams</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">System Information</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">Live Gold Rate</p>
            <p className="mt-1 text-2xl font-semibold text-[#1f2937]">
              {liveGoldCurrency} {isRateLoading || !liveGoldRates['24K'] ? '--.--' : Number(liveGoldRates['24K']).toFixed(2)}
              <span className="ml-1 text-sm text-[#6b7280]">/{liveGoldUnit}</span>
            </p>
            <div className="mt-3 space-y-1.5 rounded-md border border-[#eef2f7] bg-[#fbfcfe] p-3">
              {KARAT_OPTIONS.map((karat) => (
                <p key={karat} className="flex items-center justify-between text-xs text-[#4b5563]">
                  <span className="font-medium">{karat}</span>
                  <span className="font-semibold text-[#1f2937]">
                    {isRateLoading || !liveGoldRates[karat]
                      ? '--.--'
                      : `${Number(liveGoldRates[karat]).toFixed(2)} ${liveGoldCurrency}/${liveGoldUnit}`}
                  </span>
                </p>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-[#eef2f7] bg-[#f9fafb] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">System Status</p>
              <p className="mt-1 text-sm font-semibold text-[#16a34a]">Ready</p>
            </div>
          </div>

          <div className="rounded-xl bg-[#032257] p-4 text-white shadow">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#b8cfff]">Today&apos;s Gold Loan Score</p>
            <p className="mt-2 text-5xl font-semibold leading-none">
              {todayLoanScore?.score != null ? `${Number(todayLoanScore.score).toFixed(1)}/10` : '--/10'}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-[#f2cf84]">
              {todayLoanScore?.label ?? 'Loading market signal'}
            </p>
            <p className="mt-1 text-[10px] text-[#d5def6]">
              {todayLoanScore?.market_condition ?? 'Calibrating ML prediction...'}
            </p>
            <p className="mt-1 text-[10px] text-[#c5d1ed]">
              {todayLoanScore?.guidance ?? ''}
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function InputBlock({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9ca3af]">{label}</span>
      {children}
    </label>
  )
}
