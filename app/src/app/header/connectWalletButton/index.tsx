"use client";
import dynamic from "next/dynamic";
const BaseWalletMultiButton = dynamic(
  () =>
    import("../../../wallet-adapter-react-ui").then(
      (mod) => mod.BaseWalletMultiButton
    ),
  {
    loading: () => <p>loading...</p>,
  }
);

export const ConnectWalletButton = () => {
  return (
    <BaseWalletMultiButton
      labels={{
        "change-wallet": "Change wallet",
        connecting: "Connecting ...",
        "copy-address": "Copy address",
        copied: "Copied",
        disconnect: "Disconnect",
        "has-wallet": "[connect wallet]",
        "no-wallet": "[connect wallet]",
      }}
    />
  );
};
