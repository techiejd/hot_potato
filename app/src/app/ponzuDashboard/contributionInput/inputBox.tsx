import { FC } from "react";

const InputBox: FC<{
  contribution: string;
  setContribution: (value: string) => void;
}> = ({ contribution, setContribution }) => {
  const ignore = ["e", "E", "+", "-"];
  return (
    <div className="self-stretch h-[32px] bg-tan-100 flex flex-row items-center justify-between py-2.5 px-3.5 gap-[20px]">
      <input
        className="[outline:none] py-2.5 px-3.5 font-tahoma text-xl md:text-5xl text-rosybrown [border:none] w-full h-full [background:transparent] relative z-[3]"
        placeholder="minimum of 0.5"
        type="number"
        required
        min="0.5"
        step="0.1"
        value={contribution}
        onKeyDown={(e) => ignore.includes(e.key) && e.preventDefault()}
        onChange={({ target: { value } }) => {
          if (ignore.some((char) => value.includes(char))) return;
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
  );
};

export default InputBox;
