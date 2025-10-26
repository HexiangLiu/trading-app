import { useAtom } from 'jotai'

import { darkModeAtom } from '../store/theme'
import { Content } from './content'

const TradingLayout: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useAtom(darkModeAtom)

  return (
    <div
      className={`w-dvw h-dvh overflow-y-auto ${isDarkMode ? 'dark' : ''} ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="w-full h-full">
        <div className="flex justify-between items-center mb-1 dark:bg-neutral-900 bg-gray-100">
          <h1
            className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Trading Dashboard
          </h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div>
          <Content />
        </div>
      </div>
    </div>
  )
}

export default TradingLayout
