import GameContextInfo from "./gameContextInfo";
import ContributionInput from "./contributionInput";

const Dashboard = () => (
  <section className="flex flex-col items-start justify-start gap-[8px] px-3">
    <div className="self-stretch flex flex-row items-start justify-start py-0 px-0 md:px-[24px] box-border">
      <GameContextInfo />
    </div>
    <div className="w-full bg-cornsilk box-border overflow-hidden flex flex-col items-start justify-center py-5 px-[25px] gap-[10px] max-w-full text-gray-700 border-[1px] border-solid border-gray-400">
      <div className="relative inline-block min-w-[121px]">
        contribute to ponzu
      </div>
      <ContributionInput />
      <div className="self-stretch flex flex-col items-start justify-center gap-[2px] text-3xs text-maroon">
        <div className="self-stretch flex flex-row items-start justify-between gap-[20px]">
          <div className="relative inline-block min-w-[76px]">
            contribution total
          </div>
          <b className="relative font-bold inline-block min-w-[58px]">
            1001.1 SOL
          </b>
        </div>
        <div className="self-stretch flex flex-row items-start justify-between gap-[20px]">
          <div className="relative inline-block min-w-[69px]">
            current balance
          </div>
          <b className="relative font-bold inline-block min-w-[42px]">
            202 SOL
          </b>
        </div>
        <div className="self-stretch flex flex-row items-start justify-between gap-[20px]">
          <div className="relative inline-block min-w-[73px]">
            ponzu payments
          </div>
          <b className="relative font-bold inline-block min-w-[42px]">
            798 SOL
          </b>
        </div>
      </div>
    </div>
  </section>
);

export default Dashboard;
