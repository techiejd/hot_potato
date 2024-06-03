import { FC } from "react";

const DataRow = () => (
  <div className="flex flex-row items-start justify-between">
    <div>12s ago</div>
    <div>2.0</div>
    <div>HvFd...5jqDK</div>
    <img
      className="h-[13px] w-[15px] relative overflow-hidden shrink-0"
      alt=""
      src="/link-out.svg"
    />
  </div>
);

const Overview: FC = () => (
  <div className="bg-cornsilk box-border overflow-hidden flex flex-col items-start justify-start p-[24px] gap-[12px] text-3xs border-[1px] border-solid border-gray-400">
    <div className="text-sm">overview</div>
    <div className="flex flex-col items-start justify-center gap-[2px] text-maroon">
      <div className="flex flex-row items-start justify-between">
        <div>total contributions</div>
        <b>1001.1 SOL</b>
      </div>
      <div className="flex flex-row items-start justify-between">
        <div>ponzu balance</div>
        <b>202 SOL</b>
      </div>
      <div className="flex flex-row items-start justify-between">
        <div>total payments</div>
        <b>798 SOL</b>
      </div>
    </div>
    <div className="flex flex-row items-center justify-start gap-[9px] text-4xs">
      <h3 className="relative text-sm font-normal font-inherit inline-block">
        contributions
      </h3>
      <b>[refresh]</b>
      <b>[see all]</b>
    </div>
    <div className="flex flex-row flex-wrap items-start justify-start pt-0 px-0 pb-0 box-border gap-[8px_22px] text-maroon">
      <div className="flex flex-row items-start justify-between text-gray-700">
        <b>date</b>
        <b>SOL</b>
        <b>address</b>
        <b>tx</b>
      </div>
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
      <DataRow />
    </div>
  </div>
);

export default Overview;
