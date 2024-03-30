import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import type { HotPotato } from "../target/types/hot_potato";
import {
  airdrop,
  confirmTx,
  initializeBoardAccount,
  oneDay,
  oneHour,
  printBalance,
} from "./utils";
import fs from "fs";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

// Call anonymous function
(async () => {
  const listener = program.addEventListener("GameInitialized", (event) => {
    console.log("Game initialized event:", event);
    program.removeEventListener(listener);
  });
  const gameMasterAccountKp = web3.Keypair.generate();
  await printBalance(program, gameMasterAccountKp.publicKey);
  console.log("Airdropping to the game master...");
  await airdrop(gameMasterAccountKp.publicKey, program);
  console.log("Airdrop successful");
  await printBalance(program, gameMasterAccountKp.publicKey);

  // Save the gameMasterAccountKp to a local file
  console.log(gameMasterAccountKp.publicKey.toString());
  fs.writeFileSync(
    `../gameMasterAccountKp${Date.now().toString()}`,
    JSON.stringify(gameMasterAccountKp)
  );

  // Create a new board
  console.log("Creating a new board...");
  const boardAccountKp = await initializeBoardAccount(
    gameMasterAccountKp,
    program
  );
  console.log(boardAccountKp.publicKey.toString());
  fs.writeFileSync(
    `../boardAccountKp${Date.now().toString()}`,
    JSON.stringify(boardAccountKp)
  );

  const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
    [
      boardAccountKp.publicKey.toBuffer(),
      gameMasterAccountKp.publicKey.toBuffer(),
    ],
    program.programId
  );
  console.log("Game account public key:", gameAccountPublicKey.toString());

  // Initialize the game
  console.log("Initializing the game...");
  const txHash = await program.methods
    .initialize(oneDay, oneHour, new anchor.BN(web3.LAMPORTS_PER_SOL / 2), 35)
    .accounts({
      newGame: gameAccountPublicKey,
      newBoard: boardAccountKp.publicKey,
      gameMaster: gameMasterAccountKp.publicKey,
      boardAsSigner: boardAccountKp.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([gameMasterAccountKp, boardAccountKp])
    .rpc();
  console.log("Transaction hash initializing:", txHash);
  await confirmTx(txHash, program);
  console.log("Game initialized!");
})();
