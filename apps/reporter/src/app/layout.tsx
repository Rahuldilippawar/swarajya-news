import { AuthProvider } from "@swarajya/panel-kit";
import "@swarajya/panel-kit/panel.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Reporter Panel | Swarajya News", template: "%s | Reporter Panel" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
