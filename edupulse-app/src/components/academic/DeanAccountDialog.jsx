import { useState } from 'react'
import { GraduationCap, UserRound } from 'lucide-react'
import { DeanDialog } from './DeanCommon'
import { staffPassword } from './deanActions'
import { CIT_PROGRAMS, initialStudentPassword, normalizeBlock, studentEmail } from './eduSuiteImport'

const field = (label, input, hint) => <label className="dean-field"><span>{label}</span>{input}{hint && <small className="text-xs text-muted">{hint}</small>}</label>

/** Add or edit one instructor or student account. Students follow the official surname@123 sign-in convention. */
export default function DeanAccountDialog({ role, account, blocks = [], action, onClose }) {
  const student = role === 'student', editing = Boolean(account)
  const currentPlacement = !account ? 'block' : /irreg/i.test(account.type || '') || account.block === 'IRREGULAR' ? 'irregular' : account.block ? 'block' : 'none'
  const [form, setForm] = useState(() => ({
    surname: account?.surname || '', first_name: account?.first_name || '', middle_name: account?.middle_name || '', email: account?.email || '',
    employee_id: account?.employee_id || '', has_masters: Boolean(account?.has_masters), degree: account?.degree || '', specialization: account?.specialization || '',
    student_number: account?.student_number || '', year_level: account?.year_level || 1, program: account?.program || CIT_PROGRAMS[0] || '',
    placement: currentPlacement, block: account?.block && account.block !== 'IRREGULAR' ? account.block : blocks[0] || '', newBlock: '',
  }))
  const [problem, setProblem] = useState('')
  const set = name => event => setForm(prior => ({ ...prior, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const name = [form.first_name, form.middle_name, form.surname].filter(Boolean).join(' ')
  const submit = async event => {
    event.preventDefault(); setProblem('')
    if (!form.surname.trim() || !form.first_name.trim()) return setProblem('Enter the surname and first name.')
    const block = form.block === '__new' ? normalizeBlock(form.newBlock, blocks) : form.block
    if (student && !/^[A-Za-z0-9-]{1,80}$/.test(form.student_number.trim())) return setProblem('Enter the official student number.')
    if (student && form.placement === 'block' && !block) return setProblem('Choose or type the block section.')
    const email = (form.email.trim() || (student ? studentEmail(form.student_number) : '')).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setProblem('Enter a valid sign-in email.')
    const base = { surname: form.surname.trim(), first_name: form.first_name.trim(), middle_name: form.middle_name.trim(), email }
    const details = student
      ? { student_number: form.student_number.trim(), year_level: Number(form.year_level), program: form.program, placement: editing && form.placement === currentPlacement && (form.placement !== 'block' || block === account.block) ? 'none' : form.placement, ...(form.placement === 'block' ? { block } : {}) }
      : { employee_id: form.employee_id.trim(), has_masters: form.has_masters, degree: form.degree.trim(), specialization: form.specialization.trim() }
    if (editing) {
      const saved = await action.run(`Saving ${name}`, { action: 'account.update', account: { id: account.id, ...base, ...details } }, () => ({ text: `${name}'s account was updated.` }))
      if (saved) onClose()
      return
    }
    const password = student ? initialStudentPassword(base.surname, base.first_name) : staffPassword()
    const saved = await action.run(`Adding ${name}`, { action: 'account.create', account: { role, ...base, ...details, password } },
      result => ({ text: `${name} ${result.restored ? 'was restored' : 'was added'} as ${student ? 'a student' : 'an instructor'}. Sign-in email: ${result.email}.`, secret: password }))
    if (saved) onClose()
  }
  const title = `${editing ? 'Edit' : 'Add'} ${student ? 'student' : 'instructor'}`
  return <DeanDialog title={title} subtitle={editing ? name : student ? 'Creates the student sign-in and places the student in a block or as irregular.' : 'Creates the instructor sign-in. Course loads are assigned on the Course page.'}
    icon={student ? UserRound : GraduationCap} tone={student ? 'green' : 'purple'} size="form" onClose={onClose}
    footer={<><button className="btn btn-secondary" onClick={onClose} disabled={Boolean(action.busy)}>Cancel</button><button className="btn btn-primary" type="submit" form="dean-account-form" disabled={Boolean(action.busy)}>{action.busy ? `${action.busy}…` : editing ? 'Save changes' : title}</button></>}>
    <form id="dean-account-form" className="dean-form" onSubmit={submit} noValidate>
      {(problem || action.error) && <p role="alert" className="connected-pulse-warning">{problem || action.error}</p>}
      {student && field('Student number', <input className="form-input" value={form.student_number} onChange={set('student_number')} disabled={editing} required autoComplete="off" />, editing ? 'The official student number cannot be changed.' : 'Exactly as written in EduSuite.')}
      <div className="dean-form-row">
        {field('Surname', <input className="form-input" value={form.surname} onChange={set('surname')} required autoComplete="off" />)}
        {field('First name', <input className="form-input" value={form.first_name} onChange={set('first_name')} required autoComplete="off" />)}
        {field('Middle name', <input className="form-input" value={form.middle_name} onChange={set('middle_name')} autoComplete="off" />)}
      </div>
      {field('Sign-in email', <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder={student && form.student_number ? studentEmail(form.student_number) : 'name@edupulse.com'} autoComplete="off" />, student && !editing ? 'Leave blank to use the student number address. The initial password is the surname followed by @123.' : !editing ? 'A strong initial password is generated and shown once.' : undefined)}
      {student ? <>
        <div className="dean-form-row">
          {field('Year level', <select className="form-select" value={form.year_level} onChange={set('year_level')}>{[1, 2, 3, 4].map(year => <option key={year} value={year}>Year {year}</option>)}</select>)}
          {field('Program', <select className="form-select" value={form.program} onChange={set('program')}>{[...new Set([...CIT_PROGRAMS, form.program].filter(Boolean))].map(program => <option key={program}>{program}</option>)}</select>)}
        </div>
        <fieldset className="dean-placement"><legend>Placement</legend>
          {[['block', 'Block section'], ['irregular', 'Irregular (classes by subject)'], ['none', 'Not placed yet']].map(([value, label]) => <label key={value}><input type="radio" name="placement" value={value} checked={form.placement === value} onChange={set('placement')} /> {label}</label>)}
          {form.placement === 'block' && <div className="dean-form-row">
            {field('Block', <select className="form-select" value={form.block} onChange={set('block')}>{blocks.map(block => <option key={block}>{block}</option>)}<option value="__new">New block…</option></select>)}
            {form.block === '__new' && field('New block', <input className="form-input" value={form.newBlock} onChange={set('newBlock')} placeholder="BSIT-1A" />)}
          </div>}
          {form.placement === 'irregular' && <p className="text-sm text-muted">Irregular students join classes through the EduSuite student list upload, which reads the subjects and sections they attend.</p>}
        </fieldset>
      </> : <>
        <div className="dean-form-row">
          {field('Employee ID', <input className="form-input" value={form.employee_id} onChange={set('employee_id')} autoComplete="off" />)}
          {field('Specialization', <input className="form-input" value={form.specialization} onChange={set('specialization')} placeholder="Networking, Web development…" />)}
        </div>
        <label className="dean-check"><input type="checkbox" checked={form.has_masters} onChange={set('has_masters')} /> Has a master's degree</label>
        {field('Highest degree', <input className="form-input" value={form.degree} onChange={set('degree')} placeholder="Master in Information Technology" />)}
      </>}
    </form>
  </DeanDialog>
}
