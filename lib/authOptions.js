// lib/authOptions.js
//
// Server-only NextAuth configuration. Users are stored in Google Drive (see
// lib/driveStore.js) — one JSON file per username, holding a bcrypt hash,
// never a plain password. This file must only be imported from server-side
// code (the [...nextauth] route handler, or getServerSession() calls in
// Server Components / API routes).

import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { driveGet } from "./driveStore";
import { userKey } from "./data";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Username dan Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await driveGet(userKey(credentials.username), null);
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.username,
          name: user.name,
          role: user.role,
          studentId: user.studentId || null,
          schoolId: user.schoolId || null,
          classId: user.classId || null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.studentId = user.studentId;
        token.schoolId = user.schoolId;
        token.classId = user.classId;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.username = token.sub;
      session.user.name = token.name;
      session.user.role = token.role;
      session.user.studentId = token.studentId;
      session.user.schoolId = token.schoolId;
      session.user.classId = token.classId;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
