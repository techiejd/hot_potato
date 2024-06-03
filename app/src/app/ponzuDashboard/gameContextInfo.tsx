"use client";
import { useContext, useEffect, useState } from "react";
import ExplanationDialogContext from "../explanationDialog/context";
import {
  gameAccountPublicKey,
  useProgramContext,
  GameAccount,
} from "@/program";

const GameContextInfo = () => {
  const { setOpen } = useContext(ExplanationDialogContext);
  const { program } = useProgramContext();
  const [game, setGame] = useState<GameAccount | undefined>(undefined);
  useEffect(() => {
    const set = async () => {
      if (shouldSet && program) {
        const gameAccount =
          await program.account.game.fetch(gameAccountPublicKey);
        setGame(gameAccount);
      }
    };

    let shouldSet = true;
    if (!program) return;
    set();
    return () => {
      shouldSet = false;
    };
  }, [program]);

  console.log("game", game);
  return (
    <div className="flex-1 flex flex-row items-start justify-between max-w-full gap-[20px]">
      <div className="relative shrink-0 [debug_commit:bf4bc93] text-maroon">
        <span>{`distributions start in `}</span>
        <b>23hrs 3m 2s</b>
      </div>
      <div className="flex flex-col items-start justify-start pt-[1.5px] px-0 pb-0 text-xs text-gray-500">
        <div className="flex flex-row items-start justify-start gap-[10px] shrink-0 [debug_commit:bf4bc93]">
          <a className="font-bold cursor-pointer">[code]</a>
          <a className="font-bold cursor-pointer" onClick={() => setOpen(true)}>
            [how it works]
          </a>
        </div>
      </div>
    </div>
  );
};

export default GameContextInfo;
