import { NavLink, Outlet } from 'react-router-dom'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `layout__nav-link${isActive ? ' layout__nav-link--active' : ''}`

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <NavLink to="/" className="layout__brand" end>
          <span className="layout__brand-mark" aria-hidden />
          <span className="layout__brand-text">每日面试</span>
        </NavLink>
        <nav className="layout__nav" aria-label="主导航">
          <NavLink to="/" className={navLinkClass} end>
            最新
          </NavLink>
          <NavLink to="/history" className={navLinkClass}>
            历史
          </NavLink>
          <NavLink to="/practice" className={navLinkClass}>
            刷题
          </NavLink>
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
      <footer className="layout__footer">
        <p className="layout__footer-note">
          题库索引：<code className="inline-code">/questions/meta.json</code>；题目分块：
          <code className="inline-code">/questions/chunks/*.json</code>
        </p>
      </footer>
    </div>
  )
}
