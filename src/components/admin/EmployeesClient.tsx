'use client'
import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import toast from 'react-hot-toast'
import { Plus, X, Check, Trash2, Edit2, Sun, Moon, Eye, EyeOff, KeyRound, Download, Upload } from 'lucide-react'
import { formatDate, roleBadge, shiftBadge, avatarColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { COLOR } from '@/lib/design'
import * as XLSX from 'xlsx'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'employee', shift: 'day', magicKey: '0000', totalHolidays: 28 }

export function EmployeesClient({ employees: initial }: { employees: any[] }) {
  const [employees, setEmployees] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo('.emp-row', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if ((showForm || editing) && formRef.current) {
      gsap.fromTo(formRef.current, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' })
    }
  }, [showForm, editing])

  function openEdit(emp: any) {
    setEditing(emp)
    setForm({ name: emp.name, email: emp.email, password: '', role: emp.role, shift: emp.shift, magicKey: emp.magicKey || '0000', totalHolidays: emp.totalHolidays })
    setShowForm(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload: any = { ...form }
    if (!payload.password) delete payload.password

    if (editing) {
      const res = await fetch(`/api/employees/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json()
        setEmployees(prev => prev.map(e => e.id === editing.id ? { ...e, ...updated } : e))
        toast.success('Employee updated!')
        setEditing(null)
      } else toast.error('Failed to update')
    } else {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setEmployees(prev => [...prev, data])
        toast.success('Employee added!')
        setShowForm(false)
      } else toast.error(data.error || 'Failed to add')
    }
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEmployees(prev => prev.filter(e => e.id !== id))
      toast.success('Employee removed')
    } else toast.error('Failed to remove')
  }

  const isFormOpen = showForm || !!editing

  // ── Download employees as xlsx ──
  function handleDownload() {
    const rows = employees.map(e => ({
      Name: e.name,
      Email: e.email,
      Role: e.role,
      Shift: e.shift,
      'Total Holidays': e.totalHolidays,
      'Used Holidays': e.usedHolidays,
      'Joined': formatDate(e.createdAt),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Employees')
    XLSX.writeFile(wb, 'employees.xlsx')
    toast.success('Downloaded!')
  }

  // ── Upload employees from xlsx ──
  const uploadRef = useRef<HTMLInputElement>(null)
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
        let added = 0
        for (const row of rows) {
          const payload = {
            name: row['Name']?.toString().trim(),
            email: row['Email']?.toString().trim(),
            password: row['Password']?.toString().trim() || 'password123',
            role: row['Role']?.toString().trim() || 'employee',
            shift: row['Shift']?.toString().trim() || 'day',
            totalHolidays: parseInt(row['Total Holidays']) || 28,
          }
          if (!payload.name || !payload.email) continue
          const res = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (res.ok) { const d = await res.json(); setEmployees(prev => [...prev, d]); added++ }
        }
        toast.success(`Added ${added} employee(s)`)
      } catch { toast.error('Invalid file format') }
      if (uploadRef.current) uploadRef.current.value = ''
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Employees</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{employees.length} team members</p>
        </div>
      <div className="flex items-center gap-2">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
        <button onClick={handleDownload} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Download
        </button>
        <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
        <button onClick={() => uploadRef.current?.click()} className="btn-secondary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>
      </div>

      {isFormOpen && (
        <div ref={formRef} className="card border border-brand-600/30">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{editing ? `Edit: ${editing.name}` : 'Add New Employee'}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null) }}>
              <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required placeholder="John Smith" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} required placeholder="john@company.com" />
            </div>
            <div>
              <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  value={form.password}
                  onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))}
                  required={!editing}
                  placeholder={editing ? 'Leave blank to keep current' : 'password123'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
            </div>
            <div>
              <label className="label">Shift</label>
              <select className="input" value={form.shift} onChange={e => setForm((f: any) => ({ ...f, shift: e.target.value }))}>
                <option value="day">Day (08:00–16:00)</option>
                <option value="night">Night (16:00–00:00)</option>
              </select>
            </div>
            <div>
              <label className="label">Total Holidays (days/year)</label>
              <input type="number" min={0} max={365} className="input" value={form.totalHolidays} onChange={e => setForm((f: any) => ({ ...f, totalHolidays: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Magic Key (4 digits)</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  className="input"
                  value={form.magicKey}
                  onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setForm((f: any) => ({ ...f, magicKey: e.target.value })) }}
                  placeholder="0000"
                />
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Add Employee'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-base)' }}>
              {['Employee', 'Email', 'Role', 'Shift', 'Magic Key', 'Holidays', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="emp-row border-b transition-colors"
                style={{ borderColor: 'var(--border-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0', avatarColor(emp.name))}>
                      {emp.name.charAt(0)}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{emp.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                <td className="py-3 px-4">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', roleBadge(emp.role))}>
                    {emp.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium w-fit px-2.5 py-1 rounded-full', shiftBadge(emp.shift))}>
                    {emp.shift === 'day' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                    {emp.shift}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span style={{ color: 'var(--text-primary)' }}>{emp.usedHolidays}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/{emp.totalHolidays}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 flex items-center gap-1.5 w-fit">
                    <KeyRound className="w-3 h-3" />{emp.magicKey || '—'}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(emp.createdAt)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand-text)'; e.currentTarget.style.backgroundColor = 'var(--brand-subtle)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = '' }}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(emp.id, emp.name)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = COLOR.errorRed; e.currentTarget.style.backgroundColor = COLOR.errorRedBg }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = '' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
