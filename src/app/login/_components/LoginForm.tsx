"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

interface LoginFormProps {
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, action, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={action} noValidate>
      {/* callbackUrl oculto para preservar la ruta de retorno */}
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="
              w-full rounded-lg px-4 py-2.5 text-sm
              bg-white/8 border border-white/15 text-white placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent
              transition-all duration-150
            "
          />
        </div>

        {/* Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="
              w-full rounded-lg px-4 py-2.5 text-sm
              bg-white/8 border border-white/15 text-white placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent
              transition-all duration-150
            "
          />
        </div>

        {/* Mensaje de error */}
        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
          >
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {state.error}
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isPending}
          className="
            w-full rounded-lg py-2.5 px-4 text-sm font-semibold
            bg-sky-500 hover:bg-sky-400 active:bg-sky-600
            text-white shadow-md shadow-sky-500/20
            focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-transparent
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-all duration-150
            flex items-center justify-center gap-2
          "
        >
          {isPending ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Ingresando…
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </div>
    </form>
  );
}
