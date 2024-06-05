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
import { initializeApp } from "firebase/app";
import {
  DocumentData,
  collection,
  connectFirestoreEmulator,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnIC7cbxxVx32RySDktr4A4gtq8iEy4OA",
  authDomain: "ponzu-b8783.firebaseapp.com",
  projectId: "ponzu-b8783",
  storageBucket: "ponzu-b8783.appspot.com",
  messagingSenderId: "655475363783",
  appId: "1:655475363783:web:eb6fc8d32f436c505a93e2",
  measurementId: "G-HSR30KPR4M",
};
const app = initializeApp(firebaseConfig);
const isDevEnvironment = process && process.env.NODE_ENV === "development";
const firestore = (() => {
  const firestore = getFirestore(app);
  if (isDevEnvironment && !(firestore as any)._settingsFrozen)
    // https://stackoverflow.com/questions/71574102/firebase-error-firestore-has-already-been-started-and-its-settings-can-no-lon
    connectFirestoreEmulator(firestore, "localhost", 8080);
  return firestore;
})();

interface ProgramContextState {
  provider: anchor.Provider | undefined;
  program: anchor.Program<HotPotato> | undefined;
  isDevNet: boolean;
  cached: {
    contributions: DocumentData[];
  };
}

const ProgramContext = createContext<ProgramContextState>({
  provider: undefined,
  program: undefined,
  cached: { contributions: [] },
  isDevNet: isDevEnvironment,
});

// Create a provider component
export const ProgramProvider: FC<PropsWithChildren> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const q = query(
    collection(firestore, "events"),
    where("name", "==", "PotatoReceived"),
    orderBy("blockTime", "desc"),
    limit(10)
  );
  const [contributions, loading, error, snapshot] = useCollectionData(q, {
    initialValue: [],
  });

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
        cached: { contributions: contributions! },
        isDevNet: isDevEnvironment,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

export const useProgramContext = () => useContext(ProgramContext);
