import { test, expect } from "@playwright/test";

test("can submit login form", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Haslo").fill("password123");
  await page.getByRole("button", { name: "Zaloguj" }).click();

  await expect(page.getByText("Zalogowano jako test@example.com")).toBeVisible();
});
