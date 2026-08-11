import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

const NAV_ITEMS = [
  { to: '/questions', label: 'Answer' },
  { to: '/add', label: 'Ask' },
  { to: '/yourquestions', label: 'Yours' },
  { to: '/user', label: 'Profile' },
] as const;

export function Header() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFlipped, setLogoFlipped] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click and on Escape — a menu you can only close by
  // clicking its own button is a keyboard trap.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="header">
      <div className="header__inner">
        {/* The v1 easter egg: clicking the logo inverts it. Kept, but as a real
            labelled button rather than a DOM src swap. */}
        <button
          type="button"
          className="header__logo"
          onClick={() => setLogoFlipped((flipped) => !flipped)}
          aria-label="DeSide home — click the logo for a surprise"
        >
          <img
            src={logoFlipped ? '/images/logo_reverse.png' : '/images/logo.png'}
            alt=""
            width={32}
            height={32}
          />
          <span>DeSide</span>
        </button>

        <nav className="header__nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className="header__link">
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__menu" ref={menuRef}>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span aria-hidden="true">☰</span>
            <span className="sr-only">More options</span>
          </button>

          {menuOpen && (
            <div className="header__menu-panel" role="menu">
              <Link
                to="/help"
                role="menuitem"
                className="header__menu-item"
                onClick={() => setMenuOpen(false)}
              >
                Help
              </Link>
              <button
                type="button"
                role="menuitem"
                className="header__menu-item"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
