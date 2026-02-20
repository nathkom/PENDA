import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, User } from "lucide-react";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/neighborhoods", label: "Neighborhoods" },
  { to: "/events", label: "Events" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const location = useLocation();
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const activeIndex = NAV_LINKS.findIndex(({ to, end }) =>
      end ? location.pathname === to : location.pathname.startsWith(to)
    );

    if (activeIndex >= 0 && itemRefs.current[activeIndex] && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const itemRect = itemRefs.current[activeIndex].getBoundingClientRect();
      setSliderStyle({
        left: itemRect.left - containerRect.left,
        width: itemRect.width,
      });
    }
  }, [location.pathname]);

  const mobileLinkClass = ({ isActive }) =>
    isActive
      ? "bg-gray-900 text-white font-semibold px-5 py-2 rounded-full transition-colors"
      : "text-gray-700 font-medium px-5 py-2 rounded-full hover:bg-gray-200 transition-colors";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-green-700 tracking-tight"
          aria-label="Third Space Finder home"
        >
          ThirdSpace
        </Link>

        {/* Desktop pill nav */}
        <ul
          ref={containerRef}
          className="hidden md:flex items-center relative list-none bg-gray-100 rounded-full p-1"
          role="list"
        >
          {/* Sliding dark pill */}
          <div
            aria-hidden="true"
            className="absolute top-1 bottom-1 bg-gray-900 rounded-full pointer-events-none"
            style={{
              left: sliderStyle.left,
              width: sliderStyle.width,
              transition: "left 300ms ease, width 300ms ease",
            }}
          />

          {NAV_LINKS.map(({ to, label, end }, i) => (
            <li key={to} ref={(el) => (itemRefs.current[i] = el)}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative z-10 block font-medium px-5 py-2 rounded-full whitespace-nowrap ${
                    isActive
                      ? "text-white font-semibold"
                      : "text-gray-700 hover:text-gray-900"
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Sign in button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/signin"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-700 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
            aria-label="Sign in"
          >
            <User size={16} />
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-gray-700 hover:text-green-700"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={mobileLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          <Link
            to="/signin"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-700 text-green-700 text-sm font-medium w-fit hover:bg-green-50 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            <User size={16} />
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
}
