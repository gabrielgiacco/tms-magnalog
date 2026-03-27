import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | MagnaLog TMS", default: "MagnaLog TMS" },
  description: "Sistema de Gestão de Transportes - Carga Fracionada",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#ffffff",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
