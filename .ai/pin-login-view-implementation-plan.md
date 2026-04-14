# View Implementation Plan: PIN Login

## 1. Overview
The PIN Login view is the entry point for Parinator, designed exclusively for pilot accounts. It allows users to authenticate using their email and a 6-digit PIN. The UI emphasizes a mobile-first experience, focusing on quick OTP-style input with robust error handling and network status feedback.

## 2. View Routing
Path: `/login`

## 3. Component Structure
- `PinLoginView` (Page Component)
  - `OfflineIndicator`
  - `AuthPinForm`
    - `EmailInput` (or generic `TextInput` for email)
    - `OtpInput` (6-digit PIN component)
    - `SubmitButton`
    - `ErrorMessage` (Form-wide alerts)

## 4. Component Details

### PinLoginView
- Component description: The main page component that acts as a container for the login flow. It manages offline notification layout.
- Main elements: `<main>` wrapper, page title/logo, `OfflineIndicator`, and `AuthPinForm`.
- Handled interactions: None directly, acts as a layout container.
- Handled validation: None.
- Types: None.
- Props: None.

### AuthPinForm
- Component description: The form responsible for submitting login credentials. It integrates React Hook Form and Zod for validation.
- Main elements: `<form>`, `TextInput` (for email), `OtpInput` (for PIN), submit button with loading state, and an error message banner.
- Handled interactions:
  - Form submission.
  - Displaying API errors (mapping error codes to messages).
- Handled validation:
  - Email (string format email).
  - PIN (precisely 6 digits).
- Types: `LoginFormViewModel`, `PinLoginCommand`, `ApiErrorDto`.
- Props: `onSubmit` (optional if internal hook handles it).

### OtpInput
- Component description: A specialized 6-field input for the 6-digit PIN to ensure OTP-style UX.
- Main elements: Array of 6 individual `<input type="text" inputMode="numeric">` elements.
- Handled interactions:
  - Typing a digit (auto-advances focus to next input).
  - Pressing Backspace (clears current, moves focus to previous input).
  - Pasting a 6-digit string (distributes digits across all 6 inputs).
- Handled validation: Restricts input to numeric characters.
- Types: None.
- Props: `value` (string), `onChange` ((val: string) => void), `disabled` (boolean).

## 5. Types
```typescript
import type { PinLoginCommand, PinLoginResponseDto, ApiErrorDto } from '@packages/schema/src/types';

// ViewModel for React Hook Form
export type LoginFormViewModel = {
  email: string;
  pin: string;
};
```

## 6. State Management
- **Local State:** Form state is managed using `React Hook Form`.
- **Custom API Hook:** `usePinLogin` encapsulates the `POST /api/v1/auth/pin-login` API call. It provides `executeLogin`, `isLoading`, and `error` state.
- **Custom State Hook:** `useNetworkStatus` tracks browser online/offline status for the `OfflineIndicator`.

## 7. API Integration
- **Endpoint:** `POST /api/v1/auth/pin-login`
- **Request payload:** `PinLoginCommand` (`{ email: string, pin: string }`)
- **Response payload:** `PinLoginResponseDto`
- **Integration Workflow:** `AuthPinForm` invokes `usePinLogin.executeLogin(data)`. On success, tokens are saved (via Supabase SSR / context helpers) and the user is redirected to `/dashboard`. On failure, the API error code is exposed via the hook.

## 8. User Interactions
- Typing Email: User interacts with the email input; field validates on blur.
- Typing PIN: Focus is automatically managed between the 6 OTP input boxes.
- Pasting PIN: If a user pastes a 6-digit code into any OTP box, the `OtpInput` intercepts the paste event and fills the form.
- Disconnected: If the device goes offline, a noticeable `OfflineIndicator` is displayed, reflecting the PRD requirement.

## 9. Conditions and Validation
- Handled within `AuthPinForm` using a Zod schema (`z.object({ email: z.string().email(), pin: z.string().length(6).regex(/^\d+$/) })`).
- Submit button expects these interface validations to pass before hitting the `usePinLogin` hook.

## 10. Error Handling
- `400 INVALID_PIN_FORMAT`: Show validation error directly on the PIN field.
- `401 INVALID_CREDENTIALS`: Show "Invalid email or PIN" in the form-wide `ErrorMessage` banner.
- `403 ACCOUNT_INACTIVE`: Show "Account inactive" error.
- `429 TOO_MANY_ATTEMPTS`: Lock form submission and show rate limit warnings.
- Server/Network Errors: Display generic feedback indicating connection issues.

## 11. Implementation Steps
1. Create the `loginFormSchema` with Zod reflecting `LoginFormViewModel`.
2. Build the `OtpInput` component with its focus management refs and paste-handling event listener.
3. Build the `OfflineIndicator` using a `useNetworkStatus` hook.
4. Implement the `usePinLogin` hook to handle the `POST` request and parse errors matching `ApiErrorDto`.
5. Implement `AuthPinForm`, integrating React Hook Form + hook resolvers.
6. Consume `usePinLogin` inside `AuthPinForm` and manage route pushing using Next Router.
7. Assemble `PinLoginView` in `apps/web/src/app/login/page.tsx` integrating all components.
