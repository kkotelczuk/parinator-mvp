import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  lastLoginEmail: string | null;
};

const initialState: AuthState = {
  lastLoginEmail: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<string>) => {
      state.lastLoginEmail = action.payload;
    },
  },
});

export const { loginSuccess } = authSlice.actions;

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
