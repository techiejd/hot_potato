import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "./walletContext";
import Header from "./header";
import { ExplanationDialogProvider } from "./explanationDialog/context";

export const metadata: Metadata = {
  title: "sol ponzu",
  description: "this is dumb game for profit n lulz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletContextProvider>
          <ExplanationDialogProvider>
            <div className="w-full min-h-screen relative bg-wheat overflow-hidden flex flex-col items-end justify-start pt-0 px-0 box-border gap-[48px] leading-[normal] tracking-[normal]">
              <Header />
              {children}
            </div>
          </ExplanationDialogProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
