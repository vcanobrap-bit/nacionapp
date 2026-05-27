"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

interface LoginFormProps {
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, action, isPending] = useActionState(loginAction, undefined);

  const field = `
    w-full rounded-xl px-4 py-2.5 text-sm
    bg-white/[0.05] border border-white/[0.1] text-white placeholder-slate-600
    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40
    transition-all duration-150
  `;

  return (
    <form action={action} noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

      <div className="space-y-4">
        {/* Usuario */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide"
          >
            Usuario
          </label>
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            placeholder="vcanobra"
            className={field}
          />
        </div>

        {/* Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide"
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
            className={field}
          />
        </div>

        {/* Error */}
        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
          >
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {state.error}
          </div>
        )}

        {/* Botón — primary style: white bg, dark text, pill */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full py-2.5 px-4 text-sm font-semibold bg-white hover:bg-white/90 text-[#050B14] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 mt-2"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
