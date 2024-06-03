"use client";
import { Fragment } from "react";
import LocalHeader from "../localHeader";
import PonzuMessage from "../ponzuMessage";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import { useWalletModal } from "@/wallet-adapter-react-ui";

const Payments = () => {
  const { connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  return (
    <Fragment>
      <LocalHeader page="payments" />
      <div className="self-stretch flex flex-row items-center justify-center grow">
        <div className="self-stretch flex flex-col justify-between grow max-w-screen-md">
          <div className="self-stretch flex flex-row items-start justify-start py-0 px-[33px] box-border max-w-full font-tahoma text-sm">
            <div className="flex-1 bg-cornsilk box-border overflow-hidden flex flex-row items-start justify-between py-[21px] px-[26px] max-w-full gap-[20px] border-[1px] border-solid border-gray-1600">
              <div className="text-gray-700">ponzu pay you</div>
              {connected && (
                <div className="w-[12.9px] h-[13.7px] animate-spin">
                  <Image alt="" src="/circular-progress.svg" fill />
                </div>
              )}
              {!connected && (
                <a
                  className={`font-bold ${connecting ? "" : "cursor-pointer"}`}
                  onClick={() => setVisible(true)}
                >
                  {connecting ? "connecting..." : "[connect wallet]"}
                </a>
              )}
            </div>
          </div>
          <PonzuMessage />
        </div>
      </div>
    </Fragment>
  );
};

export default Payments;
