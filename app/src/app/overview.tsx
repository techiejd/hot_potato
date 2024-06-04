import Image from "next/image";
import { FC } from "react";

const DataRow = () => (
  <tr>
    <td>12s ago</td>
    <td>2.0</td>
    <td>HvFd...5jqDK</td>
    <td className="flex">
      <a className="w-full h-full cursor-pointer">
        <div className="relative w-[12px] h-[12px] md:w-[18px] md:h-[18px]">
          <Image alt="" src="/link-out.svg" fill />
        </div>
      </a>
    </td>
  </tr>
);

const Overview: FC = () => (
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
      <b>[refresh]</b>
      <b>[see all]</b>
    </div>
    <table className="w-full text-maroon text-left">
      <thead>
        <tr className="text-gray-700">
          <th>date</th>
          <th>SOL</th>
          <th>address</th>
          <th className="pl-[3px]">tx</th>
        </tr>
      </thead>
      <tbody>
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
      </tbody>
    </table>
  </div>
);

export default Overview;
