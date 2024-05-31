import Image from "next/image";
import { FC, PropsWithChildren } from "react";

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

const SuggestedInputs = ({
  setContribution,
}: {
  setContribution: (value: string) => void;
}) => {
  return (
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
  );
};

export default SuggestedInputs;
