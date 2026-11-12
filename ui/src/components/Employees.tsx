import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Employee, PortalApi } from '../lib/api'
import { messageFor } from '../lib/api'

export default function Employees({ api }: { api: PortalApi }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const controller = useRef<AbortController | null>(null)
  const savingRef = useRef(false)
  useEffect(() => {
    const pending = new AbortController(); controller.current = pending
    api.list(undefined, pending.signal).then((result) => setEmployees(result.employees)).catch((failure) => { if (!pending.signal.aborted) setError(messageFor(failure)) }).finally(() => { if (!pending.signal.aborted) setLoading(false) })
    return () => controller.current?.abort()
  }, [api])
  async function filter(event: FormEvent) {
    event.preventDefault(); setError('')
    if (savingRef.current) return
    setDetailLoading(false)
    if ((!!from !== !!to) || (from && from > to)) { setError('Choose both hire dates in chronological order.'); return }
    controller.current?.abort(); const pending = new AbortController(); controller.current = pending; setLoading(true)
    try { const result = await api.list(from ? { from, to } : undefined, pending.signal); if (!pending.signal.aborted) setEmployees(result.employees) } catch (failure) { if (!pending.signal.aborted) setError(messageFor(failure)) } finally { if (!pending.signal.aborted) setLoading(false) }
  }
  async function detail(id: string) {
    if (savingRef.current) return
    setLoading(false)
    controller.current?.abort(); const pending = new AbortController(); controller.current = pending; setError(''); setSelected(null); setDetailLoading(true)
    try { const employee = await api.detail(id, pending.signal); if (!pending.signal.aborted) setSelected(employee) } catch (failure) { if (!pending.signal.aborted) setError(messageFor(failure)) } finally { if (controller.current === pending) setDetailLoading(false) }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (savingRef.current) return
    const form = event.currentTarget; const data = new FormData(form)
    const input = { name: String(data.get('name')).trim(), department: String(data.get('department')).trim(), startDate: String(data.get('startDate')), role: String(data.get('role')).trim() }
    if (!input.name || !input.department || !input.role || !input.startDate) { setError('Complete all employee fields.'); return }
    savingRef.current = true; setSaving(true); setError(''); setNotice('')
    setDetailLoading(false)
    const pending = new AbortController(); controller.current?.abort(); controller.current = pending
    try {
      const employee = await api.create(input, pending.signal)
      if (pending.signal.aborted) return
      setSelected(employee); setNotice(`Employee created: ${employee.employeeId}`); setShowCreate(false)
      const result = await api.list(undefined, pending.signal); if (!pending.signal.aborted) { setEmployees(result.employees); setFrom(''); setTo('') }
    } catch (failure) { if (!pending.signal.aborted) setError(messageFor(failure)) } finally { savingRef.current = false; setSaving(false); setLoading(false) }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">THE PEOPLE BEHIND THE WORK</p><h1>Your people, connected.</h1><p>Find a colleague. Welcome someone new. Keep your team in view.</p></div><button className="primary" data-testid="employee-add" onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate}>＋ Add employee</button></div>
    <div className="summary-row"><div className="summary-card"><span>DIRECTORY RESULTS</span><strong>{loading ? '—' : employees.length}</strong><small>Employees in the current response</small></div><div className="welcome-card"><span className="sparkle" aria-hidden="true">✳</span><div><h2>A helping hand for your HR day.</h2><p>Use the AI assistant to work with employee records, leave, and HR email.</p></div></div></div>
    {error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}{detailLoading && <p role="status">Loading employee details…</p>}
    {showCreate && <section className="panel"><h2>Welcome a new colleague</h2><form data-testid="employee-create-form" onSubmit={create} className="form-grid">
      <label>Full name<input data-testid="employee-name" name="name" required maxLength={200} /></label><label>Department<input data-testid="employee-department" name="department" required maxLength={120} /></label>
      <label>Start date<input data-testid="employee-start-date" name="startDate" type="date" required /></label><label>Role<input data-testid="employee-role" name="role" defaultValue="employee" required maxLength={80} /></label>
      <div className="form-actions"><button className="primary" data-testid="employee-save" disabled={saving}>{saving ? 'Creating…' : 'Create employee'}</button><button type="button" data-testid="employee-cancel" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button></div>
    </form></section>}
    <section className="panel directory"><div className="panel-heading"><div><h2>Employee directory</h2><p>Browse people or filter by hire date.</p></div><span className="tag">PEOPLE</span></div>
      <form className="filters" data-testid="employee-filter-form" onSubmit={filter}><label>Hired from<input data-testid="hired-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Hired through<input data-testid="hired-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button data-testid="employee-filter" disabled={loading}>Apply filter</button></form>
      {loading ? <p role="status" className="empty-state">Loading your people…</p> : employees.length === 0 ? <p className="empty-state" role="status">No employees found. Try another date range or add a colleague.</p> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>Department</th><th>Start date</th><th>Role</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.employeeId}><td><div className="person"><span className="person-avatar" aria-hidden="true">{employee.name.slice(0, 1)}</span><div><strong>{employee.name}</strong><small>{employee.employeeId}</small></div></div></td><td>{employee.department}</td><td>{employee.startDate}</td><td><span className="role-tag">{employee.role}</span></td><td><button data-testid="employee-detail" aria-label={`View ${employee.name}`} onClick={() => void detail(employee.employeeId)}>View ↗</button></td></tr>)}</tbody></table></div>}
      <p className="table-note">Showing records returned by the HR service. Additional pages are not available from this API.</p>
    </section>
    {selected && <section className="panel detail" aria-label="Employee details"><div className="panel-heading"><h2>{selected.name}</h2><button data-testid="employee-detail-close" onClick={() => setSelected(null)}>Close details</button></div><dl><dt>Employee ID</dt><dd>{selected.employeeId}</dd><dt>Department</dt><dd>{selected.department}</dd><dt>Start date</dt><dd>{selected.startDate}</dd><dt>Role</dt><dd>{selected.role}</dd></dl></section>}
  </>
}
