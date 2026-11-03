import { Route, Routes } from 'react-router-dom'
import Layout from './app/Layout'
import Dashboard from './features/dashboard/Dashboard'
import Page from './components/Page'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="analizar" element={<Page title="Analizar" text="Aquí subirás videos y fotos para analizar tu técnica." />} />
        <Route path="estadisticas" element={<Page title="Estadísticas" text="Marcas, tendencias y evolución por sesión." />} />
        <Route path="brain" element={<Page title="VELOCITY BRAIN" text="Tu asistente deportivo con IA." />} />
        <Route path="perfil" element={<Page title="Perfil" text="Tus datos, especialidades y privacidad." />} />
      </Route>
    </Routes>
  )
}
