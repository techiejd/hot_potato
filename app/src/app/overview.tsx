"use client";
import { useProgramContext } from "@/program";
import type { DocumentData } from "firebase/firestore";
import Image from "next/image";
import { FC } from "react";
import RelativeTime from "@yaireo/relative-time";

const DataRow: FC<{ contribution: DocumentData; now: RelativeTime }> = ({
  contribution,
  now,
}) => {
  const when = now.from(new Date(contribution.blockTime * 1000));
  // We know the minimum is 0.5 SOL and amount is given in lamports.
  const amount = ((a: string) => {
    const padded = a.padStart(10, "0");
    const rightOfDecimal = padded.slice(-9).slice(0, 2);
    const leftOfDecimal = padded.slice(0, padded.length - 9);
    return `${leftOfDecimal}.${rightOfDecimal}`;
  })(contribution.ticketEntryAmount as string);
  const playerAddy =
    contribution.player.slice(0, 4) + "..." + contribution.player.slice(-4);
  const txLink = useProgramContext().formatTxLink(
    contribution.transaction.signatures[0]
  );
  return (
    <tr>
      <td>{when}</td>
      <td>{amount}</td>
      <td>{playerAddy}</td>
      <td>
        <a
          className="w-full h-full cursor-pointer"
          href={txLink}
          target="_blank"
        >
          <div className="relative w-[12px] h-[12px] md:w-[21px] md:h-[21px]">
            <Image alt="" src="/link-out.svg" fill />
          </div>
        </a>
      </td>
    </tr>
  );
};

const Overview: FC = () => {
  const { contributions } = useProgramContext().cached;
  const now = new RelativeTime();
  console.log({ contributions });
  return (
    <div className="bg-cornsilk box-border overflow-hidden flex flex-col items-start justify-start p-[24px] gap-[12px] text-3xs md:text-sm border-[1px] border-solid border-gray-400">
      <div className="text-sm md:text-base">overview</div>
      <div className="w-full flex flex-col items-start justify-center gap-[2px] text-maroon">
        <div className="w-full flex flex-row items-start justify-between">
          <div>total contributions</div>
          <b>1001.1 SOL</b>
        </div>
        <div className="w-full flex flex-row items-start justify-between">
          <div>ponzu balance</div>
          <b>202 SOL</b>
        </div>
        <div className="w-full flex flex-row items-start justify-between">
          <div>total payments</div>
          <b>798 SOL</b>
        </div>
      </div>
      <div className="flex flex-row items-center justify-start gap-[12px] text-4xs">
        <h3 className="relative text-sm md:text-base font-normal font-inherit inline-block">
          contributions
        </h3>
        <b className="cursor-pointer">[see all]</b>
      </div>
      <table className="w-full text-maroon text-left">
        <thead>
          <tr className="text-gray-700">
            <th>when</th>
            <th>SOL</th>
            <th>player address</th>
            <th className="pl-[3px]">tx</th>
          </tr>
        </thead>
        <tbody>
          {contributions.length > 0 &&
            contributions.map((contribution) => (
              <DataRow
                contribution={contribution}
                now={now}
                key={contribution.transaction.signatures[0]}
              />
            ))}
          {contributions.length === 0 && (
            <tr>
              <td>loading...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Overview;
