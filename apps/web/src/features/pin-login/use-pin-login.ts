"use client";

import { useState } from "react";
import type { LoginInput, ApiErrorDto } from "@parinator/schema";

export interface LoginResponse {
  accessToken: string;
  userId: string;
}

export interface UseLoginReturn {
  executeLogin: (data: LoginInput) => Promise<LoginResponse | null>;
  isLoading: boolean;
  error: ApiErrorDto["error"] | null;
}

export function useLogin(): UseLoginReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorDto["error"] | null>(null);

  const executeLogin = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorData: ApiErrorDto | undefined;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // Response was not JSON
        }
        
        if (errorData && errorData.error) {
          setError(errorData.error);
        } else {
          setError({
            code: response.status.toString(),
            message: "Wystąpił błąd podczas autoryzacji.",
            details: {},
          });
        }
        return null;
      }

      const responseData = (await response.json()) as LoginResponse;
      return responseData;
    } catch (err) {
      setError({
        code: "NETWORK_ERROR",
        message: "Brak połącznia z siecią lub serwer jest niedostępny.",
        details: {},
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { executeLogin, isLoading, error };
}
