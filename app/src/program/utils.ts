import * as anchor from "@coral-xyz/anchor";
import { HotPotato } from "./hot_potato";

export const programId = new anchor.web3.PublicKey(
  "FTmU5btw8kipZEcacr1cf5kd7Ld9qnaBmQjxbyYd76yo"
);

export const gameMasterAccountPublicKey = new anchor.web3.PublicKey(
  "7hsJpUoDwpLNjPnwB9YmHDZFBjotoVvRNaRb7wmYo16n"
);

export const boardAccountPublicKey = new anchor.web3.PublicKey(
  "8DwTgBzL18WCpkoUBoDtAixKVdibExSnqoyMPjXsuSpV"
);

export const gameAccountPublicKey = new anchor.web3.PublicKey(
  "DokYcTnFGUnDTXAh5pYKBVxwnxDeckVDV2NsAKPN8rbk"
);

export type GameAccount = anchor.IdlAccounts<HotPotato>["game"];
export type BoardAccount = anchor.IdlAccounts<HotPotato>["board"];
