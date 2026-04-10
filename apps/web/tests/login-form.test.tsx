import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/src/features/auth/login-form";
import { StoreProvider } from "@/src/store/provider";

describe("LoginForm", () => {
  it("shows validation errors and then successful login", async () => {
    const user = userEvent.setup();

    render(
      <StoreProvider>
        <LoginForm />
      </StoreProvider>,
    );

    await user.click(screen.getByRole("button", { name: /zaloguj/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/haslo/i), "password123");
    await user.click(screen.getByRole("button", { name: /zaloguj/i }));

    expect(await screen.findByText(/zalogowano jako user@example.com/i)).toBeInTheDocument();
  });
});
