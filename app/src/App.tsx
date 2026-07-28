import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Shell from '@/shell/Shell'
import { modules } from '@/shell/registry'
import { Welcome, ModeSelect, RequireEntry } from '@/shell/Entry'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Entry flow — full-screen, outside the shell */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/mode" element={<ModeSelect />} />
        <Route
          element={
            <RequireEntry>
              <Shell />
            </RequireEntry>
          }
        >
          {modules.map((m) => {
            const Page = m.page
            return m.route === '/' ? (
              <Route key={m.id} index element={<Page />} />
            ) : (
              <Route key={m.id} path={m.route} element={<Page />} />
            )
          })}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
