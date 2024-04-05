import * as anchor from "@coral-xyz/anchor";
import type { HotPotato } from "../target/types/hot_potato";
import { PublicKey } from "@solana/web3.js";

const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

async function check() {
  // Fetch board account
  const boardAccountPk = new PublicKey(
    "2MVVn4GqTYqv5d5yzFuBmNpKT7yq6yWJuPsgyNA2ezsn"
  );
  program.account.board.fetch(boardAccountPk).then((boardAccount) => {
    console.log("Board account fetched:", boardAccount);
  });

  // Fetch game account
  const gameAccountPk = new PublicKey(
    "5ARa1G6Fp7qQ6hRL5LtEzFzr4rn1nZTcxyme6UZQsB1e"
  );
  program.account.game.fetch(gameAccountPk).then((gameAccount) => {
    console.log("Game account fetched:", gameAccount);
  });
}

check();
