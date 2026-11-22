import type { Metadata } from "next";
import { Anton, IBM_Plex_Mono, Inter, Inter_Tight, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

// As cinco famílias do Manual da Marca (todas no Google Fonts).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "MCI",
  description: "Portal e área da organização do MCI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontes = [inter, interTight, instrumentSerif, plexMono, anton].map((f) => f.variable).join(" ");
  return (
    // suppressHydrationWarning: o next-themes põe a classe do tema no <html> antes da hidratação.
    <html lang="pt-BR" suppressHydrationWarning className={`${fontes} h-full`}>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
