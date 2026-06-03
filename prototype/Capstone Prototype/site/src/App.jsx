import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import MigrationNotice from "./components/MigrationNotice";
import Home from "./pages/Home";
import Neighborhoods from "./pages/Neighborhoods";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import SpaceDetail from "./pages/SpaceDetail";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import HostTools from "./pages/HostTools";
import HostAnalytics from "./pages/HostAnalytics";
import UserDashboard from "./pages/UserDashboard";

const NOTICE_DISMISS_KEY = "migrationNoticeDismissed";

export default function App() {
  const [noticeOpen, setNoticeOpen] = useState(() => {
    try {
      return localStorage.getItem(NOTICE_DISMISS_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const closeNotice = () => {
    try {
      localStorage.setItem(NOTICE_DISMISS_KEY, "true");
    } catch {
      // ignore storage errors (e.g. private mode)
    }
    setNoticeOpen(false);
  };

  return (
    <UserProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
          <MigrationNotice open={noticeOpen} onClose={closeNotice} />
          <NavBar onOpenNotice={() => setNoticeOpen(true)} />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/neighborhoods" element={<Neighborhoods />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/spaces/:id" element={<SpaceDetail />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/host" element={<HostTools />} />
              <Route path="/host/analytics" element={<HostAnalytics />} />
              <Route path="/dashboard" element={<UserDashboard />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}
