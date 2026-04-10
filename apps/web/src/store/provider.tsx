"use client";

import React from "react";
import { useState, type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";

export function StoreProvider({ children }: PropsWithChildren) {
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
