import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchUserAttendance, markAttendance, unmarkAttendance } from "../lib/events";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Supabase auth bootstrap ───────────────────────────────────────────────────
  useEffect(() => {
    // Restore existing session on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchAndSetProfile(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    // Keep user in sync with auth state changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchAndSetProfile(session.user);
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchAndSetProfile(authUser) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", authUser.id)
        .single();

      console.log("[auth] profile loaded:", profile);

      const attendedIds = await fetchUserAttendance(authUser.id).catch(() => []);

      setUser({
        id:    authUser.id,
        email: authUser.email,
        name:  profile?.full_name ?? authUser.email.split("@")[0],
        role:  profile?.role ?? "user",
      });
      setAttendingEvents(new Set(attendedIds));
    } catch (err) {
      console.error("[auth] fetchAndSetProfile failed:", err);
      setUser({
        id:    authUser.id,
        email: authUser.email,
        name:  authUser.email.split("@")[0],
        role:  "user",
      });
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Auth actions ──────────────────────────────────────────────────────────────
  async function signUp(email, password, fullName, role) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Insert profile row — role is validated to prevent admin self-assignment
    if (data.user) {
      const safeRole = role === "host" ? "host" : "user";
      const { error: profileError } = await supabase.from("profiles").insert({
        id:        data.user.id,
        email,
        full_name: fullName,
        role:      safeRole,
      });
      if (profileError) throw profileError;
    }

    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  // ── Local prototype state (unchanged) ────────────────────────────────────────
  const [createdEvents, setCreatedEvents] = useState([]);
  const [deletedEventIds, setDeletedEventIds] = useState(new Set());
  const [editedEvents, setEditedEvents] = useState({});
  const [hiddenEventIds, setHiddenEventIds] = useState(new Set());
  const [createdSpaces, setCreatedSpaces] = useState([]);

  const [hostTemplates, setHostTemplates] = useState([]);
  function addHostTemplate(tpl) {
    setHostTemplates((prev) => [...prev, tpl]);
  }

  const [bookmarkedEvents, setBookmarkedEvents] = useState(() => {
    const saved = localStorage.getItem("bookmarkedEvents");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [bookmarkGroups, setBookmarkGroups] = useState([{ id: "default", name: "Saved Events" }]);
  const [eventGroupMap, setEventGroupMap] = useState({});
  const [attendingEvents, setAttendingEvents] = useState(new Set());

  function addCreatedSpace(space) {
    setCreatedSpaces((prev) => [space, ...prev]);
  }
  function deleteCreatedSpace(id) {
    setCreatedSpaces((prev) => prev.filter((s) => s.id !== id));
  }
  function updateCreatedSpace(id, updated) {
    setCreatedSpaces((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  function addCreatedEvent(event) {
    setCreatedEvents((prev) => [event, ...prev]);
  }
  function deleteEvent(id) {
    setCreatedEvents((prev) => prev.filter((e) => e.id !== id));
    setDeletedEventIds((prev) => new Set([...prev, id]));
  }
  function hideEvent(id) {
    setHiddenEventIds((prev) => new Set([...prev, id]));
  }
  function showEvent(id) {
    setHiddenEventIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }

  function updateEvent(id, updatedEvent) {
    setCreatedEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updatedEvent;
      return next;
    });
    setEditedEvents((prev) => ({ ...prev, [id]: updatedEvent }));
  }

  function toggleBookmark(eventId) {
    setBookmarkedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        setEventGroupMap((g) => { const ng = { ...g }; delete ng[eventId]; return ng; });
      } else {
        next.add(eventId);
        setEventGroupMap((g) => ({ ...g, [eventId]: ["default"] }));
      }
      localStorage.setItem("bookmarkedEvents", JSON.stringify([...next]));
      return next;
    });
  }
  function addBookmarkGroup(name) {
    const id = `group-${Date.now()}`;
    setBookmarkGroups((prev) => [...prev, { id, name }]);
    return id;
  }
  function removeBookmarkGroup(groupId) {
    if (groupId === "default") return;
    setBookmarkGroups((prev) => prev.filter((g) => g.id !== groupId));
    setEventGroupMap((prev) => {
      const next = {};
      Object.keys(prev).forEach((id) => {
        const groups = (prev[id] || ["default"]).filter((g) => g !== groupId);
        next[id] = groups.length > 0 ? groups : ["default"];
      });
      return next;
    });
  }
  function addEventToGroup(eventId, groupId) {
    setEventGroupMap((prev) => {
      const current = prev[eventId] || ["default"];
      if (current.includes(groupId)) return prev;
      return { ...prev, [eventId]: [...current, groupId] };
    });
  }
  function removeEventFromGroup(eventId, groupId) {
    setEventGroupMap((prev) => {
      const current = prev[eventId] || ["default"];
      const updated = current.filter((g) => g !== groupId);
      return { ...prev, [eventId]: updated.length > 0 ? updated : ["default"] };
    });
  }

  function markAttending(eventId) {
    setAttendingEvents((prev) => new Set([...prev, eventId]));
    markAttendance(eventId).catch((err) => {
      setAttendingEvents((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
      console.warn("Failed to mark attendance:", err.message);
    });
  }
  function unmarkAttending(eventId) {
    setAttendingEvents((prev) => { const next = new Set(prev); next.delete(eventId); return next; });
    unmarkAttendance(eventId).catch((err) => {
      setAttendingEvents((prev) => new Set([...prev, eventId]));
      console.warn("Failed to unmark attendance:", err.message);
    });
  }

  return (
    <UserContext.Provider
      value={{
        user, setUser, authLoading,
        signUp, signIn, signOut,
        createdSpaces, setCreatedSpaces, addCreatedSpace, deleteCreatedSpace, updateCreatedSpace,
        hostTemplates, addHostTemplate,
        createdEvents, addCreatedEvent,
        deletedEventIds, deleteEvent,
        editedEvents, updateEvent,
        hiddenEventIds, hideEvent, showEvent,
        bookmarkedEvents, toggleBookmark,
        bookmarkGroups, addBookmarkGroup, removeBookmarkGroup,
        eventGroupMap, addEventToGroup, removeEventFromGroup,
        attendingEvents, markAttending, unmarkAttending,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
