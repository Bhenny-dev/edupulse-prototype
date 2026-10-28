import kcpCrest from '../assets/kcp/kcp-crest.webp'
import citEmblem from '../assets/kcp/college-cit.webp'
import cabmEmblem from '../assets/kcp/college-cabm.webp'
import ccjeEmblem from '../assets/kcp/college-ccje.webp'
import cotEmblem from '../assets/kcp/college-cot.webp'
import ctelaEmblem from '../assets/kcp/college-ctela.webp'
import citPhoto from '../assets/kcp/cit-lab.webp'
import cabmPhoto from '../assets/kcp/bg-cabm.webp'
import ccjePhoto from '../assets/kcp/bg-ccje.webp'
import cotPhoto from '../assets/kcp/bg-cot.webp'
import ctelaPhoto from '../assets/kcp/bg-ctela.webp'

// Emblems were supplied by the project owner; photographs come from kcp.edu.ph
// (each college's card image on the KCP home page). Facts below are taken from
// the emblems and kcp.edu.ph only. Nothing here is invented.
export const KCP = {
  name: "King's College of the Philippines",
  founded: 2004,
  address: 'Km5 Pico Rd, La Trinidad, 2601 Benguet',
  website: 'https://kcp.edu.ph/',
  vision: "Transforming the youth to become exemplars in their chosen careers, the King's College of the Philippines envisions each generation of globally competitive professionals to love God, lead the nation, and light the world.",
  crest: kcpCrest,
}

// EduPulse serves one college at a time (FR-REV-08 scopes oversight to the CIT).
// A college moves to `active` when its instructors are registered and its records are imported.
export const COLLEGES = [
  {
    code: 'CIT', name: 'College of Information Technology', status: 'active', emblem: citEmblem, photo: citPhoto,
    programs: ['BS Information Technology: Web and Mobile Application Development', 'BS Information Technology: Business Analytics and Big Data'],
  },
  { code: 'CABM', name: 'College of Accountancy and Business Management', status: 'onboarding', emblem: cabmEmblem, photo: cabmPhoto },
  { code: 'CCJE', name: 'College of Criminal Justice Education', status: 'onboarding', emblem: ccjeEmblem, photo: ccjePhoto, since: 2006 },
  { code: 'COT', name: 'College of Theology', status: 'onboarding', emblem: cotEmblem, photo: cotPhoto, since: 2010, motto: 'Instructi ad Transformandum' },
  { code: 'CTELA', name: 'College of Teacher Education and Liberal Arts', status: 'onboarding', emblem: ctelaEmblem, photo: ctelaPhoto, motto: 'Equipped to Transform' },
]
