import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { clearOldDeviceData } from './data/store'
import { fillScreenWhenInstalled } from './appHeight'

// Fresh start: removes job and hazard data older versions kept on this device (it lives in MongoDB now)
clearOldDeviceData()
fillScreenWhenInstalled()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
