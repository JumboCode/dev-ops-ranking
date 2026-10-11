// ============================================================
//  Edit this file each semester. Nothing else needs to change.
// ============================================================
window.CONFIG = {
  // Change this each round so old rankings don't mix with new ones.
  round: "fall-2026",

  // Google Apps Script web app URL (see README). Leave empty to run in
  // local test mode, where rankings are saved only in your own browser.
  apiUrl: "https://script.google.com/macros/s/AKfycbwbcX96e2dgERNkhgb7szYLFQhO6QwFdO8TZJFQYcxpdyZAKVnNznmPOLBN4IsBtcBQ/exec",

  // The projects to rank. `id` must be unique and should not change mid-round.
  projects: [
    { id: "project-1", name: "Boston Higher Ground", description: "GIS map of the area" },
    { id: "project-2", name: "Theatre@First", description: "Improvements, bug fixes, etc" },
    { id: "project-3", name: "Food Link", description: "Mobile app, QR code for vans, HUGE project" },
  ],

  // Team sizes are computed automatically from the number of people who
  // submitted (as even as possible, e.g. 10 people / 3 projects -> 4, 3, 3,
  // with the bigger team going wherever it best satisfies preferences).
  // To force specific sizes, set e.g. { "project-1": 4, "project-2": 3, "project-3": 3 }.
  // Sizes must add up to the number of submissions or they are ignored.
  fixedTeamSizes: null,
};
