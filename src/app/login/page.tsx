import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./_components/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export const metadata = { title: "Iniciar sesión · NacionApp" };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Si ya hay una sesión admin activa, ir directo al panel
  const session = await auth();
  if (session) redirect("/admin");

  const { callbackUrl, error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
      {/* Fondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500 shadow-lg shadow-sky-500/30 mb-4">
            <svg
              className="w-9 h-9 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6l1.5 3.5L17 10l-2.5 2.5.5 3.5L12 14.5 9 16l.5-3.5L7 10l3.5-.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            NacionApp
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Acceso administradores
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Error de permiso desde el middleware */}
          {error === "no-permission" && (
            <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              No tenés permisos para acceder a esa sección.
            </div>
          )}

          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} NacionApp · Selección Argentina Femenina
        </p>
      </div>
    </main>
  );
}
