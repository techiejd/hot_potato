import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import type { HotPotato } from "../target/types/hot_potato";
import {
  airdrop,
  confirmTx,
  initializeBoardAccount,
  loadKeypair,
  oneDay,
  oneHour,
  printBalance,
  saveSecretKeyWithTimestamp,
} from "./utils";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

// Call anonymous function
(async () => {
  const listener = program.addEventListener("GameInitialized", (event) => {
    console.log("Game initialized event:", event);
    program.removeEventListener(listener);
  });
  const gameMasterAccountKp = loadKeypair("gameMasterSK_1712303851118.json");
  const boardAccountKp = loadKeypair("boardAccountSK_1712303852182.json");
  console.log(
    "Game master account public key:",
    gameMasterAccountKp.publicKey.toString()
  );
  console.log("Board account public key:", boardAccountKp.publicKey.toString());
  /*
  const gameMasterAccountKp = web3.Keypair.generate();
  await printBalance(program, gameMasterAccountKp.publicKey);
  console.log("Airdropping to the game master...");
  await airdrop(gameMasterAccountKp.publicKey, program);
  console.log("Airdrop successful");
  await printBalance(program, gameMasterAccountKp.publicKey);

  // Save the gameMasterAccountKp to a local file
  console.log(gameMasterAccountKp.publicKey.toString());
  saveSecretKeyWithTimestamp(gameMasterAccountKp, "gameMasterSK");

  // Create a new board
  console.log("Creating a new board...");
  const boardAccountKp = await initializeBoardAccount(
    gameMasterAccountKp,
    program
  );
  console.log(boardAccountKp.publicKey.toString());
  await printBalance(program, gameMasterAccountKp.publicKey);
  saveSecretKeyWithTimestamp(boardAccountKp, "boardAccountSK");
  */

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
