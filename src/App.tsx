import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { QuestionsProvider } from './context/QuestionsProvider'
import { HistoryPage } from './pages/HistoryPage'
import { LatestPage } from './pages/LatestPage'
import { PracticePage } from './pages/PracticePage'

export default function App() {
  return (
    <QuestionsProvider>
      <BrowserRouter>
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
