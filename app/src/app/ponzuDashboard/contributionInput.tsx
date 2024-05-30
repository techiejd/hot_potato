"use client";
import { useWalletModal } from "@/wallet-adapter-react-ui";
import { useWalletMultiButton } from "@solana/wallet-adapter-base-ui";
import Image from "next/image";
import { FC, PropsWithChildren, useState } from "react";

const SetContributionButton: FC<PropsWithChildren<{ onClick: () => void }>> = ({
  children,
  onClick,
}) => (
  <button
    className="cursor-pointer [border:none] py-1.5 px-2.5 bg-tan-100 overflow-hidden flex flex-row items-center justify-center hover:bg-tan-200 gap-[6px]"
    onClick={onClick}
  >
    {children}
  </button>
);

const Label: FC<PropsWithChildren> = ({ children }) => (
  <div className="relative text-xs font-tahoma inline-block">{children}</div>
);

const CtaButton: FC = () => {
  const { setVisible } = useWalletModal();
  const { buttonState } = useWalletMultiButton({
    onSelectWallet() {
      setVisible(true);
    },
  });
  return buttonState === "connected" ? (
    <button className="cursor-pointer [border:none] py-[13px] px-5 bg-tan-100 self-stretch flex flex-row items-center justify-center whitespace-nowrap hover:bg-tan-200">
      <div className="relative text-base font-tahoma text-transparent !bg-clip-text [background:linear-gradient(90deg,_#370c0a,_#346f01)] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] text-left inline-block min-w-[67px]">
        send SOL
      </div>
    </button>
  ) : (
    <button
      className="cursor-pointer [border:none] py-[13px] px-5 bg-tan-100 self-stretch flex flex-row items-center justify-center whitespace-nowrap hover:bg-tan-200"
      onClick={() => {
        setVisible(true);
      }}
    >
      <div className="relative text-base font-tahoma text-transparent !bg-clip-text [background:linear-gradient(90deg,_#370c0a,_#346f01)] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] text-left inline-block min-w-[114px]">
        [connect wallet]
      </div>
    </button>
  );
};

const ContributionInput = () => {
  const [contribution, setContribution] = useState("");
  return (
    <div className="self-stretch flex flex-col items-start justify-center gap-[10px] max-w-full text-5xl text-rosybrown">
      <div className="self-stretch h-[32px] bg-tan-100 flex flex-row items-center justify-between py-2.5 px-3.5 gap-[20px]">
        <input
          className="[outline:none] py-2.5 px-3.5 font-tahoma text-xl md:text-5xl text-rosybrown [border:none] w-full h-full [background:transparent] relative z-[3]"
          placeholder="minimum of 0.5"
          type="number"
          min="0.5"
          step="0.1"
          value={contribution}
          onKeyDown={(e) =>
            ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
          }
          onChange={({ target: { value } }) => {
            if (["e", "E", "+", "-"].some((char) => value.includes(char)))
              return;
            setContribution(value);
          }}
        />
        <div className="bg-cornsilk flex flex-row items-center justify-center py-1 px-[11px] gap-[6px] text-xs text-gray-100">
          <div className="h-6 w-6 rounded-51xl bg-gray-200 overflow-hidden shrink-0 flex flex-row items-center justify-center pt-[6.1px] px-1.5 pb-1.5 box-border">
            <img
              className="h-[11.9px] w-[10.7px] relative object-cover"
              loading="lazy"
              alt=""
              src="/solana.png"
            />
          </div>
          <b className="relative font-bold inline-block min-w-[24px]">SOL</b>
        </div>
      </div>
      <div className="flex flex-row items-center justify-start gap-[11px] max-w-full text-xs text-gray-700 flex-wrap">
        {[
          { reset: { contribution: "" } },
          { "0.5 SOL (min)": { contribution: "0.5" } },
          { "1 SOL": { contribution: 1 } },
          { "5 SOL": { contribution: 5 } },
          { "10 SOL": { contribution: 10 } },
          {
            "50 SOL": { contribution: 50 },
          },
          {
            "100 SOL": { contribution: 100 },
          },
          {
            "500 SOL": {
              contribution: 500,
              leadingImage: "/sunglassesPepe.png",
            },
          },
        ].map((contributionButtonInfo) => {
          const [label, info] = Object.entries(contributionButtonInfo)[0];
          return (
            <SetContributionButton
              onClick={() => setContribution(info.contribution)}
              key={label}
            >
              {info.leadingImage && (
                <div className="h-[11.8px] w-[11.8px] relative">
                  <Image
                    className="object-contain"
                    src={info.leadingImage}
                    alt=""
                    fill
                  />
                </div>
              )}
              <Label>{label}</Label>
            </SetContributionButton>
          );
        })}
      </div>
      <CtaButton />
    </div>
  );
};

export default ContributionInput;
