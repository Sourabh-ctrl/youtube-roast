import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Flame, Menu, X } from 'lucide-react'
import Button from '../common/Button.jsx'
import { useAuth } from '../../hooks/useAuth.js'

const links = [
  { hash: '#how-it-works', label: 'How it works' },
  { hash: '#features', label: 'Features' },
  { hash: '#privacy', label: 'Privacy' },
]

export default function Navbar({ ctaHref }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, status } = useAuth()
  const signedIn = status === 'ready' && Boolean(user)
  const linkHref = (hash) => (pathname === '/' ? hash : `/${hash}`)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent-500 text-white">
            <Flame className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">RoastTube</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.hash}
              href={linkHref(link.hash)}
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:bg-accent-50 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          {signedIn ? (
            <Button as={Link} to="/dashboard" className="ml-3">
              Dashboard
            </Button>
          ) : (
            <Button as="a" href={ctaHref} className="ml-3">
              Get roasted
            </Button>
          )}
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-accent-50 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-line bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {links.map((link) => (
              <a
                key={link.hash}
                href={linkHref(link.hash)}
                className="rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-accent-50 hover:text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {signedIn ? (
              <Button as={Link} to="/dashboard" className="mt-2 w-full" onClick={() => setOpen(false)}>
                Dashboard
              </Button>
            ) : (
              <Button as="a" href={ctaHref} className="mt-2 w-full">
                Get roasted
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
