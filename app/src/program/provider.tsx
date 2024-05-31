"use client";
import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import * as anchor from "@coral-xyz/anchor";
import { HotPotato, IDL } from "./hot_potato";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { programId } from "./utils";

interface ProgramContextState {
  provider: anchor.Provider | undefined;
  program: anchor.Program<HotPotato> | undefined;
}

const ProgramContext = createContext<ProgramContextState>({
  provider: undefined,
  program: undefined,
});

// Create a provider component
export const ProgramProvider: FC<PropsWithChildren> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return;
    const p = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(p);
    return p;
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return;
    return new anchor.Program(IDL, programId, provider);
  }, [provider]);

  return (
    <ProgramContext.Provider
      value={{
        provider,
        program,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

export const useProgramContext = () => useContext(ProgramContext);
