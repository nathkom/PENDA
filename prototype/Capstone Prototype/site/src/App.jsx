import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Neighborhoods from "./pages/Neighborhoods";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import SignIn from "./pages/SignIn";

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
          <NavBar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/neighborhoods" element={<Neighborhoods />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/signin" element={<SignIn />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}
