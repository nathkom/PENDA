import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  User, FileText, Calendar, Camera, Building2, Mail, Lock,
  Globe, Plus, Edit2, Eye, EyeOff, ChevronRight,
  Upload, MapPin, X, Check, Trash2, Bookmark, CalendarCheck,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { events as staticEvents } from "../data/events";
import { NEIGHBORHOODS } from "../utils/filters";
import BookmarkedEventsSection from "../components/BookmarkedEventsSection";
import AttendingEventsSection from "../components/AttendingEventsSection";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOST_EVENT_IDS = ["evt-001", "evt-002", "evt-003", "evt-004"];

const INITIAL_TEMPLATES = [
  {
    id: "tpl-001",
    name: "Weekly Social Night",
    category: "social",
    description: "Recurring community meetup — drop-in format, flexible timing, no RSVP required.",
    lastEdited: "Feb 28, 2026",
    prefill: {
      category: "social",
      noise_level: "Friendly and open",
      accessibility_info: "Low",
      space_format: "Open mingling",
      crowd_level: 50,
      crowd_level_label: "Moderately busy",
      cost: "free",
      accessibility: [],
      tagsInput: "drop_in, community, indoor",
    },
  },
  {
    id: "tpl-002",
    name: "Arts Workshop",
    category: "arts",
    description: "Workshop template with supply list, capacity cap, and accessibility info pre-filled.",
    lastEdited: "Mar 1, 2026",
    prefill: {
      category: "arts",
      noise_level: "Creative and focused",
      accessibility_info: "Low",
      space_format: "Workshop, seated",
      crowd_level: 30,
      crowd_level_label: "Small group",
      cost: "paid",
      cost_amount: 15,
      accessibility: ["wheelchair_accessible"],
      tagsInput: "workshop, arts, beginner_friendly",
    },
  },
];

const TEMPLATE_CATEGORIES = [
  {
    id: "health-wellness",
    name: "Health & Wellness Events",
    description: "ex community garden, farmers market",
    image: "/images/antenna-ZDN-G1xBWHY-unsplash.jpg",
    prefill: {
      category: "outdoors",
      noise_level: "Active and supportive",
      accessibility_info: "Low",
      space_format: "Open participation",
      crowd_level: 40,
      crowd_level_label: "Moderately busy",
    },
  },
  {
    id: "social-networking",
    name: "Social & Networking Events",
    description: "Community meetups, mixers, coffee chats",
    image: "/images/rizky-subagja-1k7TnX5GAww-unsplash.jpg",
    prefill: {
      category: "social",
      noise_level: "Friendly and open",
      accessibility_info: "Low",
      space_format: "Open mingling",
      crowd_level: 55,
      crowd_level_label: "Moderately busy",
    },
  },
  {
    id: "cultural-identity",
    name: "Cultural & Identity-Based Events",
    description: "Couple word description",
    image: "/images/xh_s-_yekOnsm1rE-unsplash.jpg",
    prefill: {
      category: "arts",
      noise_level: "Lively and celebratory",
      accessibility_info: "Low",
      space_format: "Mixed format",
      crowd_level: 65,
      crowd_level_label: "Moderately busy",
    },
  },
  {
    id: "markets-popups",
    name: "Markets & Pop-Ups",
    description: "Couple word description",
    image: "/images/nastuh-abootalebi-eHD8Y1Znfpk-unsplash.jpg",
    prefill: {
      category: "food",
      noise_level: "Casual and browsable",
      accessibility_info: "Low",
      space_format: "Walk-through market",
      crowd_level: 60,
      crowd_level_label: "Moderately busy",
    },
  },
];

const CATEGORY_COLORS = {
  social: "bg-blue-100 text-blue-700",
  arts: "bg-purple-100 text-purple-700",
  outdoors: "bg-green-100 text-green-700",
  food: "bg-orange-100 text-orange-700",
  sports: "bg-red-100 text-red-700",
  educational: "bg-yellow-100 text-yellow-700",
};

const CATEGORY_TO_IMAGE = {
  social: "/images/rizky-subagja-1k7TnX5GAww-unsplash.jpg",
  arts: "/images/xh_s-_yekOnsm1rE-unsplash.jpg",
  outdoors: "/images/antenna-ZDN-G1xBWHY-unsplash.jpg",
  food: "/images/nastuh-abootalebi-eHD8Y1Znfpk-unsplash.jpg",
  sports: "/images/headway-F2KRf_QfCqw-unsplash.jpg",
  educational: "/images/headway-F2KRf_QfCqw-unsplash.jpg",
};

