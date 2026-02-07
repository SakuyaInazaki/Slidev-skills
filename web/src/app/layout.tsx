import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Slidev Converter - Markdown to Slides",
  description: "Convert Markdown to beautiful Slidev presentations",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {children}
      </body>
    </html>
  )
}
