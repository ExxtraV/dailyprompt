import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma"; // used by PrismaAdapter for session persistence

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update") {
        if (session?.name !== undefined) token.name = session.name;
        if (session?.image !== undefined) token.image = session.image;
      }
      if (user) {
        token.id    = user.id;
        token.image = user.image; // cache at sign-in; refreshed via updateSession()
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.sub;
        session.user.image = token.image ?? session.user.image;
        session.user.name  = token.name  ?? session.user.name;
      }
      return session;
    },
  },
};
