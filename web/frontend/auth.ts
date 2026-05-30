import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";
const API_URL = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8001";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Only on initial sign-in (account is present)
      if (account && profile) {
        token.googleId = profile.sub;
        token.email = profile.email;
        token.name = profile.name;
        token.picture = (profile as any).picture;

        // Sync user to FastAPI backend
        try {
          const res = await fetch(`${API_URL}/auth/sync-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Key": INTERNAL_API_KEY,
            },
            body: JSON.stringify({
              google_id: profile.sub,
              email: profile.email,
              name: profile.name,
              avatar_url: (profile as any).picture,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.sub = data.user_id ?? data.id;
            token.sessionToken = data.session_token;
          } else {
            console.error("[auth] sync-user failed:", res.status, await res.text().catch(() => ""));
          }
        } catch (err) {
          console.error("[auth] sync-user error:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub as string;
      }
      // Expose googleId ke session supaya bisa dipakai sebagai x-user-id ke backend
      if (token.googleId) {
        (session.user as any).googleId = token.googleId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
