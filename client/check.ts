import * as anchor from "@coral-xyz/anchor";
import type { HotPotato } from "../target/types/hot_potato";
import { PublicKey } from "@solana/web3.js";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

async function check() {
  // Fetch board account
  const boardAccountPk = new PublicKey(
    "4gm8AG6wQoQLnHT7JpGHALUm9vpaU2BGjuS1u8zaTdEP"
  );
  program.account.board.fetch(boardAccountPk).then((boardAccount) => {
    console.log("Board account fetched:", boardAccount);
  });

  // Fetch game account
  const gameAccountPk = new PublicKey(
    "53v6xxxuvExDrMGRGW3cjSytohVjTVJQpVJi4NssbWp9"
  );
  program.account.game.fetch(gameAccountPk).then((gameAccount) => {
    console.log("Game account fetched:", gameAccount);
  });
}

check();
