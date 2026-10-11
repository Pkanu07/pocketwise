import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STARTING_BUDGET = 10000
const TOTAL_DAYS = 30
const DAY_OF_MONTH = 11

const initialExpenses = [
  { id: 1, title: 'Groceries', category: 'Food', amount: 650, date: 'Today' },
  { id: 2, title: 'Bus pass', category: 'Travel', amount: 300, date: 'Today' },
  { id: 3, title: 'Coffee with friends', category: 'Lifestyle', amount: 180, date: 'Yesterday' },
  { id: 4, title: 'Mobile recharge', category: 'Bills', amount: 249, date: 'Yesterday' },
]

const categories = [
  { name: 'Food', icon: '🍜', color: '#fb923c', limit: 2500 },
  { name: 'Travel', icon: '🚌', color: '#60a5fa', limit: 1200 },
  { name: 'Bills', icon: '📱', color: '#a78bfa', limit: 1500 },
  { name: 'Lifestyle', icon: '✨', color: '#f472b6', limit: 1800 },
  { name: 'Other', icon: '📦', color: '#34d399', limit: 1000 },
]

const initialCommitments = [
  { id: 1, title: 'Hostel / rent', amount: 2000, due: 'Day 15', icon: '🏠' },
  { id: 2, title: 'College / study', amount: 500, due: 'Day 20', icon: '📚' },
]

const initialSubscriptions = [
  { id: 1, title: 'Spotify', amount: 119, active: true, icon: '🎵' },
  { id: 2, title: 'YouTube Premium', amount: 129, active: true, icon: '▶️' },
  { id: 3, title: 'Netflix', amount: 149, active: false, icon: '🎬' },
]

const scenarios = [
  { label: 'Weekend plan', amount: 500, category: 'Lifestyle', icon: '🍿' },
  { label: 'New headphones', amount: 2500, category: 'Lifestyle', icon: '🎧' },
  { label: 'Emergency', amount: 1500, category: 'Other', icon: '🚨' },
  { label: 'Save more', amount: 1000, category: 'Savings', icon: '💰', saving: true },
]

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.max(0, value))

