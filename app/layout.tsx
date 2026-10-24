import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: { default: "Russian Coach", template: "%s | Russian Coach" },
  description: "Impara il russo da zero con lezioni giornaliere adattive. Gratis, senza account, i progressi restano nel tuo browser.",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: { icon: `${basePath}/icon.svg`, apple: `${basePath}/icon-192.png` },
  appleWebApp: { capable: true, title: "Russian Coach", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#11141b" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applica il tema salvato prima del primo disegno (evita il lampo bianco).
const themeScript = `try{var t=localStorage.getItem('rc.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">Vai al contenuto</a>
        <AppProvider>
          <Nav />
          <main id="main" className="wrap">
            {children}
          </main>
        </AppProvider>
        <SwRegister />
      </body>
    </html>
  );
}
