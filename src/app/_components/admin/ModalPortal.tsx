"use client";

import { createPortal } from "react-dom";

/**
 * Renderiza a `document.body`, fuera de cualquier contexto de apilamiento.
 *
 * Sin esto, un modal montado dentro de `<main className="relative z-10">`
 * queda por debajo del header (`z-20`) por más `z-50` que tenga: un ancestro
 * con z-index crea un contexto de apilamiento y encierra a sus descendientes.
 *
 * Solo se usa dentro de modales que se montan tras un click, así que en SSR
 * nunca hay contenido que renderizar y no hay riesgo de mismatch de hidratación.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
