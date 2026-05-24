import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">

      {/* ── Top bar ─────────────────────────────────────── */}
      <header className="border-b border-white/[0.06] bg-[#020617]/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              className="text-sm font-semibold text-blue-400 px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
            >
              NacionApp
            </Link>
            <span className="text-white/[0.12]">/</span>
            <Link
              href="/admin/jugadoras"
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
            >
              Jugadoras
            </Link>
            <Link
              href="/admin/partidos"
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
            >
              Partidos
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 hidden sm:block">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-xs text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/20 px-3 py-1.5 rounded-full transition-all duration-150"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
