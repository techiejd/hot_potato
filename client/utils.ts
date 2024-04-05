import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { HotPotato } from "../target/types/hot_potato";
import fs from "fs";

export const initializeBoardAccount = async (
  gameMasterAccountKp: web3.Keypair,
  program: anchor.Program<HotPotato>
) => {
  const boardAccountKp = new web3.Keypair();
  const boardAccountSize = program.account.board.size;
  const lamportsForRentExemption =
    await program.provider.connection.getMinimumBalanceForRentExemption(
      boardAccountSize
    );
  const createAccountInstruction = web3.SystemProgram.createAccount({
    fromPubkey: gameMasterAccountKp.publicKey,
    newAccountPubkey: boardAccountKp.publicKey,
    lamports: lamportsForRentExemption,
    space: boardAccountSize,
    programId: program.programId,
  });
  const transaction = new web3.Transaction().add(createAccountInstruction);
  await web3.sendAndConfirmTransaction(
    program.provider.connection,
    transaction,
    [gameMasterAccountKp, boardAccountKp]
  );
  return boardAccountKp;
};

export const airdrop = async (
  addy: web3.PublicKey,
  program: anchor.Program<HotPotato>
) => {
  const airdropSignature = await program.provider.connection.requestAirdrop(
    addy,
    5 * web3.LAMPORTS_PER_SOL
  );
  return confirmTx(airdropSignature, program);
};

export const confirmTx = async (
  txHash: string,
  program: anchor.Program<HotPotato>
) => {
  const latestBlockHash =
    await program.provider.connection.getLatestBlockhash();

  return program.provider.connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: txHash,
  });
};

export const oneDay: anchor.BN = new anchor.BN(86400); // seconds
export const permilleProgramFee = 35; // 3.5% percent
export const bigNumZero = new anchor.BN(0);
export const minimumTicketEntry = new anchor.BN(web3.LAMPORTS_PER_SOL / 2);
export const TicketEntrySplit = 100;
export const MaxNumTurns = 150;
export const MaxNumPlayers = 10_000;
export const MaxNumOfRemainingAccountsDoableInOneDisbursementTx = 25;
export const oneHour = new anchor.BN(3600); // seconds

export async function printBalance(
  program: anchor.Program<HotPotato>,
  pubkey?: web3.PublicKey
) {
  const currentKey = pubkey || program.provider.publicKey;
  console.log("My address:", currentKey.toString());
  const balance = await program.provider.connection.getBalance(currentKey);
  console.log(`My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);
}

export function saveSecretKeyWithTimestamp(kp: web3.Keypair, fileName: string) {
  fs.writeFileSync(
    `${fileName}_${Date.now().toString()}.json`,
    "[" + kp.secretKey.toString() + "]"
  );
}

export function loadKeypair(fileName: string) {
  const secretKeyString = fs.readFileSync(fileName, { encoding: "utf-8" });
  const secretKeyArray = JSON.parse(secretKeyString);
  const secretKeyUInt8Array = new Uint8Array(secretKeyArray);
  return web3.Keypair.fromSecretKey(secretKeyUInt8Array);
}
