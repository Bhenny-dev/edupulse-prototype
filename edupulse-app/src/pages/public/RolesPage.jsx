import { Briefcase, Check, GraduationCap, Grid3x3, Landmark, Lock, Presentation, ServerCog, Shapes, Triangle } from 'lucide-react'
import RoomPage, { DetailCard, Extra } from '../../components/public/RoomPage'
import { ROLES } from '../../components/landing/content'

const LOOK = {
  instructor: { icon: Presentation, tint: '#3b82f6', solid: 'Cube' },
  student: { icon: GraduationCap, tint: '#f59e0b', solid: 'Sphere' },
  dean: { icon: Landmark, tint: '#10b981', solid: 'Pyramid' },
  associate_dean: { icon: Briefcase, tint: '#ec4899', solid: 'Cylinder' },
  admin: { icon: ServerCog, tint: '#8b5cf6', solid: 'Ring' },
}
const ITEMS = [
  ...ROLES.map(role => ({ key: role.key, short: role.label, ...LOOK[role.key] })),
  { key: 'matrix', short: 'The board', icon: Grid3x3, tint: '#2563eb' },
  { key: 'solids', short: 'The abacus', icon: Triangle, tint: '#10b981' },
]

function detail(key) {
  if (key === 'matrix') return <Extra icon={Grid3x3} tint="#2563eb" title="Who opens what"><Matrix /></Extra>
  if (key === 'solids') return <Extra icon={Triangle} tint="#10b981" title="One account, one role"><Solids /></Extra>
  const role = ROLES.find(entry => entry.key === key)
  const look = LOOK[key]
  return (
    <DetailCard icon={look.icon} tint={look.tint} kicker={`${look.solid} · ${role.kicker}`} name={role.label} words={role.tasks.map(([, text]) => text)}>
      {role.boundary && <p className="ps-note"><Lock size={14} aria-hidden="true" /> {role.boundary}</p>}
    </DetailCard>
  )
}

// Which pages each role opens, as a grid of ticks.
function Matrix() {
  const pages = [...new Set(ROLES.flatMap(role => role.sections))]
  return (
    <div className="ps-matrix-wrap">
      <table className="ps-matrix">
        <caption className="sr-only">Pages each role can open</caption>
        <thead>
          <tr><th scope="col"><span className="sr-only">Page</span></th>{ROLES.map(role => <th key={role.key} scope="col" style={{ '--tint': LOOK[role.key].tint }}>{role.label}</th>)}</tr>
        </thead>
        <tbody>
          {pages.map(page => (
            <tr key={page}>
              <th scope="row">{page}</th>
              {ROLES.map(role => (
                <td key={role.key} style={{ '--tint': LOOK[role.key].tint }}>
                  {role.sections.includes(page) ? <span className="ps-tick"><Check size={15} strokeWidth={3} aria-hidden="true" /><span className="sr-only">Yes</span></span> : <span className="ps-dash" aria-label="No">–</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// One account, one role: five shapes, one each.
function Solids() {
  return (
    <ul className="ps-solids">
      {ROLES.map(role => {
        const look = LOOK[role.key]
        return (
          <li key={role.key} style={{ '--tint': look.tint }}>
            <i aria-hidden="true"><look.icon size={22} strokeWidth={2.2} /></i>
            <b>{role.label}</b>
            <span>{role.kicker}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default function RolesPage() {
  return (
    <RoomPage theme="math" room="Math room" icon={Shapes} tint="#d97706" title="Five roles, five shapes." lead="Tap a shape, the board or the abacus." items={ITEMS} detail={detail} />
  )
}
