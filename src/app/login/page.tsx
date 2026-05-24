import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import LoginForm from "./_components/LoginForm";
import WebGLBackground from "@/app/_components/WebGLBackground";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export const metadata = { title: "Iniciar sesión · NacionApp" };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) redirect("/admin");

  const { callbackUrl, error } = await searchParams;

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#020617] px-4 py-12 overflow-hidden">
      {/* WebGL dot-matrix background */}
      <WebGLBackground />

      {/* Radial glow — sutil detrás del card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[600px] h-[600px] rounded-full bg-blue-600/[0.06] blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/img/logo.svg"
            alt="Selección Argentina Femenina"
            width={52}
            height={62}
            className="mb-5 drop-shadow-lg"
          />
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            NacionApp
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Acceso administradores
          </p>
        </div>

        {/* Card — gradient border shell */}
        <div className="p-px rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.03]">
          <div className="rounded-[15px] bg-gradient-to-br from-[#0A1525] to-[#060D1A] backdrop-blur-xl p-6 sm:p-8">

            {error === "no-permission" && (
              <div className="mb-5 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                No tenés permisos para acceder a esa sección.
              </div>
            )}

            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} NacionApp · Selección Argentina Femenina
        </p>
      </div>
    </main>
  );
}