function App() {
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem('pocketwise-expenses') || 'null') || initialExpenses)
  const [income] = useState(STARTING_BUDGET)
  const [goal, setGoal] = useState(3000)
  const [saved, setSaved] = useState(1200)
  const [commitments, setCommitments] = useState(initialCommitments)
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [showForm, setShowForm] = useState(false)
  const [showSimulator, setShowSimulator] = useState(false)
  const [notice, setNotice] = useState('')
  const [simulation, setSimulation] = useState({ amount: 2500, label: 'New headphones', category: 'Lifestyle' })
  const [form, setForm] = useState({ title: '', amount: '', category: 'Food' })

  useEffect(() => localStorage.setItem('pocketwise-expenses', JSON.stringify(expenses)), [expenses])

  const spent = expenses.reduce((total, item) => total + item.amount, 0)
  const balance = income - spent
  const activeSubscriptions = subscriptions.filter(item => item.active)
  const subscriptionTotal = activeSubscriptions.reduce((total, item) => total + item.amount, 0)
  const commitmentTotal = commitments.reduce((total, item) => total + item.amount, 0)
  const daysRemaining = Math.max(1, TOTAL_DAYS - DAY_OF_MONTH + 1)
  const dailyAllowance = Math.max(0, (balance - commitmentTotal - subscriptionTotal) / daysRemaining)
  const safeToSpend = Math.max(0, balance - commitmentTotal - subscriptionTotal)
  const savingsPercent = Math.min(100, (saved / Math.max(goal, 1)) * 100)
  const spentPercent = Math.min(100, (spent / income) * 100)
  const averageDailySpend = spent / DAY_OF_MONTH
  const projectedVariableSpend = averageDailySpend * daysRemaining
  const forecast = Math.max(0, balance - projectedVariableSpend - commitmentTotal - subscriptionTotal)
  const goalGap = Math.max(0, goal - saved)

  const healthScore = useMemo(() => {
    let score = 100
    score -= Math.min(35, spentPercent * 0.45)
    score -= Math.min(20, (commitmentTotal + subscriptionTotal) / Math.max(balance, 1) * 20)
    if (forecast < goalGap) score -= 12
    if (dailyAllowance < 150) score -= 10
    if (safeToSpend < 1000) score -= 12
    return Math.max(0, Math.round(score))
  }, [spentPercent, commitmentTotal, subscriptionTotal, balance, forecast, goalGap, dailyAllowance, safeToSpend])

  const healthLabel = healthScore >= 75 ? 'Healthy' : healthScore >= 55 ? 'Watch out' : 'At risk'
  const risk = healthScore >= 75 ? 'Low' : healthScore >= 55 ? 'Medium' : 'High'
  const riskClass = risk.toLowerCase()

  const simulationResult = useMemo(() => {
    const amount = Math.max(0, Number(simulation.amount) || 0)
    const nextBalance = balance - amount
    const nextSafe = Math.max(0, nextBalance - commitmentTotal - subscriptionTotal)
    const nextAllowance = nextSafe / daysRemaining
    const nextForecast = Math.max(0, nextBalance - projectedVariableSpend - commitmentTotal - subscriptionTotal)
    const goalDelay = dailyAllowance > 0 ? Math.ceil(amount / Math.max(dailyAllowance, 1)) : 0
    let nextScore = healthScore - Math.min(28, Math.round((amount / Math.max(income, 1)) * 100))
    if (nextSafe < 1000) nextScore -= 8
    nextScore = Math.max(0, nextScore)
    const nextHealth = nextScore >= 75 ? 'Healthy' : nextScore >= 55 ? 'Watch out' : 'At risk'
    const nextRisk = nextScore >= 75 ? 'Low' : nextScore >= 55 ? 'Medium' : 'High'
    return { amount, nextBalance, nextSafe, nextAllowance, nextForecast, goalDelay, nextScore, nextHealth, nextRisk }
  }, [simulation, balance, commitmentTotal, subscriptionTotal, daysRemaining, projectedVariableSpend, dailyAllowance, healthScore, income])

  function addExpense(event) {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return setNotice('Enter an expense name and a valid amount.')
    if (amount > balance) return setNotice('This expense is higher than your available balance.')
    setExpenses(current => [{ id: Date.now(), title: form.title.trim(), category: form.category, amount, date: 'Just now' }, ...current])
    setForm({ title: '', amount: '', category: 'Food' })
    setShowForm(false)
    setNotice('Expense added! Your connected financial picture has been updated.')
  }

  function addSavings() {
    const amount = Number(prompt('How much would you like to save?'))
    if (!Number.isFinite(amount) || amount <= 0) return
    if (amount > balance) return setNotice('You do not have enough balance for that savings deposit.')
    setExpenses(current => [{ id: Date.now(), title: 'Savings deposit', category: 'Savings', amount, date: 'Just now' }, ...current])
    setSaved(current => current + amount)
    setNotice(`${money(amount)} added to your savings goal.`)
  }

  function simulateScenario(scenario) {
    setSimulation({ amount: scenario.amount, label: scenario.label, category: scenario.category })
    setShowSimulator(true)
    document.getElementById('decision-lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function applySimulation() {
    const amount = simulationResult.amount
    if (!amount || amount > balance) return setNotice('This decision is not affordable with your current balance.')
    if (simulation.category === 'Savings') {
      setSaved(current => current + amount)
      setExpenses(current => [{ id: Date.now(), title: simulation.label, category: 'Savings', amount, date: 'Just now' }, ...current])
    } else {
      setExpenses(current => [{ id: Date.now(), title: simulation.label, category: simulation.category, amount, date: 'Just now' }, ...current])
    }
    setShowSimulator(false)
    setNotice(`Decision applied: ${money(amount)} ${simulation.category === 'Savings' ? 'moved to savings' : 'spent'}.`)
  }

  function resetBudget() {
    if (!window.confirm('Reset all transactions and return to the original demo budget?')) return
    setExpenses(initialExpenses)
    setSaved(1200)
    setCommitments(initialCommitments)
    setSubscriptions(initialSubscriptions)
    setNotice('Demo budget has been reset.')
  }

  const categoryTotals = categories.map(category => ({ ...category, spent: expenses.filter(item => item.category === category.name).reduce((total, item) => total + item.amount, 0) }))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard"><span className="brand-icon">p.</span><span>Pocketwise<span className="brand-dot">.</span></span></a>
        <p className="nav-label">YOUR SPACE</p>
        <nav className="navigation">
          <a className="nav-link active" href="#dashboard"><span>▦</span> Overview</a>
          <a className="nav-link" href="#decision-lab"><span>⚡</span> Decision Lab</a>
          <a className="nav-link" href="#transactions"><span>↕</span> Transactions</a>
          <a className="nav-link" href="#commitments"><span>◷</span> Commitments</a>
          <a className="nav-link" href="#goals"><span>◎</span> Savings goals</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="tip-card"><span className="tip-icon">✦</span><h3>Think before you spend</h3><p>Simulate a decision first and see how it changes your whole month.</p></div>
          <div className="profile"><div className="avatar">P</div><div><strong>My Wallet</strong><small>₹10,000 · 30-day plan</small></div><span className="profile-menu">•••</span></div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div><p className="eyebrow">SUNDAY, OCTOBER 11 · DAY {DAY_OF_MONTH} OF 30</p><h1>Your money, your moves<span className="heading-dot">.</span></h1><p className="subtitle">See the consequences before you make the decision.</p></div>
          <div className="top-actions"><button className="icon-button" title="Reset demo" onClick={resetBudget}>↻</button><button className="primary-button" onClick={() => setShowForm(true)}>＋ Add expense</button></div>
        </header>

        {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

        <section className="hero-card">
          <div className="hero-content">
            <span className="hero-tag"><span className="live-dot"></span> LIVE 30-DAY MONEY PLAN</span>
            <p className="hero-label">Available balance</p><h2>{money(balance)}</h2>
            <p className="hero-description">of {money(income)} starting budget · {daysRemaining} days remaining</p>
            <div className="hero-progress"><div style={{ width: `${spentPercent}%` }} /></div>
            <div className="hero-legend"><span><i className="legend-spent" /> {money(spent)} spent</span><span>{money(safeToSpend)} safe to spend</span></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="coin coin-one">₹</div><div className="coin coin-two">✦</div><div className="wallet-illustration"><div className="wallet-top"></div><div className="wallet-pocket"><span></span></div></div><div className="float-label">Decide with confidence ✨</div></div>
        </section>

        <section className="stats-grid" aria-label="Financial summary">
          <article className="stat-card"><div className="stat-top"><span>Safe to spend</span><span className="stat-icon orange">✓</span></div><h3>{money(safeToSpend)}</h3><p className="stat-foot">After commitments + subscriptions</p></article>
          <article className="stat-card"><div className="stat-top"><span>Daily allowance</span><span className="stat-icon blue">☀</span></div><h3>{money(dailyAllowance)}</h3><p className="stat-foot">For the next {daysRemaining} days</p></article>
          <article className="stat-card"><div className="stat-top"><span>Financial health</span><span className="stat-icon purple">◎</span></div><h3 className={`health-value ${riskClass}`}>{healthScore}/100</h3><p className="stat-foot">{healthLabel} · risk is {risk.toLowerCase()}</p></article>
          <article className="stat-card"><div className="stat-top"><span>Month-end forecast</span><span className="stat-icon green">↗</span></div><h3>{money(forecast)}</h3><p className="stat-foot">Based on your current spending rate</p></article>
        </section>

        <section className="decision-hero panel" id="decision-lab">
          <div className="decision-copy"><span className="decision-kicker">⚡ DECISION LAB</span><h2>Before you spend, <span>see what changes.</span></h2><p>Try a purchase, emergency, or savings decision. Pocketwise instantly recalculates your balance, daily allowance, forecast, savings timeline, risk and health.</p></div>
          <div className="scenario-row">{scenarios.map(scenario => <button className="scenario-card" key={scenario.label} onClick={() => simulateScenario(scenario)}><span>{scenario.icon}</span><strong>{scenario.label}</strong><small>{scenario.saving ? '+' : '−'}{money(scenario.amount)}</small></button>)}</div>
          <button className="primary-button simulator-open" onClick={() => setShowSimulator(true)}>Open full simulator →</button>
        </section>

        <div className="content-grid">
          <section className="panel spending-panel" id="budgets">
            <div className="panel-heading"><div><h2>Where it goes</h2><p>Your spending by category</p></div><span className="heading-badge">LIVE</span></div>
            <div className="category-list">{categoryTotals.map(category => <div className="category-row" key={category.name}><div className="category-icon" style={{ background: `${category.color}20` }}>{category.icon}</div><div className="category-info"><div className="category-name"><strong>{category.name}</strong><span>{money(category.spent)} <small>/ {money(category.limit)}</small></span></div><div className="category-track"><div style={{ width: `${Math.min(100, category.spent / category.limit * 100)}%`, background: category.color }} /></div></div></div>)}</div>
            <div className="panel-note"><span>✦</span> Biggest lever: {categoryTotals.sort((a, b) => b.spent - a.spent)[0]?.name || 'Food'}. Simulate your next purchase before adding it.</div>
          </section>

          <section className="panel forecast-panel" id="insights">
            <div className="panel-heading"><div><h2>Month-end forecast</h2><p>Projects the month using your current spending pace</p></div><span className="forecast-icon">↗</span></div>
            <div className="forecast-number">{money(forecast)}</div><p className="forecast-caption">Projected remaining balance after expected daily spending, commitments and active subscriptions.</p>
            <div className="forecast-mini-grid"><div><small>Current pace</small><strong>{money(averageDailySpend)}/day</strong></div><div><small>Fixed money</small><strong>{money(commitmentTotal + subscriptionTotal)}</strong></div><div><small>Goal gap</small><strong>{money(goalGap)}</strong></div></div>
            <div className="forecast-chart" aria-label="Monthly balance forecast">{Array.from({ length: 12 }, (_, index) => { const pct = Math.max(8, 100 - index * 7 - (projectedVariableSpend / Math.max(balance, 1)) * index * 20); return <div className="forecast-bar-wrap" key={index}><div className={`forecast-bar ${index === 11 ? 'forecast-bar-last' : ''}`} style={{ height: `${pct}%` }} /></div> })}</div>
            <div className="chart-labels"><span>Today</span><span>Day 30</span></div>
            <div className="forecast-callout"><span>{risk === 'Low' ? '✦' : '⚠'}</span><p>{forecast >= goalGap ? 'You are currently on track to cover your savings goal.' : 'At your current pace, your spending may slow your savings goal. Try a decision simulation to find a safer option.'}</p></div>
          </section>
        </div>

        <section className="panel commitment-panel" id="commitments">
          <div className="panel-heading"><div><h2>Money already spoken for</h2><p>Commitments and recurring subscriptions reduce what is truly safe to spend.</p></div><span className="heading-badge">₹{commitmentTotal + subscriptionTotal} FIXED</span></div>
          <div className="commitment-grid">
            <div className="commitment-column"><div className="mini-heading"><strong>Upcoming commitments</strong><span>{money(commitmentTotal)}</span></div>{commitments.map(item => <div className="commitment-row" key={item.id}><span className="commitment-icon">{item.icon}</span><div><strong>{item.title}</strong><small>Due {item.due}</small></div><b>{money(item.amount)}</b></div>)}</div>
            <div className="commitment-column"><div className="mini-heading"><strong>Subscriptions</strong><span>{money(subscriptionTotal)}/mo</span></div>{subscriptions.map(item => <div className={`commitment-row ${!item.active ? 'muted-row' : ''}`} key={item.id}><span className="commitment-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.active ? 'Active monthly' : 'Paused'}</small></div><b>{money(item.amount)}</b><button className={`toggle ${item.active ? 'on' : ''}`} onClick={() => setSubscriptions(current => current.map(sub => sub.id === item.id ? { ...sub, active: !sub.active } : sub))}>{item.active ? 'ON' : 'OFF'}</button></div>)}</div>
          </div>
          <div className="safe-strip"><span>🛡️</span><div><strong>{money(safeToSpend)} is your real safe-to-spend amount</strong><small>Balance minus {money(commitmentTotal)} commitments and {money(subscriptionTotal)} active subscriptions.</small></div></div>
        </section>

        <div className="bottom-grid">
          <section className="panel transactions-panel" id="transactions"><div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest money moves</p></div><button className="text-button" onClick={() => setShowForm(true)}>＋ Add new</button></div>{expenses.length === 0 ? <div className="empty-state"><span>🧾</span><p>No transactions yet.</p></div> : <div className="transaction-list">{expenses.slice(0, 6).map(item => { const category = categories.find(cat => cat.name === item.category); return <div className="transaction-row" key={item.id}><div className="transaction-icon">{category?.icon || '💰'}</div><div className="transaction-info"><strong>{item.title}</strong><small>{item.category} · {item.date}</small></div><strong className="transaction-amount">−{money(item.amount)}</strong><button className="delete-button" title={`Delete ${item.title}`} onClick={() => { setExpenses(current => current.filter(expense => expense.id !== item.id)); if (item.category === 'Savings') setSaved(current => Math.max(1200, current - item.amount)); setNotice('Transaction removed and balance recalculated.') }}>×</button></div> })}</div>}</section>

          <section className="panel goal-panel" id="goals"><div className="panel-heading"><div><h2>Your next big thing</h2><p>A goal worth protecting</p></div><span className="goal-sparkle">✦</span></div><div className="goal-art"><span>🎧</span><div className="goal-star star-a">✦</div><div className="goal-star star-b">✧</div></div><p className="goal-title">Dream purchase</p><div className="goal-amounts"><strong>{money(saved)}</strong><span>of {money(goal)}</span></div><div className="goal-track"><div style={{ width: `${savingsPercent}%` }} /></div><div className="goal-footer"><span>{Math.round(savingsPercent)}% completed</span><button className="text-button" onClick={() => { const value = Number(prompt('Set your savings goal in rupees:', String(goal))); if (Number.isFinite(value) && value > 0) setGoal(value) }}>Edit goal</button></div><button className="save-button" onClick={addSavings}>＋ Add to savings</button></section>
        </div>

        <footer className="footer"><span>Made for your next chapter <span className="footer-heart">♥</span></span><span>POCKETWISE · SMARTER MONEY DECISIONS</span></footer>
      </main>

      {showForm && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setShowForm(false) }}><section className="expense-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><span className="eyebrow">MONEY IN MOTION</span><h2>Add an expense</h2><p>Every little choice changes your plan.</p></div><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">×</button></div><form onSubmit={addExpense}><label htmlFor="expense-name">What did you spend on?</label><input id="expense-name" autoFocus placeholder="e.g. Lunch, books, travel" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required /><label htmlFor="expense-amount">Amount (₹)</label><input id="expense-amount" type="number" min="1" step="1" placeholder="0" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} required /><label htmlFor="expense-category">Category</label><select id="expense-category" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category.name} value={category.name}>{category.icon} {category.name}</option>)}<option value="Savings">💰 Savings</option></select><div className="modal-balance">Available after expense <strong>{money(balance - (Number(form.amount) || 0))}</strong></div><button className="primary-button modal-submit" type="submit">Save expense →</button></form></section></div>}

      {showSimulator && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) setShowSimulator(false) }}><section className="simulator-modal" role="dialog" aria-modal="true" aria-labelledby="simulator-title"><div className="modal-heading"><div><span className="eyebrow">⚡ DECISION SIMULATOR</span><h2 id="simulator-title">What happens if you do this?</h2><p>Change the amount and instantly preview the consequences.</p></div><button className="modal-close" onClick={() => setShowSimulator(false)} aria-label="Close">×</button></div><div className="simulator-inputs"><label>Decision<label className="input-label"><input value={simulation.label} onChange={event => setSimulation({ ...simulation, label: event.target.value })} /></label></label><label>Amount (₹)<label className="input-label"><input type="number" min="0" value={simulation.amount} onChange={event => setSimulation({ ...simulation, amount: event.target.value })} /></label></label><label>Type<label className="input-label"><select value={simulation.category} onChange={event => setSimulation({ ...simulation, category: event.target.value })}><option value="Food">🍜 Food</option><option value="Travel">🚌 Travel</option><option value="Lifestyle">✨ Lifestyle</option><option value="Other">📦 Other</option><option value="Savings">💰 Savings</option></select></label></label></div><div className="before-after"><div className="before-card"><span>NOW</span><strong>{money(balance)}</strong><small>{money(dailyAllowance)}/day · {healthScore}/100</small></div><div className="arrow">→</div><div className={`after-card ${simulationResult.nextRisk.toLowerCase()}`}><span>AFTER THIS DECISION</span><strong>{money(simulationResult.nextBalance)}</strong><small>{money(simulationResult.nextAllowance)}/day · {simulationResult.nextScore}/100</small></div></div><div className="impact-grid"><div><small>Safe to spend</small><strong>{money(safeToSpend)} → {money(simulationResult.nextSafe)}</strong></div><div><small>Month forecast</small><strong>{money(forecast)} → {money(simulationResult.nextForecast)}</strong></div><div><small>Risk</small><strong>{risk} → {simulationResult.nextRisk}</strong></div><div><small>Financial health</small><strong>{healthScore} → {simulationResult.nextScore}</strong></div></div><div className="simulation-tip">{simulationResult.amount <= safeToSpend ? `✓ This fits inside your current safe-to-spend amount. Your savings goal may be delayed by about ${simulationResult.goalDelay} day${simulationResult.goalDelay === 1 ? '' : 's'}.` : '⚠ This is above your safe-to-spend amount. Consider a smaller amount or simulate it as an emergency.'}</div><div className="simulator-actions"><button className="text-button" onClick={() => setShowSimulator(false)}>Cancel</button><button className="primary-button" onClick={applySimulation}>{simulation.category === 'Savings' ? 'Apply saving decision' : 'Apply this decision'} →</button></div></section></div>}
    </div>
  )
}

export default App
