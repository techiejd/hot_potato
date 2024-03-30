import { web3 } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import type { HotPotato } from "../target/types/hot_potato";
import { airdrop, confirmTx, minimumTicketEntry } from "./utils";
import { PublicKey } from "@solana/web3.js";

const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

async function requestHotPotato() {
  const playerKp = web3.Keypair.generate();
  const gamePk = new PublicKey("5ARa1G6Fp7qQ6hRL5LtEzFzr4rn1nZTcxyme6UZQsB1e");
  const boardAccountPk = new PublicKey(
    "2MVVn4GqTYqv5d5yzFuBmNpKT7yq6yWJuPsgyNA2ezsn"
  );
  console.log(playerKp.publicKey.toString());
  // Save the playerKp to a local file
  fs.writeFileSync(
    `../gameMasterAccountKp${Date.now().toString()}`,
    JSON.stringify(playerKp)
  );

  // Airdrop to the player
  console.log("Airdropping to the player...");
  await airdrop(playerKp.publicKey, program);
  console.log("Airdrop successful");

  // Player requests hot potato
  console.log("Player requests hot potato...");

  const playerRequestsHotPotatoTxHash = await program.methods
    .requestHotPotato(minimumTicketEntry)
    .accounts({
      game: gamePk,
      board: boardAccountPk,
      player: playerKp.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([playerKp])
    .rpc();
  const playerRequestsHotPotatoTxConfirmation = await confirmTx(
    playerRequestsHotPotatoTxHash,
    program
  );
  console.log("Player requests hot potato transaction confirmed");
}

requestHotPotato();
