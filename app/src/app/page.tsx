"use client";

import { useState } from "react";
import SunPotato from "./svgs/SunPotato";
import PhantomLogo from "./svgs/PhantomLogo";

import { HotPotato, IDL } from "../../../target/types/hot_potato";
import * as anchor from '@coral-xyz/anchor'

import {
  Connection,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

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

const MINIMUM_SOL_SEND_AMOUNT = new anchor.BN(LAMPORTS_PER_SOL / 2)

const programPublicKey = new PublicKey(
  "Au5AT3CPcnQNf3ydRwbMrNYwkhanvKvZdwPSkguLDLeJ"
);

const gameMasterAccountPublicKey = new PublicKey(
  "6bvSxGiX8mSRjoC8N5YBKeNvg99wRFfBCqX2VadVb9U6"
);

const boardAccountPublicKey = new PublicKey(
  "9YZMzXL7WVBkPp6XUrwakX6WAgmdEYNFrSMjnMuzuQWK"
);

const gameAccountPublicKey = new PublicKey(
  "GnDkQ41MbRDB81XRcxVD3buD3smUySDkBJu25bd7rMvg"
);

const SolPotato = () => {
  const provider = getProvider();
  const program = new Program(IDL, programPublicKey, provider);

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
      const playerPublicKey = provider.publicKey;
      const network = clusterApiUrl('devnet');
      const connection = new Connection(network);

      const anchorTransaction = await program.methods.requestHotPotato(MINIMUM_SOL_SEND_AMOUNT).accounts({
        game: gameAccountPublicKey,
        board: boardAccountPublicKey,
        player: playerPublicKey,
        systemProgram: SystemProgram.programId,
      }).transaction()

      anchorTransaction.recentBlockhash = await connection.getLatestBlockhash().then((res) => res.blockhash)
      anchorTransaction.feePayer = playerPublicKey

      const { signature } = await provider.signAndSendTransaction(anchorTransaction);
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
