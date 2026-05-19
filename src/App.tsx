import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { QuestionsProvider } from './context/QuestionsProvider'
import { HistoryPage } from './pages/HistoryPage'
import { LatestPage } from './pages/LatestPage'
import { PracticePage } from './pages/PracticePage'

function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL
  if (!b || b === '/' || b === './') return undefined
  return b.endsWith('/') ? b.slice(0, -1) : b
}

export default function App() {
  return (
    <QuestionsProvider>
      <BrowserRouter basename={routerBasename()}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LatestPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QuestionsProvider>
  )
}
