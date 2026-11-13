
"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

type Props = {
  children: ReactNode;
};

export default function ProveedorTema({
  children,
}: Props) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="ecf-tema"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
