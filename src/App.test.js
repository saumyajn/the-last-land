import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { AuthContext } from "./utils/authContext";

// CRA's Jest resolver follows the missing legacy main field in react-router-dom 7.
jest.mock("react-router-dom", () => require("react-router"), { virtual: true });
jest.mock("@vercel/analytics/react", () => ({ Analytics: () => null }), { virtual: true });
jest.mock("./components/Header", () => () => null);
jest.mock("./components/Footer", () => () => null);
jest.mock("./components/stats/StatsPage", () => () => <div>Protected stats page</div>);
jest.mock("./components/formation/FormationPage", () => () => <div>Protected formation page</div>);
jest.mock("./components/report/ReportPage", () => () => <div>Protected report page</div>);
jest.mock("./components/analytics/AnalyticsPage", () => () => <div>Protected analytics page</div>);

const renderWithAuth = (auth) => render(
  <AuthContext.Provider value={auth}>
    <App />
  </AuthContext.Provider>
);

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

test.each(["/stats", "/formation", "/report", "/analytics"])(
  "viewer is redirected from %s to Overview",
  async (path) => {
    window.history.replaceState({}, "", path);
    renderWithAuth({ user: null, isAdmin: false, authReady: true });

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(await screen.findByText("Production-sensitive analytics for messy game screenshots and real alliance workflows.")).toBeInTheDocument();
    expect(screen.getByText("Stat Extraction")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Data Upload" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Data Upload|Analytics|Formations|Reports/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Protected .* page/)).not.toBeInTheDocument();
  }
);

test("Overview is visible while authentication is still loading", async () => {
  renderWithAuth({ user: null, isAdmin: false, authReady: false });

  expect(await screen.findByText("Production-sensitive analytics for messy game screenshots and real alliance workflows.")).toBeInTheDocument();
});

test("admin can open a protected page after authentication resolves", async () => {
  window.history.replaceState({}, "", "/stats");
  const { rerender } = renderWithAuth({ user: null, isAdmin: false, authReady: false });

  expect(screen.getByText("Loading workspace...")).toBeInTheDocument();
  expect(window.location.pathname).toBe("/stats");

  rerender(
    <AuthContext.Provider value={{ user: { email: "admin@example.test" }, isAdmin: true, authReady: true }}>
      <App />
    </AuthContext.Provider>
  );

  expect(await screen.findByText("Protected stats page")).toBeInTheDocument();
  expect(window.location.pathname).toBe("/stats");
});
