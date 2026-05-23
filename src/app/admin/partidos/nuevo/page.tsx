import Link from "next/link";
import MatchForm from "../_components/MatchForm";

export const metadata = { title: "Nuevo partido · Admin · NacionApp" };

export default function NuevoPartidoPage() {
  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/admin/partidos" className="hover:text-white transition-colors">
          Partidos
        </Link>
        <span>/</span>
        <span className="text-white">Nuevo partido</span>
      </nav>

      <h1 className="text-2xl font-bold text-white mb-6">Nuevo partido</h1>

      <MatchForm />
    </div>
  );
}
