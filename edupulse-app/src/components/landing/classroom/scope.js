// How the agents scope sits on the screen, shared by the page (AgentsSection) and the 3D school
// (world.js), so the camera can end exactly on the clock the scope draws over.
export const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72

// The scope is a square, centred under the bar's half height: as large as the screen allows
// beside the cards, a little smaller on a phone.
export const scopeSize = (W, H) => (W <= 640 ? Math.min(0.94 * W, 0.58 * H) : Math.min(0.92 * W, H - 150))

// The outer ring of the scope, as a fraction of its width: the clock's rim is drawn to match.
export const OUTER = 0.48

// Where the scope's opening ends along the page's scroll: the pinned timeline has a label at the
// moment the clock has become the scope (AgentsSection). Until then the school shows behind it.
export function openingEnd(pin, fallback) {
  const timeline = pin?.animation
  if (!timeline || timeline.labels.opened === undefined) return fallback
  return pin.start + ((pin.end - pin.start) * timeline.labels.opened) / Math.max(0.001, timeline.duration())
}
