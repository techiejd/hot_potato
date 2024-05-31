"use client";
import { FC, useCallback, useMemo, useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import SuggestedInputs from "./suggestedInputs";
import CtaButton from "./ctaButton";
import { IDL, programId } from "../../../program";
import InputBox from "./inputBox";

const gameMasterAccountPublicKey = new anchor.web3.PublicKey(
  "6bvSxGiX8mSRjoC8N5YBKeNvg99wRFfBCqX2VadVb9U6"
);

const boardAccountPublicKey = new anchor.web3.PublicKey(
  "9YZMzXL7WVBkPp6XUrwakX6WAgmdEYNFrSMjnMuzuQWK"
);

const gameAccountPublicKey = new anchor.web3.PublicKey(
  "GnDkQ41MbRDB81XRcxVD3buD3smUySDkBJu25bd7rMvg"
);

const convertInputToLamports = (str: string) => {
  // If there's a decimal, make sure only 9 digits are after it
  const [wholeNumber, decimal] = str.split(".");
  if (decimal && decimal.length > 9) {
    throw new Error(`Too many decimal places. 
    1 Sol = 1e9 lamports.
    Please enter a number with 9 or fewer decimal places.`);
  }

  // Apend the remaining zeros
  const totalDecimal = decimal ? decimal.padEnd(9, "0") : "0".repeat(9);

  // Convert the whole number to lamports
  const wholeNumberLamports = new anchor.BN(wholeNumber + totalDecimal);

  return wholeNumberLamports;
};

const ContributionInput: FC = () => {
  const [contribution, setContribution] = useState("");
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [sendingSol, setSendingSol] = useState(false);
  const provider = useMemo(() => {
    if (!wallet) return;
    const p = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(p);
    return p;
  }, [connection, wallet]);
  const program = useMemo(() => {
    if (!provider) return;
    return new anchor.Program(IDL, programId, provider);
  }, [provider]);
  const handleSendTransaction = useCallback(async () => {
    if (!wallet) {
      alert("Wallet not connected");
      return;
    }
    if (!provider) {
      alert("Provider not connected");
      return;
    }
    if (!program) {
      alert("Program not connected");
      return;
    }

    try {
      setSendingSol(true);
      const lamports = convertInputToLamports(contribution);

      const anchorTransaction = await program.methods
        .requestHotPotato(lamports)
        .accounts({
          game: gameAccountPublicKey,
          board: boardAccountPublicKey,
          player: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      anchorTransaction.recentBlockhash = await connection
        .getLatestBlockhash()
        .then((res) => res.blockhash);
      anchorTransaction.feePayer = provider.publicKey;

      const signature = await provider.sendAndConfirm(anchorTransaction);
      const status = await connection.getSignatureStatus(signature);
      console.log("Status:", status);
      setSendingSol(false);
    } catch (error) {
      const e = anchor.AnchorError.parse((error as any).logs as string[]);
      alert(
        `Error sending transaction: ${e ? JSON.stringify(e.error, null, 2) : error}`
      );
      setSendingSol(false);
    }
  }, [connection, wallet, provider, contribution, program]);
  return (
    <form
      className="self-stretch flex flex-col items-start justify-center gap-[10px] max-w-full text-5xl text-rosybrown"
      onSubmit={(e) => {
        e.preventDefault();
        handleSendTransaction();
      }}
    >
      <InputBox contribution={contribution} setContribution={setContribution} />
      <SuggestedInputs setContribution={setContribution} />
      <CtaButton submitting={sendingSol} />
    </form>
  );
};

export default ContributionInput;
