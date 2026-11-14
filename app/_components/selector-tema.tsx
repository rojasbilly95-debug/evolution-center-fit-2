
"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const suscribir = () => () => {};
const cliente = () => true;
const servidor = () => false;

export default function SelectorTema() {
  const disponible = useSyncExternalStore(
    suscribir,
    cliente,
    servidor
  );

  const { theme, setTheme } = useTheme();

  const temaActual =
    disponible &&
    (theme === "light" ||
      theme === "dark" ||
      theme === "system")
      ? theme
      : "light";

  return (
    <div className="ecf-theme-control">
      <svg
        aria-hidden="true"
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        {temaActual === "dark" ? (
          <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        )}
      </svg>

      <label
        htmlFor="ecf-selector-tema"
        className="sr-only"
      >
        Apariencia de la aplicación
      </label>

      <select
        id="ecf-selector-tema"
        aria-label="Cambiar modo de apariencia"
        value={temaActual}
        disabled={!disponible}
        onChange={(evento) =>
          setTheme(evento.target.value)
        }
      >
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
        <option value="system">Automático</option>
      </select>
    </div>
  );
}
