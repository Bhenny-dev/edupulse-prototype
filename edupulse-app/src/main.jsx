import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext'

// The web fonts are requested beside the first paint, not in front of it (index.html keeps a
// <noscript> copy of the same stylesheet).
const fonts = document.createElement('link')
fonts.rel = 'stylesheet'
fonts.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700;800&family=Patrick+Hand&family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap'
document.head.append(fonts)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
