import * as anchor from "@coral-xyz/anchor";
import { HotPotato } from "./hot_potato";

export const programId = new anchor.web3.PublicKey(
  "ACGMUCw7Vz2k26UNN3x8u1YwbfqQgNQoCwy2RcKB7jGR"
);

export const gameMasterAccountPublicKey = new anchor.web3.PublicKey(
  "6bvSxGiX8mSRjoC8N5YBKeNvg99wRFfBCqX2VadVb9U6"
);

export const boardAccountPublicKey = new anchor.web3.PublicKey(
  "9YZMzXL7WVBkPp6XUrwakX6WAgmdEYNFrSMjnMuzuQWK"
);

export const gameAccountPublicKey = new anchor.web3.PublicKey(
  "GnDkQ41MbRDB81XRcxVD3buD3smUySDkBJu25bd7rMvg"
);

export type GameAccount = anchor.IdlAccounts<HotPotato>["game"];
export type BoardAccount = anchor.IdlAccounts<HotPotato>["board"];
