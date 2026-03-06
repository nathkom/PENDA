import { useState, useRef, useEffect } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Search,
  Bookmark,
} from "lucide-react";
import { useUser } from "../context/UserContext";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/neighborhoods", label: "Neighborhoods" },
  { to: "/events", label: "Events" },
];

export default function NavBar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const [navSearch, setNavSearch] = useState("");
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const profileRef = useRef(null);

  const isEventsPage = location.pathname === "/events";

  // Sync navSearch with URL when navigating to/from events page
  useEffect(() => {
    if (isEventsPage) {
      setNavSearch(searchParams.get("q") || "");
    } else {
      setNavSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEventsPage]);

  // Sliding pill animation
  useEffect(() => {
    const activeIndex = NAV_LINKS.findIndex(({ to, end }) =>
      end ? location.pathname === to : location.pathname.startsWith(to),
    );
    if (
      activeIndex >= 0 &&
      itemRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const itemRect = itemRefs.current[activeIndex].getBoundingClientRect();
      setSliderStyle({
        left: itemRect.left - containerRect.left,
        width: itemRect.width,
      });
    }
  }, [location.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  function handleLogout() {
    setUser(null);
    setProfileOpen(false);
    setMenuOpen(false);
    navigate("/");
  }

  function handleNavSearch(val) {
    setNavSearch(val);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val.trim()) next.set("q", val);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "U";

  const mobileLinkClass = ({ isActive }) =>
    isActive
      ? "bg-gray-900 text-white font-semibold px-5 py-2 rounded-full transition-colors"
      : "text-gray-700 font-medium px-5 py-2 rounded-full hover:bg-gray-200 transition-colors";

  // Shared transition timing
  const T = "cubic-bezier(0.4,0,0.2,1)";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-2">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-white bg-[#5F77A5] px-3 py-1.5 rounded-lg tracking-tight shrink-0"
          aria-label="Common Grounds home"
        >
          Common Grounds
        </Link>

        {/* ── Desktop center: pill nav ↔ search bar ── */}
        <div className="hidden md:flex flex-1 items-center justify-center overflow-hidden px-4">
          {/* Pill nav — slides right and fades out on events page */}
          <ul
            ref={containerRef}
            className="flex items-center relative list-none bg-gray-100 rounded-full p-1 whitespace-nowrap"
            role="list"
            style={{
              maxWidth: isEventsPage ? 0 : 500,
              opacity: isEventsPage ? 0 : 1,
              overflow: "hidden",
              transition: `max-width 0.35s ${T}, opacity 0.2s ease`,
              pointerEvents: isEventsPage ? "none" : "auto",
            }}
          >
            <div
              aria-hidden="true"
              className="absolute top-1 bottom-1 bg-[#5F77A5] rounded-full pointer-events-none"
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

          {/* Search bar — grows in when on events page */}
          <div
            style={{
              maxWidth: isEventsPage ? 560 : 0,
              opacity: isEventsPage ? 1 : 0,
              overflow: "hidden",
              width: "100%",
              transition: `max-width 0.35s ${T}, opacity 0.2s ease`,
              pointerEvents: isEventsPage ? "auto" : "none",
            }}
          >
            <div className="px-1">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => handleNavSearch(e.target.value)}
                  placeholder="Search events, venues, tags…"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
                  aria-label="Search events"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Desktop right section ── */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Plain nav links — slide in on events page */}
          <div
            className="flex items-center gap-5"
            style={{
              maxWidth: isEventsPage ? 320 : 0,
              opacity: isEventsPage ? 1 : 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              transition: `max-width 0.35s ${T}, opacity 0.25s ease`,
              pointerEvents: isEventsPage ? "auto" : "none",
            }}
          >
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors px-1 ${
                    isActive
                      ? "text-gray-900 font-bold"
                      : "text-gray-500 hover:text-gray-900"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Create + button (hosts only) */}
          {user?.role === "host" && (
            <button
              onClick={() =>
                navigate("/host", { state: { section: "events" } })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#9FB366] hover:bg-[#8a9c57] text-white text-sm font-semibold transition-colors"
              aria-label="Create a new event"
            >
              Create +
            </button>
          )}

          {/* Profile or Sign In */}
          {user ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-[#9FB366] text-white font-bold text-sm flex items-center justify-center hover:bg-[#8a9c57] transition-colors focus:outline-none focus:ring-2 focus:ring-[#9FB366] focus:ring-offset-2"
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user.role === "host" ? "Event Host" : "Member"}
                    </p>
                  </div>

                  {/* Host Tools — only visible to hosts */}
                  {user.role === "host" && (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/host");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={15} className="text-gray-400" />
                      Host Tools
                    </button>
                  )}

                  {/* Profile + Bookmarks — only visible to non-hosts */}
                  {user.role !== "host" && (
                    <>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate("/dashboard");
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User size={15} className="text-gray-400" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate("/dashboard", {
                            state: { section: "bookmarks" },
                          });
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Bookmark size={15} className="text-gray-400" />
                        Bookmarks
                      </button>
                    </>
                  )}

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/signin"
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#5F77A5] text-[#5F77A5] text-sm font-medium hover:bg-[#5F77A5]/10 transition-colors"
              aria-label="Sign in"
            >
              <User size={16} />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-gray-700 hover:text-[#9FB366] ml-auto"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
          {/* Mobile search (events page only) */}
          {isEventsPage && (
            <div className="relative mb-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => handleNavSearch(e.target.value)}
                placeholder="Search events…"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

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

          <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#9FB366] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {user.role === "host" ? "Event Host" : "Member"}
                    </p>
                  </div>
                </div>

                {user.role === "host" && (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/host", { state: { section: "events" } });
                      }}
                      className="text-left bg-[#9FB366] text-white font-semibold px-5 py-2 rounded-full hover:bg-[#8a9c57] transition-colors"
                    >
                      Create +
                    </button>
                    <NavLink
                      to="/host"
                      className={mobileLinkClass}
                      onClick={() => setMenuOpen(false)}
                    >
                      Host Tools
                    </NavLink>
                  </>
                )}

                {user.role !== "host" && (
                  <>
                    <NavLink
                      to="/dashboard"
                      className={mobileLinkClass}
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </NavLink>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/dashboard", {
                          state: { section: "bookmarks" },
                        });
                      }}
                      className="text-left text-gray-700 font-medium px-5 py-2 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Bookmarks
                    </button>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="text-red-600 font-medium px-5 py-2 rounded-full hover:bg-red-50 transition-colors text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#5F77A5] text-[#5F77A5] text-sm font-medium w-fit hover:bg-[#5F77A5]/10 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <User size={16} />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
