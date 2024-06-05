import * as anchor from "@coral-xyz/anchor";
import { HotPotato } from "./hot_potato";

export const programId = new anchor.web3.PublicKey(
  "FTmU5btw8kipZEcacr1cf5kd7Ld9qnaBmQjxbyYd76yo"
);

export const gameMasterAccountPublicKey = new anchor.web3.PublicKey(
  "4dZPbk2b9HmuQfCiq6iJxFmUCUfRHRzFp27bxg2geJAb"
);

export const boardAccountPublicKey = new anchor.web3.PublicKey(
  "8DwM4uLUu3xVe6KGgxovnethn38JSu7WLSboZJMvNYSt"
);

export const gameAccountPublicKey = new anchor.web3.PublicKey(
  "7KZ4TkgoLQqkUbXnpM8madERea2JU5UMcsVe8vtajiaT"
);

export type GameAccount = anchor.IdlAccounts<HotPotato>["game"];
export type BoardAccount = anchor.IdlAccounts<HotPotato>["board"];
