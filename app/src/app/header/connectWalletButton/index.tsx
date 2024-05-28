"use client";
import dynamic from "next/dynamic";
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  {
    loading: () => <p>Loading...</p>,
  }
);
import "./styles.css";

export const ConnectWalletButton = () => {
  return <WalletMultiButton className="wallet-adapter-button-main" />;
};
