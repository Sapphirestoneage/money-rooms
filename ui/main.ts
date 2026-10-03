// Entry point for the Money Rooms UI.
// Screens are added in M1 step 6. This placeholder confirms the build runs.

const app = document.getElementById("app");

if (app) {
  const title = document.createElement("h1");
  title.textContent = "Money Rooms";

  const line = document.createElement("p");
  line.className = "muted";
  line.textContent = "Version 2. The walking skeleton is under construction.";

  app.append(title, line);
}
