import { web3 } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import type { HotPotato } from "../target/types/hot_potato";
import {
  airdrop,
  confirmTx,
  loadKeypair,
  minimumTicketEntry,
  printBalance,
  saveSecretKeyWithTimestamp,
} from "./utils";
import { PublicKey } from "@solana/web3.js";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

async function requestHotPotato() {
  // current gameMasterPk = 66Kumqz2SeZarT47iPNmRr4PS1norXK6GhgVhQuUs6xU
  const gamePk = new PublicKey("53v6xxxuvExDrMGRGW3cjSytohVjTVJQpVJi4NssbWp9");
  const boardAccountPk = new PublicKey(
    "4gm8AG6wQoQLnHT7JpGHALUm9vpaU2BGjuS1u8zaTdEP"
  );

  /***
  const playerKp = web3.Keypair.generate();
  console.log(playerKp.publicKey.toString());
  // Save the playerKp to a local file
  saveSecretKeyWithTimestamp(playerKp, "playerSK");

  // Print the player's balance
  await printBalance(program, playerKp.publicKey);
  // Airdrop to the player
  console.log("Airdropping to the player...");
  await airdrop(playerKp.publicKey, program);
  console.log("Airdrop successful");
  */

  // player 8epvbKCT6TyU98wZGVPzzUyiAnyw5bnwdXA7hC8cwi8W
  const playerKp = loadKeypair("playerSK_1716534698177.json");
  console.log("player PK: ", playerKp.publicKey.toString());
  await printBalance(program, playerKp.publicKey);

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
  await printBalance(program, playerKp.publicKey);
}

requestHotPotato();
