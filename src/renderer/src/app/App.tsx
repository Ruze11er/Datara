import { Navigate, Route, Routes } from 'react-router'
import Sidebar from './Sidebar'
import DashboardPage from '../features/dashboard/DashboardPage'
import LearnPage from '../features/learn/LearnPage'
import SqlLabPage from '../features/sql-lab/SqlLabPage'
import PythonLabPage from '../features/python-lab/PythonLabPage'
import ProgressPage from '../features/progress/ProgressPage'
import SettingsPage from '../features/settings/SettingsPage'

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/sql" element={<SqlLabPage />} />
          <Route path="/python" element={<PythonLabPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
