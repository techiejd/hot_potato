import ContributionInput from "./contributionInput";

const Dashboard = () => (
  <section className="flex flex-col items-start justify-start gap-[8px]">
    <div className="w-full bg-cornsilk box-border overflow-hidden flex flex-col items-start justify-center py-5 px-[24px] gap-[10px] max-w-full text-gray-700 border-[1px] border-solid border-gray-400">
      <div className="relative inline-block">contribute to ponzu</div>
      <ContributionInput />
    </div>
  </section>
);

export default Dashboard;
