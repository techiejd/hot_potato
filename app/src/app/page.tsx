import ExplanationDialog from "./explanationDialog";

const Home = () => {
  return (
    <div className="w-full relative bg-wheat overflow-hidden flex flex-col items-end justify-start pt-0 px-0 pb-[464px] box-border gap-[45px] leading-[normal] tracking-[normal] mq450:gap-[22px]">
      <ExplanationDialog />
    </div>
  );
};

export default Home;
