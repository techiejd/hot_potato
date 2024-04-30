"use client";

import { useState } from "react";
import SunPotato from "./svgs/SunPotato";
import PhantomLogo from "./svgs/PhantomLogo";

import {
  Connection,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  PublicKey,
} from "@solana/web3.js";

declare global {
  interface Window {
    solana: any;
    phantom: any;
  }
}

const getProvider = () => {
  if ("phantom" in window) {
    const provider = window.phantom?.solana;

    if (provider?.isPhantom) {
      return provider;
    }
  }

  window.open("https://phantom.app/", "_blank");
};

const NETWORK_URL = "http://127.0.0.1:8899";
const gameMasterPublicKey = new PublicKey(
  "Au5AT3CPcnQNf3ydRwbMrNYwkhanvKvZdwPSkguLDLeJ"
);

const SolPotato = () => {
  const provider = getProvider();

  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!provider) return;

    try {
      await provider.connect();
      setConnected(true); // Set 'connected' state to true if connection successful
    } catch (error) {
      console.error("Error connecting:", error);
    }
  };

  const handleSendTransaction = async () => {
    if (!provider) return;

    try {
      const provider = getProvider(); // see "Detecting the Provider"

      const playerPublicKey = provider.publicKey;

      const network = NETWORK_URL;
      const connection = new Connection(network);

      let minRent = await connection.getMinimumBalanceForRentExemption(0);
      let blockhash = await connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);

      // create an array with your desires `instructions`
      const instructions = [
        SystemProgram.transfer({
          lamports: minRent,
          fromPubkey: playerPublicKey,
          toPubkey: gameMasterPublicKey,
        }),
      ];

      // create v0 compatible message
      const messageV0 = new TransactionMessage({
        payerKey: playerPublicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      const { signature } = await provider.signAndSendTransaction(transaction);
      await connection.getSignatureStatus(signature);
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <header className="min-h-[88px] flex items-center justify-between w-full p-4 bg-gray-800 text-white">
        <div className="flex items-center">
          <SunPotato className="h-10 w-10" />
          <h1 className="text-2xl font-bold ml-2">Sol Potato</h1>
        </div>
        {!connected ? (
          <button
            className="px-4 py-2 bg-white font-medium text-gray-800 rounded-lg hover:bg-gray-200 flex flex-row items-center"
            onClick={handleConnect}
          >
            <PhantomLogo className="h-10 w-10 mr-2.5 rounded-lg" />
            Connect to Phantom Wallet
          </button>
        ) : (
          <span className="text-white">Phantom wallet connected</span>
        )}
      </header>
      <main className="h-full">
        <div className="flex flex-row items-center justify-center mt-2">
          {connected && (
            <button
              className="mt-8 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600"
              onClick={handleSendTransaction}
            >
              Send SOL to Hot Potato
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default SolPotato;
