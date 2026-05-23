import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import type { Role } from "@/generated/prisma";

// Instancia dedicada para auth (no usa el singleton global,
// ya que auth.ts puede ejecutarse en contextos distintos al de la app)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Página de login personalizada ─────────────────────
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ── Sesiones por JWT (sin base de datos) ─────────────
  session: { strategy: "jwt" },

  // ── Provider: credenciales (email + password) ────────
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: { id: true, email: true, password: true, role: true },
        });

        if (!user) return null;

        // Solo los ADMIN pueden autenticarse.
        // Las jugadoras (PLAYER) acceden a las vistas públicas sin login.
        if (user.role !== "ADMIN") return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  // ── Callbacks: inyectar role en JWT → Session ────────
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
