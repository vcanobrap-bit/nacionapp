"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Cada cuánto pedir datos frescos mientras hay partido en vivo. */
const INTERVALO_MS = 6000;

/**
 * Mantiene la vista al día para quien mira el partido sin ser admin.
 *
 * La página se renderiza en el servidor una vez, al cargar. El admin ve sus
 * propios cambios porque cada acción llama a `router.refresh()` en SU
 * cliente; el resto de los espectadores no se entera de nada. Este componente,
 * SOLO mientras hay un partido en curso, pide datos frescos cada pocos
 * segundos. `router.refresh()` conserva el estado del cliente (pestaña activa,
 * modales abiertos, scroll), así que no se nota.
 *
 * El reloj no depende de esto para correr: apenas llega `periodStartedAt`
 * —la marca del momento en que el admin apretó "iniciar"—, el intervalo local
 * de LiveMatchCard arranca y sigue solo. El sondeo solo importa para goles,
 * tarjetas, cambios y fases.
 *
 * Camino de mejora si el sondeo llega a molestar: Supabase Realtime
 * disparando este mismo `router.refresh()` al cambiar `matches` o
 * `match_events`. Mismo efecto, distinto disparador.
 */
export default function LiveRefresher({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const refrescar = () => {
      // En segundo plano no vale la pena gastar pedidos ni batería.
      if (document.visibilityState === "visible") router.refresh();
    };

    const id = setInterval(refrescar, INTERVALO_MS);
    // Al volver a la pestaña, ponerse al día de inmediato en vez de esperar
    // el próximo tick. (En el evento de "ocultar", refrescar() no hace nada.)
    document.addEventListener("visibilitychange", refrescar);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [enabled, router]);

  return null;
}
