import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import Sidebar from './Sidebar'
import { FullScreenHint } from './FullScreenHint'
import { ToastHost } from './ToastHost'
import DashboardPage from '../features/dashboard/DashboardPage'
import LearnPage from '../features/learn/LearnPage'
import LessonRoute from '../features/learn/LessonPage'
import SqlLabPage from '../features/sql-lab/SqlLabPage'
import SqlLevelRoute from '../features/sql-lab/SqlLevelPage'
import PythonLabPage from '../features/python-lab/PythonLabPage'
import PythonLevelRoute from '../features/python-lab/PythonLevelPage'
import AcademyPage from '../features/academy/AcademyPage'
import CaseRoute from '../features/academy/CasePage'
import ProgressPage from '../features/progress/ProgressPage'
import ReviewPage from '../features/review/ReviewPage'
import PlaygroundPage from '../features/playground/PlaygroundPage'
import NotesPage from '../features/notes/NotesPage'
import SettingsPage from '../features/settings/SettingsPage'
import { useProgress } from '../lib/ProgressContext'
import { useTheme } from '../lib/theme'

export default function App() {
  const { progress, saveError } = useProgress()
  const location = useLocation()
  const main = useRef<HTMLElement>(null)
  useTheme(progress?.settings.theme)

  // Start each page at the top.
  useEffect(() => {
    main.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex h-full">
      <Sidebar />
      <FullScreenHint />
      {progress && <ToastHost />}
      <main ref={main} className="min-w-0 flex-1 overflow-y-auto">
        {saveError && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-800" role="alert">
            Your progress could not be saved: {saveError}
          </div>
        )}
        {progress && (
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/:lessonId" element={<LessonRoute />} />
            <Route path="/sql" element={<SqlLabPage />} />
            <Route path="/sql/:levelId" element={<SqlLevelRoute />} />
            <Route path="/python" element={<PythonLabPage />} />
            <Route path="/python/:levelId" element={<PythonLevelRoute />} />
            <Route path="/academy" element={<AcademyPage />} />
            <Route path="/academy/:caseId" element={<CaseRoute />} />
            <Route path="/academy/:caseId/:tab" element={<CaseRoute />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
