import { useMemo } from 'react'
import QRCode from 'qrcode'

/** Generate locally: invitation codes are never sent to a QR image service. */
export default function InvitationQr({ url }) {
  const { modules } = useMemo(() => QRCode.create(url, { errorCorrectionLevel: 'M' }), [url])
  const size = modules.size, quiet = 4
  const path = Array.from(modules.data).flatMap((dark, index) => dark ? [`M${index % size + quiet} ${Math.floor(index / size) + quiet}h1v1h-1z`] : []).join('')
  return <svg className="class-invitation-qr" role="img" aria-label="Scan to join this class" viewBox={`0 0 ${size + quiet * 2} ${size + quiet * 2}`} shapeRendering="crispEdges" style={{ colorScheme: 'only light', forcedColorAdjust: 'none' }}>
    <rect width="100%" height="100%" fill="#fff" /><path d={path} fill="#000" style={{ fill: '#000' }} />
  </svg>
}
