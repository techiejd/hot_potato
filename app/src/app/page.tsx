"use client";

import { useState } from "react";

import { IDL } from "../hot_potato";
import * as anchor from "@coral-xyz/anchor";

import {
  Connection,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { programPublicKey } from "./utils";

const MINIMUM_SOL_SEND_AMOUNT = new anchor.BN(LAMPORTS_PER_SOL / 2);

const gameMasterAccountPublicKey = new PublicKey(
  "6bvSxGiX8mSRjoC8N5YBKeNvg99wRFfBCqX2VadVb9U6"
);

const boardAccountPublicKey = new PublicKey(
  "9YZMzXL7WVBkPp6XUrwakX6WAgmdEYNFrSMjnMuzuQWK"
);

const gameAccountPublicKey = new PublicKey(
  "GnDkQ41MbRDB81XRcxVD3buD3smUySDkBJu25bd7rMvg"
);

/**
 * 
 * @returns const handleSendTransaction = async () => {
    if (!provider) return;

    try {
      const playerPublicKey = provider.publicKey;
      const network = clusterApiUrl("devnet");
      const connection = new Connection(network);

      const anchorTransaction = await program.methods
        .requestHotPotato(MINIMUM_SOL_SEND_AMOUNT)
        .accounts({
          game: gameAccountPublicKey,
          board: boardAccountPublicKey,
          player: playerPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      anchorTransaction.recentBlockhash = await connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);
      anchorTransaction.feePayer = playerPublicKey;

      const { signature } =
        await provider.signAndSendTransaction(anchorTransaction);
      await connection.getSignatureStatus(signature);
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };
 */

const SolPotato = () => {
  return <>Hello world</>;
};

export default SolPotato;