const BLANK_FORM = {
  title: "",
  space_name: "",
  selectedSpaceId: "",
  neighborhood: "",
  category: "social",
  description: "",
  noise_level: "",
  accessibility_info: "",
  space_format: "",
  crowd_level: 50,
  crowd_level_label: "",
  date: "",
  timeStart: "",
  timeEnd: "",
  cost: "free",
  cost_amount: null,
  accessibility: [],
  tagsInput: "",
  attending_limit: null,
  show_attendance: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseTo24h(str) {
  if (!str) return "";
  const match = str.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "";
  let h = parseInt(match[1]);
  const min = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function parseTimeStr(timeStr) {
  if (!timeStr || timeStr === "TBD") return { timeStart: "", timeEnd: "" };
  const parts = timeStr.split(/\s*[–-]\s*/);
  return {
    timeStart: parseTo24h(parts[0]?.trim() || ""),
    timeEnd: parseTo24h(parts[1]?.trim() || ""),
  };
}

function crowdLevelToLabel(level) {
  if (level == null) return "";
  if (level <= 40) return "Small group";
  if (level <= 65) return "Moderately busy";
  return "Large crowd";
}

function eventToForm(event) {
  const times = parseTimeStr(event.time);
  return {
    title: event.title || "",
    space_name: event.space_name || "",
    neighborhood: event.neighborhood || "",
    category: event.category || "social",
    description: event.description || "",
    noise_level: event.noise_level || "",
    accessibility_info: event.accessibility_info || "",
    space_format: event.space_format || "",
    crowd_level: event.crowd_level ?? 50,
    crowd_level_label: crowdLevelToLabel(event.crowd_level),
    date: event.date || "",
    timeStart: times.timeStart,
    timeEnd: times.timeEnd,
    cost: event.cost || "free",
    cost_amount: event.cost_amount ?? null,
    accessibility: event.accessibility ? [...event.accessibility] : [],
    tagsInput: event.tags ? event.tags.join(", ") : "",
    attending_limit: event.attending_limit ?? null,
    show_attendance: event.show_attendance !== false,
    selectedSpaceId: "",
  };
}

// ─── Create / Edit Event View ─────────────────────────────────────────────────

function CreateEventView({ editingEvent, templates, createdSpaces = [], onCancel, onPublish, onSaveTemplate }) {
  const isEditing = Boolean(editingEvent);

  const [form, setForm] = useState(() =>
    isEditing ? eventToForm(editingEvent) : { ...BLANK_FORM }
  );
  const [imagePreview, setImagePreview] = useState(
    isEditing ? (editingEvent.image_url || null) : null
  );
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [publishError, setPublishError] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);
  const imageInputRef = useRef(null);

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  }

  function applyCategory(cat) {
    if (selectedTemplate === cat.id) { setSelectedTemplate(null); return; }
    setSelectedTemplate(cat.id);
    setForm((f) => ({ ...f, ...cat.prefill }));
  }

  function applyUserTemplate(tpl) {
    setSelectedTemplate(tpl.id);
    if (tpl.prefill) setForm((f) => ({ ...f, ...tpl.prefill }));
  }

  function handleSaveTemplate() {
    const name = form.title.trim() || "Untitled Template";
    const tags = form.tagsInput ? form.tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : [];
    onSaveTemplate({
      id: `tpl-${Date.now()}`,
      name,
      category: form.category,
      description: (form.description || "").slice(0, 90) + (form.description.length > 90 ? "…" : ""),
      lastEdited: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      image: imagePreview || null,
      prefill: { ...form, tags },
    });
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  }

  function handlePublish() {
    if (!form.title.trim()) { setPublishError("Please add an event title before publishing."); return; }
    if (!form.date) { setPublishError("Please select a date for your event."); return; }
    setPublishError("");

    const timeStr =
      form.timeStart && form.timeEnd
        ? `${fmt12(form.timeStart)} – ${fmt12(form.timeEnd)}`
        : form.timeStart ? fmt12(form.timeStart) : "TBD";

    const tags = form.tagsInput
      ? form.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : ["community"];

    const base = isEditing ? editingEvent : {};
    onPublish({
      ...base,
      id: isEditing ? editingEvent.id : `evt-custom-${Date.now()}`,
      title: form.title.trim(),
      space_name: form.space_name || "TBD",
      neighborhood: form.neighborhood || "Seattle",
      category: form.category,
      description: form.description,
      date: form.date,
      time: timeStr,
      cost: form.cost,
      cost_amount: form.cost === "paid" ? form.cost_amount : null,
      accessibility: form.accessibility,
      tags,
      image_url: imagePreview || (isEditing ? editingEvent.image_url : "/images/headway-F2KRf_QfCqw-unsplash.jpg"),
      gallery_images: imagePreview
        ? [{ url: imagePreview, alt: form.title }]
        : (isEditing ? editingEvent.gallery_images : []),
      contact_email: base.contact_email || "host@demo.com",
      featured: base.featured ?? false,
      noise_level: form.noise_level || "Community-friendly",
      accessibility_info: form.accessibility_info || "Welcoming to all, no barriers",
      space_format: form.space_format || "Open format",
      crowd_level: form.crowd_level || 50,
      attending_limit: form.attending_limit || null,
      show_attendance: form.show_attendance,
      attending_count: isEditing ? (editingEvent.attending_count || 0) : 0,
    });
  }

  const C = "bg-[#6c7fc4]";
  const inputCls =
    "w-full bg-transparent text-white placeholder:text-blue-200/60 border-b border-white/25 pb-1.5 outline-none focus:border-white/70 transition-colors text-sm";
  const darkSelectCls =
    "bg-[#5a6daa] text-white text-sm border border-white/25 rounded-lg px-2.5 py-1.5 outline-none focus:border-white/60";

  return (
    <div className="flex flex-col bg-stone-100" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Templates panel ── */}
        {templatesOpen && (
          <div className="w-[460px] bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>🗒️</span> Templates
              </h2>
              <button
                onClick={() => setTemplatesOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wide px-0.5">
                Free Templates
              </p>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <div key={cat.id} onClick={() => applyCategory(cat)} className="cursor-pointer group">
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-3">
                      <h3 className="text-white font-bold text-sm leading-snug drop-shadow">{cat.name}</h3>
                    </div>
                    {selectedTemplate === cat.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow">
                        <Check size={13} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 px-0.5">{cat.description}</p>
                </div>
              ))}

              {templates.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-1">
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 px-0.5">
                    Your Templates
                  </p>
                  {templates.map((tpl) => (
                    <div key={tpl.id} onClick={() => applyUserTemplate(tpl)} className="cursor-pointer group mb-4">
                      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                        <img
                          src={tpl.image || CATEGORY_TO_IMAGE[tpl.category] || "/images/headway-F2KRf_QfCqw-unsplash.jpg"}
                          alt={tpl.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-3">
                          <h3 className="text-white font-bold text-sm leading-snug drop-shadow">{tpl.name}</h3>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full">
                          <span className="text-white text-xs font-semibold">Your Template</span>
                        </div>
                        {selectedTemplate === tpl.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow">
                            <Check size={13} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 px-0.5">{tpl.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Right: Form panel ── */}
        <div className="flex-1 overflow-y-auto bg-stone-100 px-6 py-6">
          {!templatesOpen && (
            <button
              onClick={() => setTemplatesOpen(true)}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <FileText size={14} />
              Show Templates
            </button>
          )}

          <div className="max-w-2xl mx-auto flex flex-col gap-4">

            {/* Edit mode banner */}
            {isEditing && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <Edit2 size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  Editing: <span className="font-semibold">{editingEvent.title}</span>
                </p>
              </div>
            )}

            {/* 1. Image upload */}
            <div
              onClick={() => imageInputRef.current?.click()}
              className={`${C} rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity flex flex-col items-center justify-center min-h-[170px]`}
            >
              {imagePreview ? (
                <div className="relative w-full">
                  <img src={imagePreview} alt="Event preview" className="w-full h-52 object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      <Upload size={16} /> Change Image
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <Upload size={36} className="text-white mb-3" />
                  <h3 className="text-white font-bold text-2xl">Add Event Image</h3>
                  <p className="text-blue-100 text-sm mt-1">Upload your own or choose from our collection.</p>
                </div>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* 2. Event Title */}
            <div className={`${C} rounded-2xl p-6`}>
              <h3 className="text-white font-bold text-2xl mb-3">Event Title</h3>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Add a short title for your event"
                className={inputCls + " text-base"}
              />
            </div>

            {/* 3. Location + Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`${C} rounded-2xl p-6`}>
                <h3 className="text-white font-bold text-xl mb-3 flex items-center gap-2">
                  <MapPin size={18} /> Location
                </h3>
                {createdSpaces.length > 0 && (
                  <div className="mb-3">
                    <p className="text-blue-100 text-xs mb-1.5">Select a space you manage</p>
                    <select
                      value={form.selectedSpaceId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__other__" || val === "") {
                          setForm((f) => ({ ...f, selectedSpaceId: val }));
                        } else {
                          const s = createdSpaces.find((x) => x.id === val);
                          if (s) {
                            setForm((f) => ({
                              ...f,
                              selectedSpaceId: val,
                              space_name: s.name,
                              neighborhood: s.neighborhood || f.neighborhood,
                            }));
                          }
                        }
                      }}
                      className={darkSelectCls + " w-full"}
                    >
                      <option value="">Select a space…</option>
                      {createdSpaces.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="__other__">Other (enter manually)</option>
                    </select>
                  </div>
                )}
                {(createdSpaces.length === 0 || form.selectedSpaceId === "__other__" || form.selectedSpaceId === "") && (
                  <input
                    type="text"
                    value={form.space_name}
                    onChange={(e) => setForm((f) => ({ ...f, space_name: e.target.value }))}
                    placeholder="Enter the venue name and address."
                    className={inputCls + " mb-3"}
                  />
                )}
                <select
                  value={form.neighborhood}
                  onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                  className={darkSelectCls + " w-full"}
                >
                  <option value="">Select neighborhood</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n.id} value={n.name}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div className={`${C} rounded-2xl p-6`}>
                <h3 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
                  📅 Date &amp; Time
                </h3>
                <p className="text-blue-100 text-xs mb-2">Select the date and time of your event.</p>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={darkSelectCls + " w-full mb-2"}
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    step="300"
                    value={form.timeStart}
                    onChange={(e) => setForm((f) => ({ ...f, timeStart: e.target.value }))}
                    className={darkSelectCls + " flex-1"}
                  />
                  <input
                    type="time"
                    step="300"
                    value={form.timeEnd}
                    onChange={(e) => setForm((f) => ({ ...f, timeEnd: e.target.value }))}
                    className={darkSelectCls + " flex-1"}
                  />
                </div>
                <p className="text-blue-200/70 text-xs mt-2">Example: Friday, April 3 · 10:00 AM – 12:00 PM</p>
              </div>
            </div>

            {/* 4. Map preview placeholder */}
            <div className="bg-stone-200 rounded-2xl p-6 min-h-[90px] flex items-center justify-center">
              <p className="text-stone-400 text-sm italic">Optional: Show map preview</p>
            </div>

            {/* 5. Event Overview */}
            <div className={`${C} rounded-2xl p-6`}>
              <h3 className="text-white font-bold text-xl mb-1">✏️ Event Overview</h3>
              <p className="text-blue-100 text-sm mb-3">
                Briefly describe your event. What is it? Who is it for? Why should someone come?
              </p>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Write your event description here…"
                rows={4}
                className="w-full bg-transparent text-white placeholder:text-blue-200/55 resize-none outline-none text-sm leading-relaxed"
              />
              <p className="text-blue-200/60 text-xs mt-2">(Recommended: 2–4 short sentences)</p>
            </div>

            {/* 6. What to Expect */}
            <div className={`${C} rounded-2xl p-6`}>
              <h3 className="text-white font-bold text-xl mb-1">What to Expect</h3>
              <p className="text-blue-100 text-sm mb-4">Help attendees understand the vibe and format.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-blue-100 text-xs font-medium mb-1.5">• Noise Level</p>
                  <input
                    type="text"
                    value={form.noise_level}
                    onChange={(e) => setForm((f) => ({ ...f, noise_level: e.target.value }))}
                    placeholder="Quiet, moderate, lively, loud, etc."
                    className={inputCls}
                  />
                </div>
                <div>
                  <p className="text-blue-100 text-xs font-medium mb-1.5">• Accessibility Information</p>
                  <input
                    type="text"
                    value={form.accessibility_info}
                    onChange={(e) => setForm((f) => ({ ...f, accessibility_info: e.target.value }))}
                    placeholder="e.g. Fully accessible, outdoor terrain, etc."
                    className={inputCls}
                  />
                </div>
                <div>
                  <p className="text-blue-100 text-xs font-medium mb-1.5">• Space Format</p>
                  <input
                    type="text"
                    value={form.space_format}
                    onChange={(e) => setForm((f) => ({ ...f, space_format: e.target.value }))}
                    placeholder="Workshop, dinner & show, open mingling, panel, etc."
                    className={inputCls}
                  />
                </div>
                <div>
                  <p className="text-blue-100 text-xs font-medium mb-1.5">• (Optional) Attendance Level</p>
                  <select
                    value={form.crowd_level_label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const level = label === "Small group" ? 25 : label === "Large crowd" ? 80 : 55;
                      setForm((f) => ({ ...f, crowd_level_label: label, crowd_level: level }));
                    }}
                    className={darkSelectCls}
                  >
                    <option value="">Select…</option>
                    <option value="Small group">Small group</option>
                    <option value="Moderately busy">Moderately busy</option>
                    <option value="Large crowd">Large crowd</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 7. Event Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Event Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="social">Social</option>
                    <option value="arts">Arts</option>
                    <option value="outdoors">Outdoors</option>
                    <option value="food">Food</option>
                    <option value="sports">Sports</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Cost</label>
                  <select
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                {form.cost === "paid" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost_amount ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, cost_amount: parseFloat(e.target.value) || null }))}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Tags</label>
                  <input
                    type="text"
                    value={form.tagsInput}
                    onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                    placeholder="drop_in, outdoor, community"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-400">Comma-separated</p>
                </div>
              </div>
            </div>

            {/* 8. Accessibility */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Accessibility</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "wheelchair_accessible", label: "♿ Wheelchair Accessible" },
                  { id: "gender_neutral_restroom", label: "🚻 Gender-Neutral Restroom" },
                  { id: "sensory_friendly", label: "🔇 Sensory Friendly" },
                  { id: "dog_friendly", label: "🐕 Dog Friendly" },
                ].map((opt) => {
                  const on = form.accessibility.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          accessibility: on
                            ? f.accessibility.filter((a) => a !== opt.id)
                            : [...f.accessibility, opt.id],
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        on
                          ? "bg-green-700 text-white border-green-700"
                          : "text-gray-600 border-gray-200 hover:border-green-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 9. Attending Limit */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Attendance Settings</h3>
              <p className="text-sm text-gray-500 mb-4">
                Set a maximum number of attendees and control what attendees see.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Max Attendees</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.attending_limit ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        attending_limit: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="e.g. 20"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-400">
                    Leave blank for unlimited attendance.
                  </p>
                </div>

                {/* Show attendance metrics toggle */}
                <div className="flex items-center justify-between gap-4 py-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Show attendance metrics</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {form.show_attendance
                        ? "Attendees will see the capacity bar and spots remaining."
                        : "Attendees only see the confirmation animation — no counts shown."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, show_attendance: !f.show_attendance }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                      form.show_attendance ? "bg-[#9FB366]" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={form.show_attendance}
                    aria-label="Show attendance metrics"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.show_attendance ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {publishError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {publishError}
              </div>
            )}

            <div className="h-4" />
          </div>
        </div>
        {/* Balancing spacer — mirrors template panel width so mx-auto always centers on the same point */}
        {templatesOpen && <div className="w-[460px] flex-shrink-0 pointer-events-none" />}
      </div>

      {/* ── Bottom action bar ── */}
      <div className="bg-stone-100 border-t border-stone-300 px-8 py-4 flex justify-center gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-2.5 rounded-full bg-stone-300 hover:bg-stone-400 text-stone-800 font-semibold text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveTemplate}
          className={`px-8 py-2.5 rounded-full font-semibold text-sm transition-colors ${
            templateSaved ? "bg-green-100 text-green-700" : "bg-stone-500 hover:bg-stone-600 text-white"
          }`}
        >
          {templateSaved ? "Template Saved!" : "Save Template"}
        </button>
        <button
          type="button"
          onClick={handlePublish}
          className="px-8 py-2.5 rounded-full bg-[#9FB366] hover:bg-[#8a9c57] text-white font-semibold text-sm transition-colors"
        >
          {isEditing ? "Save Changes" : "Publish"}
        </button>
      </div>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection({ user, setUser }) {
  const [form, setForm] = useState({
    displayName: user?.name || "",
    email: user?.email || "",
    currentPw: "",
    newPw: "",
    companyName: "Seattle Community Events Co.",
    website: "seattleevents.example.com",
    about: "Connecting Seattle residents through local events and community spaces since 2021.",
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  const inputCls =
    "w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const saveBtnCls = (saved) =>
    `mt-4 px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
      saved ? "bg-green-100 text-green-700" : "bg-[#9FB366] hover:bg-[#8a9c57] text-white"
    }`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Profile Photo */}
      <div className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-[#9FB366] flex items-center justify-center text-white text-2xl font-bold select-none flex-shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || "DH"}
          </div>
          <div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Camera size={14} />
              Upload Photo
            </button>
            <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or GIF · Max 2 MB</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Account Information */}
      <div className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Display Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
        </div>
        <button type="button"
          onClick={() => {
            setUser((p) => ({ ...p, name: form.displayName, email: form.email }));
            setAccountSaved(true);
            setTimeout(() => setAccountSaved(false), 2000);
          }}
          className={saveBtnCls(accountSaved)}
        >
          {accountSaved ? "Saved!" : "Save Account"}
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Change Password */}
      <div className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Current Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showCurrentPw ? "text" : "password"} value={form.currentPw}
                onChange={(e) => setForm((f) => ({ ...f, currentPw: e.target.value }))}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button type="button" onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showNewPw ? "text" : "password"} value={form.newPw}
                onChange={(e) => setForm((f) => ({ ...f, newPw: e.target.value }))}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button type="button" onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
        <button type="button"
          onClick={() => { setPwSaved(true); setTimeout(() => setPwSaved(false), 2000); }}
          className={saveBtnCls(pwSaved)}
        >
          {pwSaved ? "Updated!" : "Update Password"}
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Company Information */}
      <div className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Company Information</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Company Name</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Website</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">About</label>
            <textarea value={form.about}
              onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
          <button type="button"
            onClick={() => { setCompanySaved(true); setTimeout(() => setCompanySaved(false), 2000); }}
            className={saveBtnCls(companySaved) + " self-start"}
          >
            {companySaved ? "Saved!" : "Save Company Info"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Section ────────────────────────────────────────────────────────

function TemplatesSection({ templates, onCreateTemplate }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Event Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Save time by reusing preset event configurations</p>
        </div>
        <button
          onClick={onCreateTemplate}
          className="flex items-center gap-2 bg-[#9FB366] hover:bg-[#8a9c57] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
        >
          <Plus size={14} />
          New Template
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">{tpl.name}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[tpl.category] || "bg-gray-100 text-gray-600"}`}>
                  {tpl.category}
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{tpl.description}</p>
              <p className="text-xs text-gray-400 mt-1.5">Last edited {tpl.lastEdited}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0 self-start">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                <Edit2 size={13} /> Edit
              </button>
              <button onClick={onCreateTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#9FB366] hover:bg-[#8a9c57] text-white text-sm transition-colors font-medium">
                Use
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-6 flex flex-col items-center text-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
          <Plus size={18} className="text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-700">Create a new template</p>
        <p className="text-xs text-gray-400 max-w-xs">
          Templates pre-fill event details so you can post new listings in seconds.
        </p>
        <button onClick={onCreateTemplate}
          className="mt-1 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
          Create Template
        </button>
      </div>
    </div>
  );
}

// ─── Events Section ───────────────────────────────────────────────────────────

function EventsSection({ hostEvents, onCreateEvent, onEditEvent, onDeleteEvent }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null); // event object to confirm

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Your Events</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {hostEvents.length} event{hostEvents.length !== 1 ? "s" : ""} posted
          </p>
        </div>
        <button
          onClick={onCreateEvent}
          className="flex items-center gap-2 bg-[#9FB366] hover:bg-[#8a9c57] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
        >
          <Plus size={14} />
          Create Event
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {hostEvents.map((event) => {
          const d = new Date(event.date + "T00:00:00");
          const dateStr = isNaN(d)
            ? event.date
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return (
            <div key={event.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h3>
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    Published
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{event.space_name} · {event.neighborhood}</p>
                <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {event.time}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => onEditEvent(event)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  <Edit2 size={13} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <Link
                  to={`/events/${event.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors font-medium"
                >
                  <Eye size={13} />
                  <span className="hidden sm:inline">View</span>
                </Link>
                <button
                  onClick={() => setDeleteConfirm(event)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm transition-colors font-medium"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg text-center mb-1">Delete Event?</h3>
            <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">
              <span className="font-semibold text-gray-700">"{deleteConfirm.title}"</span> will be
              permanently removed from your catalog. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteEvent(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Space View ────────────────────────────────────────────────────────

const SPACE_CATEGORIES = ["Café", "Park", "Gallery", "Community Center", "Library", "Brewery", "Other"];

const BLANK_SPACE_FORM = {
  name: "",
  address: "",
  neighborhood: "",
  category: "Café",
  description: "",
  hours: "",
  capacity: "",
  website: "",
  amenities: [],
};

function CreateSpaceView({ editingSpace, onCancel, onPublish }) {
  const isEditing = Boolean(editingSpace);
  const [form, setForm] = useState(() =>
    isEditing
      ? {
          name: editingSpace.name || "",
          address: editingSpace.address || "",
          neighborhood: editingSpace.neighborhood || "",
          category: editingSpace.category || "Café",
          description: editingSpace.description || "",
          hours: editingSpace.hours || "",
          capacity: editingSpace.capacity ? String(editingSpace.capacity) : "",
          website: editingSpace.website || "",
          amenities: editingSpace.amenities ? [...editingSpace.amenities] : [],
        }
      : { ...BLANK_SPACE_FORM }
  );
  const [imagePreview, setImagePreview] = useState(
    isEditing ? (editingSpace.image_url || null) : null
  );
  const [publishError, setPublishError] = useState("");
  const imageInputRef = useRef(null);

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  }

  function handlePublish() {
    if (!form.name.trim()) { setPublishError("Please add a space name before publishing."); return; }
    setPublishError("");
    const base = isEditing ? editingSpace : {};
    onPublish({
      ...base,
      id: isEditing ? editingSpace.id : `space-custom-${Date.now()}`,
      name: form.name.trim(),
      address: form.address,
      neighborhood: form.neighborhood,
      category: form.category,
      description: form.description,
      hours: form.hours,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      website: form.website,
      amenities: form.amenities,
      image_url: imagePreview || (isEditing ? editingSpace.image_url : "/images/headway-F2KRf_QfCqw-unsplash.jpg"),
      gallery_images: imagePreview
        ? [{ url: imagePreview, alt: form.name }]
        : (isEditing ? editingSpace.gallery_images : []),
      noise_level: base.noise_level || "",
      space_format: base.space_format || "",
    });
  }

  const C = "bg-[#6c7fc4]";
  const inputCls =
    "w-full bg-transparent text-white placeholder:text-blue-200/60 border-b border-white/25 pb-1.5 outline-none focus:border-white/70 transition-colors text-sm";
  const darkSelectCls =
    "bg-[#5a6daa] text-white text-sm border border-white/25 rounded-lg px-2.5 py-1.5 outline-none focus:border-white/60";

  return (
    <div className="flex flex-col bg-stone-100" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* Edit mode banner */}
          {isEditing && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Edit2 size={14} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Editing: <span className="font-semibold">{editingSpace.name}</span>
              </p>
            </div>
          )}

          {/* Image upload */}
          <div
            onClick={() => imageInputRef.current?.click()}
            className={`${C} rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity flex flex-col items-center justify-center min-h-[170px]`}
          >
            {imagePreview ? (
              <div className="relative w-full">
                <img src={imagePreview} alt="Space preview" className="w-full h-52 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white font-semibold text-sm flex items-center gap-2">
                    <Upload size={16} /> Change Image
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <Upload size={36} className="text-white mb-3" />
                <h3 className="text-white font-bold text-2xl">Add Space Image</h3>
                <p className="text-blue-100 text-sm mt-1">Upload a photo of your venue.</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Space Name */}
          <div className={`${C} rounded-2xl p-6`}>
            <h3 className="text-white font-bold text-2xl mb-3">Space Name</h3>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Elm Coffee Roasters"
              className={inputCls + " text-base"}
            />
          </div>

          {/* Address + Neighborhood */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`${C} rounded-2xl p-6`}>
              <h3 className="text-white font-bold text-xl mb-3 flex items-center gap-2">
                <MapPin size={18} /> Address
              </h3>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
                className={inputCls + " mb-3"}
              />
              <select
                value={form.neighborhood}
                onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                className={darkSelectCls + " w-full"}
              >
                <option value="">Select neighborhood</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n.id} value={n.name}>{n.name}</option>
                ))}
              </select>
            </div>

            <div className={`${C} rounded-2xl p-6`}>
              <h3 className="text-white font-bold text-xl mb-3">Details</h3>
              <p className="text-blue-100 text-xs mb-2">Category</p>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={darkSelectCls + " w-full mb-3"}
              >
                {SPACE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-blue-100 text-xs mb-2">Capacity</p>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="e.g. 50"
                className={darkSelectCls + " w-full"}
              />
            </div>
          </div>

          {/* Description */}
          <div className={`${C} rounded-2xl p-6`}>
            <h3 className="text-white font-bold text-xl mb-1">✏️ Description</h3>
            <p className="text-blue-100 text-sm mb-3">
              Describe your space for hosts and attendees.
            </p>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Write a brief description of this space…"
              rows={4}
              className="w-full bg-transparent text-white placeholder:text-blue-200/55 resize-none outline-none text-sm leading-relaxed"
            />
          </div>

          {/* Hours + Website */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">More Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Hours</label>
                <input
                  type="text"
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                  placeholder="Mon–Fri 8 AM – 5 PM"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="example.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "wheelchair_accessible", label: "♿ Wheelchair Accessible" },
                { id: "gender_neutral_restroom", label: "🚻 Gender-Neutral Restroom" },
                { id: "sensory_friendly", label: "🔇 Sensory Friendly" },
                { id: "dog_friendly", label: "🐕 Dog Friendly" },
                { id: "wifi", label: "📶 Wi-Fi" },
              ].map((opt) => {
                const on = form.amenities.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        amenities: on
                          ? f.amenities.filter((a) => a !== opt.id)
                          : [...f.amenities, opt.id],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      on
                        ? "bg-green-700 text-white border-green-700"
                        : "text-gray-600 border-gray-200 hover:border-green-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {publishError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {publishError}
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="bg-stone-100 border-t border-stone-300 px-8 py-4 flex justify-center gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-2.5 rounded-full bg-stone-300 hover:bg-stone-400 text-stone-800 font-semibold text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePublish}
          className="px-8 py-2.5 rounded-full bg-[#9FB366] hover:bg-[#8a9c57] text-white font-semibold text-sm transition-colors"
        >
          {isEditing ? "Save Changes" : "Publish Space"}
        </button>
      </div>
    </div>
  );
}

// ─── Spaces Section ───────────────────────────────────────────────────────────

function SpaceCard({ space, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
      <img
        src={space.image_url || "/images/headway-F2KRf_QfCqw-unsplash.jpg"}
        alt={space.name}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{space.name}</h3>
          {space.category && (
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {space.category}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{space.address}</p>
        <p className="text-xs text-gray-400 mt-0.5">{space.neighborhood}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          <Edit2 size={13} />
          <span className="hidden sm:inline">Edit</span>
        </button>
        <Link
          to={`/spaces/${space.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors font-medium"
        >
          <Eye size={13} />
          <span className="hidden sm:inline">View</span>
        </Link>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm transition-colors font-medium"
        >
          <Trash2 size={13} />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}

function SpacesSection({ createdSpaces, onCreateSpace, onEditSpace, onDeleteSpace }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Spaces</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {createdSpaces.length} space{createdSpaces.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <button
          onClick={onCreateSpace}
          className="flex items-center gap-2 bg-[#9FB366] hover:bg-[#8a9c57] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
        >
          <Plus size={14} />
          Create Space
        </button>
      </div>

      {createdSpaces.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <Building2 size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mt-1">No spaces yet</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Create a space to promote your venue and link it to events you host.
          </p>
          <button
            onClick={onCreateSpace}
            className="mt-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Create Space
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {createdSpaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onEdit={() => onEditSpace(space)}
              onDelete={() => onDeleteSpace(space.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "profile",   label: "Profile",           description: "Account & company info",  icon: User },
  { id: "templates", label: "Templates",         description: "Reusable event formats",  icon: FileText },
  { id: "spaces",    label: "Spaces",            description: "Manage your venues",      icon: Building2 },
  { id: "events",    label: "Your Events",       description: "Manage your listings",    icon: Calendar },
  { id: "bookmarks", label: "Bookmarked Events", description: "Your saved events",       icon: Bookmark },
  { id: "attending", label: "Attending Events",  description: "Events you're going to",  icon: CalendarCheck },
];

export default function HostTools() {
  const { user, setUser, createdEvents, deletedEventIds, editedEvents, addCreatedEvent, deleteEvent, updateEvent, bookmarkedEvents, toggleBookmark, bookmarkGroups, addBookmarkGroup, removeBookmarkGroup, eventGroupMap, addEventToGroup, removeEventFromGroup, attendingEvents, unmarkAttending, createdSpaces, addCreatedSpace, deleteCreatedSpace, updateCreatedSpace } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => {
    const s = location.state?.section;
    return ["events", "templates", "spaces", "profile", "bookmarks", "attending"].includes(s) ? s : "profile";
  });
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingSpace, setEditingSpace] = useState(null);
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);

  useEffect(() => {
    if (!user || user.role !== "host") navigate("/signin");
  }, [user, navigate]);

  if (!user || user.role !== "host") return null;

  function handlePublish(eventData) {
    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
    } else {
      addCreatedEvent(eventData);
    }
    setCreateEventOpen(false);
    setEditingEvent(null);
    setActiveSection("events");
  }

  function handleEditEvent(event) {
    setEditingEvent(event);
    setCreateEventOpen(true);
  }

  function handleCancelCreate() {
    setCreateEventOpen(false);
    setEditingEvent(null);
  }

  // Host's own events (for the Your Events section)
  const allHostEvents = useMemo(() => {
    const staticHost = staticEvents.filter((e) => HOST_EVENT_IDS.includes(e.id));
    const merged = [...createdEvents, ...staticHost];
    const filtered = merged.filter((e) => !deletedEventIds.has(e.id));
    return filtered.map((e) => (editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e));
  }, [createdEvents, deletedEventIds, editedEvents]);

  // Full catalog (for the Bookmarked Events section)
  const allCatalogEvents = useMemo(() => {
    const merged = [...createdEvents, ...staticEvents];
    const filtered = merged.filter((e) => !deletedEventIds.has(e.id));
    return filtered.map((e) => (editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e));
  }, [createdEvents, deletedEventIds, editedEvents]);

  function handlePublishSpace(spaceData) {
    if (editingSpace) {
      updateCreatedSpace(editingSpace.id, spaceData);
    } else {
      addCreatedSpace(spaceData);
    }
    setCreateSpaceOpen(false);
    setEditingSpace(null);
    setActiveSection("spaces");
  }

  function handleEditSpace(space) {
    setEditingSpace(space);
    setCreateSpaceOpen(true);
  }

  if (createSpaceOpen) {
    return (
      <CreateSpaceView
        editingSpace={editingSpace}
        onCancel={() => { setCreateSpaceOpen(false); setEditingSpace(null); }}
        onPublish={handlePublishSpace}
      />
    );
  }

  if (createEventOpen) {
    return (
      <CreateEventView
        editingEvent={editingEvent}
        templates={templates}
        createdSpaces={createdSpaces}
        onCancel={handleCancelCreate}
        onPublish={handlePublish}
        onSaveTemplate={(tpl) => setTemplates((prev) => [...prev, tpl])}
      />
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">

          {/* ── Sidebar ── */}
          <aside className="md:w-72 flex-shrink-0">
            {/* Mobile: horizontal pills */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1 mb-4">
              {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === id
                      ? "bg-[#9FB366] text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-[#9FB366]/50"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Desktop: sidebar card */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Profile summary */}
              <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-[#9FB366]/10 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#9FB366] text-white font-bold text-xl flex items-center justify-center flex-shrink-0 select-none">
                    {user.name?.slice(0, 2).toUpperCase() || "DH"}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base leading-tight">{user.name}</p>
                    <p className="text-sm text-[#9FB366] font-medium mt-0.5">Event Host</p>
                    <p className="text-xs text-gray-400 mt-0.5">Seattle, WA</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t border-[#9FB366]/20">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{allHostEvents.length}</p>
                    <p className="text-xs text-gray-400">Events</p>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{createdSpaces.length}</p>
                    <p className="text-xs text-gray-400">Spaces</p>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <p className="text-lg font-bold text-gray-900">{bookmarkedEvents.size}</p>
                    <p className="text-xs text-gray-400">Saved</p>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              {NAV_SECTIONS.map(({ id, label, description, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors border-b border-gray-100 last:border-0 ${
                      active ? "bg-[#9FB366]/10" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${active ? "bg-[#9FB366]" : "bg-gray-100"}`}>
                      <Icon size={18} className={active ? "text-white" : "text-gray-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${active ? "text-[#9FB366]" : "text-gray-800"}`}>
                        {label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                    {active && <ChevronRight size={16} className="text-[#9FB366] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {activeSection === "profile" && <ProfileSection user={user} setUser={setUser} />}
            {activeSection === "templates" && (
              <TemplatesSection
                templates={templates}
                onCreateTemplate={() => { setEditingEvent(null); setCreateEventOpen(true); }}
              />
            )}
            {activeSection === "spaces" && (
              <SpacesSection
                createdSpaces={createdSpaces}
                onCreateSpace={() => { setEditingSpace(null); setCreateSpaceOpen(true); }}
                onEditSpace={handleEditSpace}
                onDeleteSpace={deleteCreatedSpace}
              />
            )}
            {activeSection === "events" && (
              <EventsSection
                hostEvents={allHostEvents}
                onCreateEvent={() => { setEditingEvent(null); setCreateEventOpen(true); }}
                onEditEvent={handleEditEvent}
                onDeleteEvent={deleteEvent}
              />
            )}
            {activeSection === "bookmarks" && (
              <BookmarkedEventsSection
                allEvents={allCatalogEvents}
                bookmarkedEvents={bookmarkedEvents}
                bookmarkGroups={bookmarkGroups}
                eventGroupMap={eventGroupMap}
                toggleBookmark={toggleBookmark}
                addBookmarkGroup={addBookmarkGroup}
                removeBookmarkGroup={removeBookmarkGroup}
                addEventToGroup={addEventToGroup}
                removeEventFromGroup={removeEventFromGroup}
              />
            )}
            {activeSection === "attending" && (
              <AttendingEventsSection
                allEvents={allCatalogEvents}
                attendingEvents={attendingEvents}
                unmarkAttending={unmarkAttending}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
