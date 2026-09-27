import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import Header from "./Header";
import { AuthContext } from "../utils/authContext";
import { signInWithGoogle } from "../utils/auth";
import { appTheme } from "../utils/theme";

// CRA's Jest resolver follows the missing legacy main field in react-router-dom 7.
jest.mock("react-router-dom", () => require("react-router"), { virtual: true });
jest.mock("../utils/auth", () => ({
  signInWithGoogle: jest.fn(),
  logout: jest.fn(),
}));

test("shows an actionable message when Firebase rejects the deployed domain", async () => {
  signInWithGoogle.mockRejectedValueOnce({ code: "auth/unauthorized-domain" });
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    render(
      <ThemeProvider theme={appTheme}>
        <AuthContext.Provider value={{ user: null, isAdmin: false, isEmulatorMode: false }}>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText(/add this domain in Firebase Authentication settings/i)).toBeInTheDocument();
  } finally {
    consoleError.mockRestore();
  }
});
