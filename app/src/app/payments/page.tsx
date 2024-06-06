"use client";
import { FC, Fragment, useState } from "react";
import LocalHeader from "../localHeader";
import PonzuMessage from "../ponzuMessage";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import { useWalletModal } from "@/wallet-adapter-react-ui";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useProgramContext } from "@/program";

const Title = () => {
  const { connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  return (
    <div className="self-stretch flex flex-row items-center justify-between">
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
  );
};

const LineItem: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="self-stretch flex flex-row items-start justify-between">
    <span>{label}</span>
    <b className="text-black">{value}</b>
  </div>
);

const Overview = () => (
  <Fragment>
    <LineItem label="contribution" value="1.31 SOL" />
    <LineItem label="periodic payment amount" value="0.012642 SOL" />
    <LineItem label="actual SOL received" value="0.075849 SOL" />
    <LineItem label="estimated total SOL received" value="1.896225 SOL" />
    <LineItem label="total payments" value="0.075849 SOL" />
    <div className="self-stretch flex flex-row items-start justify-between pt-[6px] md:pt-[12px]">
      <span>contribution date</span>
      <span>08 May 2024 19:33</span>
    </div>
  </Fragment>
);

const PaymentLineItem: FC<{ tx?: string; when: string; amount: string }> = ({
  tx,
  when,
  amount,
}) => {
  const expected = !tx;
  const format = useProgramContext().formatTxLink;
  return (
    <tr {...(expected ? { className: "text-gray-1400" } : {})}>
      <td>
        {amount} {expected && "(expected)"}
      </td>
      <td>{when}</td>
      <td>
        {tx && (
          <a
            className="flex flex-row items-center justify-start w-full cursor-pointer"
            href={format(tx)}
            target="_blank"
          >
            <div className="relative w-[12px] h-[12px] md:w-[21px] md:h-[21px]">
              <Image alt="" src="/link-out.svg" fill />
            </div>
          </a>
        )}
        {expected && "n/a"}
      </td>
    </tr>
  );
};

const PonzuPayments = () => (
  <Fragment>
    <table className="w-full text-left">
      <thead>
        <tr className="text-gray-700 font-bold">
          <th>SOL</th>
          <th>when</th>
          <th className="pl-[3px]">tx</th>
        </tr>
      </thead>
      <tbody>
        <PaymentLineItem
          when="08 May 2024 19:33"
          amount="0.075849"
          tx="5g3z2k3"
        />
        <PaymentLineItem
          when="08 May 2024 19:33"
          amount="0.075849"
          tx="5g3z2k3"
        />
        <PaymentLineItem when="08 May 2024 19:33" amount="0.075849" />
      </tbody>
    </table>
    <div className="self-stretch flex flex-row items-center justify-center cursor-pointer">
      <b>[see all]</b>
    </div>
  </Fragment>
);

const PonzuPaymentDisclosure = () => {
  const [tab, setTab] = useState<"overview" | "payments">("overview");
  return (
    <Disclosure
      as="div"
      className="self-stretch flex flex-col bg-wheat text-gray-200"
    >
      <DisclosureButton className="self-stretch group flex flex-row items-center justify-between py-[24px] bg-wheat text-3xs md:text-base px-[6px] md:px-[12px] hover:bg-tan-200 cursor-pointer">
        <div className="flex flex-row items-center justify-center gap-[3px] md:gap-[12px]">
          <div className="h-4 w-4 md:h-6 md:w-6 rounded-51xl bg-gray-200 flex flex-row items-center justify-center">
            <img
              className="h-[9px] w-[9px] md:h-[12px] md:w-[12px] relative object-contain"
              loading="lazy"
              alt=""
              src="/solana.png"
            />
          </div>
          <span>sol</span>
          <img
            className="w-2.5 h-2.5 md:w-5 md:h-5 overflow-hidden"
            loading="lazy"
            alt=""
            src="/arrow.svg"
          />
          <img
            className="w-4 h-4 md:w-6 md:h-6 object-cover"
            alt=""
            src="/ponzu.jpeg"
          />
          <span>sol ponzu</span>
          <img
            className="w-[15px] h-[15px] md:w-[24px] md:h-[24px]"
            alt=""
            src="/link-out.svg"
          />
        </div>
        <div className="flex flex-row items-center justify-center gap-[3px] md:gap-[12px] text-gray-1800">
          <span>0 / 1.90 SOL</span>
          <div className="h-2 w-[72px] md:h-4 md:w-[144px] rounded-3xs bg-whitesmoke" />
          <img
            className="h-4 w-4 md:h-6 md:w-6 group-data-[open]:rotate-180"
            alt=""
            src="/chevron-down-payments.svg"
          />
        </div>
      </DisclosureButton>
      <DisclosurePanel className="self-stretch group flex flex-col text-3xs md:text-base">
        <div className="flex flex-row items-center justify-start gap-[12px] pt-[12px] pl-[6px] md:pl-[12px]">
          <button
            className={`pb-[12px] bg-inherit font-bold text-sm md:text-base ${tab == "overview" ? "text-gray-200 border-b-2 border-black border-solid" : "text-gray-900 hover:bg-tan-200 cursor-pointer"}`}
            disabled={tab == "overview"}
            onClick={() => setTab("overview")}
          >
            overview
          </button>
          <button
            className={`pb-[12px] bg-inherit font-bold text-sm md:text-base ${tab == "payments" ? "text-gray-200 border-b-2 border-black border-solid" : "text-gray-900 hover:bg-tan-200 cursor-pointer"}`}
            disabled={tab == "payments"}
            onClick={() => setTab("payments")}
          >
            payments (0/150)
          </button>
        </div>
        <div className="flex flex-col p-[6px] md:p-[12px] gap-[6px] md:gap-[12px] max-w-full text-3xs md:text-base bg-burlywood">
          {tab == "overview" && <Overview />}
          {tab == "payments" && <PonzuPayments />}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
};

const Payments = () => {
  return (
    <Fragment>
      <LocalHeader page="payments" />
      <div className="self-stretch flex flex-row items-center justify-center grow">
        <div className="self-stretch flex flex-col justify-between grow max-w-screen-md px-[12px] md:px-[32px]">
          <div className="bg-cornsilk flex flex-col items-center justify-center py-[24px] px-[6px] md:px-[24px] gap-[24px] border-[1px] border-solid border-gray-1600 max-w-full font-tahoma text-sm md:text-base">
            <Title />
            <PonzuPaymentDisclosure />
          </div>
          <PonzuMessage />
        </div>
      </div>
    </Fragment>
  );
};

export default Payments;
