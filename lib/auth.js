import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        // Fetch the latest user data (like custom image) from the database
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
        });
        if (user) {
          session.user.image = user.image;
          session.user.name = user.name; // Ensure we have the latest name
        }
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
        if (trigger === "update" && session?.name) {
            token.name = session.name
        }
        if (user) {
            token.id = user.id
        }
        return token
    }
  },
};
