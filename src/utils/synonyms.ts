const SYNONYMS: Record<string, string[]> = {
  // Dialog / overlays
  confirm:      ["modal", "dialog", "alert", "confirmation"],
  dialog:       ["modal", "overlay", "popup", "confirm"],
  popup:        ["modal", "overlay", "dialog"],
  alert:        ["modal", "dialog", "notification"],
  lightbox:     ["modal", "overlay", "dialog"],

  // Notifications
  notification: ["alert", "toast"],
  toast:        ["notification", "alert"],

  // Tables / data
  table:        ["datatable", "grid", "rows", "data"],
  grid:         ["datatable", "table", "layout"],
  list:         ["datatable", "table", "rows"],
  rows:         ["datatable", "table"],
  spreadsheet:  ["datatable", "table", "data"],
  sort:         ["datatable", "table"],
  pagination:   ["datatable", "table", "navigation"],

  // Forms / inputs
  input:        ["field", "text", "form", "entry"],
  field:        ["input", "form", "data-entry", "text"],
  textbox:      ["input", "field", "text"],
  "text field": ["input", "field"],
  search:       ["input", "query", "filter"],
  filter:       ["input", "search", "query"],
  form:         ["input", "field", "data-entry"],

  // Actions / buttons
  button:       ["action", "cta", "submit", "click"],
  btn:          ["button", "action", "cta"],
  action:       ["button", "cta"],
  cta:          ["button", "action"],
  submit:       ["button", "form"],
  click:        ["button", "action"],

  // Layout / containers
  container:    ["card", "box", "wrapper", "panel"],
  panel:        ["card", "container", "box"],
  box:          ["card", "container", "panel"],
  tile:         ["card", "container"],
  widget:       ["card", "container", "dashboard"],
  wrapper:      ["card", "container"],

  // Navigation
  navigation:   ["nav", "menu", "sidebar"],
  nav:          ["navigation", "menu"],
  menu:         ["navigation", "nav", "dropdown"],
  dropdown:     ["menu", "select", "options"],
  sidebar:      ["navigation", "settings"],
  select:       ["dropdown", "options", "input"],

  // Dashboard / admin
  admin:        ["datatable", "dashboard"],
  dashboard:    ["card", "admin", "overview"],
  overview:     ["dashboard", "card"],
  reporting:    ["datatable", "table", "admin"],

  // Loading states
  loading:      ["spinner", "skeleton", "progress"],
  spinner:      ["loading", "skeleton"],
  skeleton:     ["loading", "placeholder"],
};

export function expandQueryTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const related = SYNONYMS[token];
    if (related) {
      for (const s of related) expanded.add(s);
    }
  }
  return [...expanded];
}
