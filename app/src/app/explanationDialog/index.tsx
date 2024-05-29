"use client";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, useContext, useEffect, useState } from "react";
import ExplanationDialogContext from "./context";

const ExplanationDialog = () => {
  const { isOpen, setOpen } = useContext(ExplanationDialogContext);
  const onClose = () => setOpen(false);

  return (
    <Transition show={isOpen}>
      <Dialog className="relative z-10 font-tahoma" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>
        <div className="fixed inset-0 w-screen h-screen flex items-center justify-center">
          <div className="flex-1 bg-gray-800 overflow-hidden flex flex-col items-center justify-center py-[281.5px] px-[75px] box-border max-w-full z-[1] text-sm text-maroon mq450:pl-5 mq450:pr-5 mq450:box-border">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <DialogPanel className="self-stretch bg-cornsilk box-border overflow-hidden flex flex-col items-center justify-center py-5 px-[25px] gap-[16px] max-w-full max-h-full border-[1px] border-solid border-gray-400">
                <p className="m-0 self-stretch h-[204px] relative inline-block">
                  <span className="block">
                    <span>how it works</span>
                  </span>
                  <span className="block">
                    <span>{`>contribute to ponzu (min 0.5 SOL)`}</span>
                  </span>
                  <span className="block">
                    <span>{`>ponzu distributions start in `}</span>
                    <b className="font-tahoma">23hrs 3m 2s</b>
                  </span>
                  <span className="block">
                    <span>{`>ponzu sen uw ~1% 150 times/hour`}</span>
                  </span>
                  <span className="block">
                    <span>{`>shill shill shill`}</span>
                  </span>
                  <span className="block">
                    <span>{`>profit. (~50% SOL gain)`}</span>
                  </span>
                  <span className="block">
                    <span>&nbsp;</span>
                  </span>
                  <span className="block">
                    <span>disclaimer</span>
                  </span>
                  <span className="block">
                    <span>{`>this is not investment`}</span>
                  </span>
                  <span className="block">
                    <span>{`>sol ponzu takes 3.5% fee`}</span>
                  </span>
                  <span className="block">
                    <span>{`>this is dumb game for lulz`}</span>
                  </span>
                </p>
                <button
                  className="self-stretch bg-tan-100 flex flex-row items-center justify-center py-[11px] px-5 whitespace-nowrap cursor-pointer text-base border-[1px] border-solid border-gray-300"
                  onClick={onClose}
                >
                  <div className="relative text-transparent !bg-clip-text [background:linear-gradient(90deg,_#370c0a,_#346f01)] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]">
                    [I’m ready to ponzu]
                  </div>
                </button>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ExplanationDialog;
