"use client";
import { useContext } from "react";
import ExplanationDialogContext from "../explanationDialog/context";

const GameContextInfo = () => {
  const { setOpen } = useContext(ExplanationDialogContext);
  return (
    <div className="flex-1 flex flex-row items-start justify-between max-w-full gap-[20px] mq450:flex-wrap">
      <div className="relative shrink-0 [debug_commit:bf4bc93]">
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
