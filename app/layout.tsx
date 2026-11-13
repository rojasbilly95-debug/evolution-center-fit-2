
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import "./tema-evolution.css";

import ProveedorTema from "./_components/proveedor-tema";
import SelectorTema from "./_components/selector-tema";

// ============================================
// EVOLUTION CENTER FIT 2.0
// FASE 126.5
// LAYOUT GLOBAL CON SISTEMA DE TEMAS
//
// Compatible con:
// - Administrador
// - Entrenador
// - Cliente
//
// Apariencias:
// - Claro
// - Oscuro
// - Automático
// ============================================

// ============================================
// 1. FUENTES
// ============================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ============================================
// 2. METADATOS
// ============================================

export const metadata: Metadata = {
  title: {
    default: "Evolution Center Fit 2.0",
    template: "%s | Evolution Center Fit 2.0",
  },

  description:
    "Plataforma inteligente para la recomendación de rutinas, " +
    "gestión del entrenamiento y seguimiento de adherencia.",

  applicationName: "Evolution Center Fit 2.0",
};

// ============================================
// 3. LAYOUT PRINCIPAL
// ============================================

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProveedorTema>
          {children}

          {/* Selector disponible para todos los roles */}
          <SelectorTema />
        </ProveedorTema>
      </body>
    </html>
  );
}
