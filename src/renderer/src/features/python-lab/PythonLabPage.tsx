import { pythonLab } from '../../content'
import { LevelMapPage } from '../labs/LevelMapPage'

export default function PythonLabPage() {
  return (
    <LevelMapPage
      lab={pythonLab}
      subtitle="Practise Python on data-analysis tasks. It runs offline, right inside the app."
    />
  )
}
