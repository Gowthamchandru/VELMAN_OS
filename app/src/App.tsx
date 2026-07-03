import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Shell from '@/shell/Shell'
import { modules } from '@/shell/registry'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Shell />}>
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
