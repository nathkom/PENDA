import { createContext, useContext, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [deletedEventIds, setDeletedEventIds] = useState(new Set());
  const [editedEvents, setEditedEvents] = useState({});

  // ── Bookmark state ──────────────────────────────────────────────────────────
  const [bookmarkedEvents, setBookmarkedEvents] = useState(() => {
    const saved = localStorage.getItem("bookmarkedEvents");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [bookmarkGroups, setBookmarkGroups] = useState(() => {
    const saved = localStorage.getItem("bookmarkGroups");
    return saved ? JSON.parse(saved) : [{ id: "default", name: "Saved Events" }];
  });

  // eventGroupMap: { [eventId]: string[] } — events can belong to multiple groups
  const [eventGroupMap, setEventGroupMap] = useState(() => {
    const saved = localStorage.getItem("eventGroupMap");
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // Migrate old format: string → array
    const migrated = {};
    Object.keys(parsed).forEach((id) => {
      const val = parsed[id];
      migrated[id] = Array.isArray(val) ? val : [val];
    });
    return migrated;
  });

  // ── Event CRUD ──────────────────────────────────────────────────────────────
  function addCreatedEvent(event) {
    setCreatedEvents((prev) => [event, ...prev]);
  }

  function deleteEvent(id) {
    setCreatedEvents((prev) => prev.filter((e) => e.id !== id));
    setDeletedEventIds((prev) => new Set([...prev, id]));
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

  // ── Bookmark actions ────────────────────────────────────────────────────────
  function toggleBookmark(eventId) {
    setBookmarkedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        setEventGroupMap((g) => {
          const ng = { ...g };
          delete ng[eventId];
          localStorage.setItem("eventGroupMap", JSON.stringify(ng));
          return ng;
        });
      } else {
        next.add(eventId);
        setEventGroupMap((g) => {
          const ng = { ...g, [eventId]: ["default"] };
          localStorage.setItem("eventGroupMap", JSON.stringify(ng));
          return ng;
        });
      }
      localStorage.setItem("bookmarkedEvents", JSON.stringify([...next]));
      return next;
    });
  }

  function addBookmarkGroup(name) {
    const id = `group-${Date.now()}`;
    setBookmarkGroups((prev) => {
      const next = [...prev, { id, name }];
      localStorage.setItem("bookmarkGroups", JSON.stringify(next));
      return next;
    });
    return id;
  }

  function removeBookmarkGroup(groupId) {
    if (groupId === "default") return;
    setBookmarkGroups((prev) => {
      const next = prev.filter((g) => g.id !== groupId);
      localStorage.setItem("bookmarkGroups", JSON.stringify(next));
      return next;
    });
    // Remove groupId from every event's group array; fall back to ["default"] if empty
    setEventGroupMap((prev) => {
      const next = {};
      Object.keys(prev).forEach((id) => {
        const groups = prev[id].filter((g) => g !== groupId);
        next[id] = groups.length > 0 ? groups : ["default"];
      });
      localStorage.setItem("eventGroupMap", JSON.stringify(next));
      return next;
    });
  }

  function addEventToGroup(eventId, groupId) {
    setEventGroupMap((prev) => {
      const current = prev[eventId] || ["default"];
      if (current.includes(groupId)) return prev;
      const next = { ...prev, [eventId]: [...current, groupId] };
      localStorage.setItem("eventGroupMap", JSON.stringify(next));
      return next;
    });
  }

  function removeEventFromGroup(eventId, groupId) {
    setEventGroupMap((prev) => {
      const current = prev[eventId] || ["default"];
      const updated = current.filter((g) => g !== groupId);
      const next = { ...prev, [eventId]: updated.length > 0 ? updated : ["default"] };
      localStorage.setItem("eventGroupMap", JSON.stringify(next));
      return next;
    });
  }

  return (
    <UserContext.Provider
      value={{
        user, setUser,
        createdEvents, addCreatedEvent,
        deletedEventIds, deleteEvent,
        editedEvents, updateEvent,
        bookmarkedEvents, toggleBookmark,
        bookmarkGroups, addBookmarkGroup, removeBookmarkGroup,
        eventGroupMap, addEventToGroup, removeEventFromGroup,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
