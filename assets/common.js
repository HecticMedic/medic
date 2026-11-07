// Shared helpers for Medic. Data lives in this browser's localStorage under
// "medic:<key>", so nothing leaves the device. (Compass uses "compass:" on the
// same github.io origin, so the prefixes keep the two apps apart.)

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('medic:' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('medic:' + key, JSON.stringify(value));
    } catch {
      alert('Could not save. Your browser storage may be full or blocked.');
    }
  },
  // Every medic:* entry, for backups.
  dump() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('medic:')) out[k] = localStorage.getItem(k);
    }
    return out;
  },
  restore(data) {
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('medic:') && typeof v === 'string') localStorage.setItem(k, v);
    }
  },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Dates are handled as local "YYYY-MM-DD" strings so time zones never shift a day.
function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function friendlyDate(s) {
  const diff = daysBetween(isoDate(), s);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return parseDate(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---- Shifts ----
// One person's work rotation: a repeating on/off cycle counted from an anchor
// date, plus one-off changes (picked-up shifts, trades, leave). A shift is
// filed under the date it starts.
const SHIFT_PRESETS = {
  '24-48': { label: '24 on / 48 off', cycle: [1, 0, 0], hours: 24 },
  '48-96': { label: '48 on / 96 off', cycle: [1, 1, 0, 0, 0, 0], hours: 24 },
  'kelly': { label: 'Kelly (24/48, every 7th shift off)', cycle: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], hours: 24 },
  'cal': { label: '3 in 9 (on-off-on-off-on, 4 off)', cycle: [1, 0, 1, 0, 1, 0, 0, 0, 0], hours: 24 },
  '24-72': { label: '24 on / 72 off', cycle: [1, 0, 0, 0], hours: 24 },
  '4-4': { label: '4 on / 4 off (12s)', cycle: [1, 1, 1, 1, 0, 0, 0, 0], hours: 12 },
  'pitman': { label: '2-2-3 Pitman (12s)', cycle: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], hours: 12 },
};

function getShifts() {
  const s = Store.get('shifts', null);
  return s && Array.isArray(s.cycle) && s.cycle.length && s.anchor ? s : null;
}

// 'on' or 'off' for a date, or null when no rotation is set up.
function shiftStatus(date, s = getShifts()) {
  if (!s) return null;
  const o = s.overrides?.[date];
  if (o === 'on' || o === 'off') return o;
  const n = s.cycle.length;
  return s.cycle[((daysBetween(s.anchor, date) % n) + n) % n] ? 'on' : 'off';
}

function scheduledShift(date, s = getShifts()) {
  if (!s) return false;
  const n = s.cycle.length;
  return !!s.cycle[((daysBetween(s.anchor, date) % n) + n) % n];
}

function nextShift(from = isoDate(), s = getShifts()) {
  if (!s) return null;
  for (let i = 0; i < 400; i++) {
    const d = addDays(from, i);
    if (shiftStatus(d, s) === 'on') return d;
  }
  return null;
}

// "7:00 AM – 7:00 AM" style label for a shift that starts on `date`.
function shiftTimes(s = getShifts(), date = isoDate()) {
  if (!s) return '';
  const [h, m] = (s.start || '07:00').split(':').map(Number);
  const start = parseDate(date);
  start.setHours(h, m);
  const end = new Date(start.getTime() + (s.hours || 24) * 3600000);
  const t = d => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${t(start)} – ${t(end)}`;
}

function shiftWho(s = getShifts()) {
  return s?.name?.trim() || '';
}

const APP_ROOT = document.querySelector('meta[name="app-root"]')?.content || './';

// The household Compass app, so the rotation can be sent across.
const COMPASS_SHIFTS_URL = 'https://hecticmedic.github.io/Compass/shifts/';

// Base64url of a rotation, in the same format Compass's Shifts reads.
function shiftShareCode(s, from = isoDate()) {
  const overrides = Object.fromEntries(Object.entries(s.overrides || {}).filter(([d]) => d >= from));
  const payload = { name: s.name, cycle: s.cycle, anchor: s.anchor, start: s.start, hours: s.hours, preset: s.preset, overrides };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Wires up a .tabs bar: buttons with data-tab="x" show the element #tab-x.
function setupTabs(onChange) {
  const buttons = document.querySelectorAll('.tabs button');
  const show = name => {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('[id^="tab-"]').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + name));
    onChange?.(name);
  };
  buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  show(buttons[0].dataset.tab);
  return show;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(APP_ROOT + 'sw.js').catch(() => {});
}
