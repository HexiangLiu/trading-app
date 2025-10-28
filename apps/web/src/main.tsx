import { createRoot } from 'react-dom/client'
import './style.css'
import TradingLayout from './pages/layout'

const App = () => <TradingLayout />

createRoot(document.getElementById('app')!).render(<App />)
