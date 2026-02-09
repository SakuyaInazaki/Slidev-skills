import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

const providers: any[] = []

// Only add GitHub provider if credentials are configured
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  )
}

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
  )
}

// If no providers are configured, add a dummy one to prevent errors
if (providers.length === 0) {
  console.warn("No OAuth providers configured. Please set GITHUB_ID/GITHUB_SECRET or GOOGLE_ID/GOOGLE_SECRET environment variables.")
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: providers.length > 0 ? PrismaAdapter(prisma) : undefined,
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: providers.length > 0 ? "database" : "jwt",
  },
})
