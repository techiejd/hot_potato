import Image from "next/image";
import { ConnectWalletButton } from "./connectWalletButton";

const Icon = ({ src, alt = "" }: { src: string; alt?: string }) => (
  <div className="w-6 h-6 relative overflow-hidden shrink-0">
    <Image src={src} alt={alt} fill />
  </div>
);

const Header = () => {
  return (
    <header className="self-stretch [background:linear-gradient(0deg,_#33231b,_#171719)] flex flex-row items-start justify-between py-[13px] px-[33px] top-[0] z-[1] sticky gap-[20px] text-left text-xl text-cornsilk font-tahoma">
      <div className="flex flex-row items-start justify-start gap-[16px]">
        <div className="h-12 w-12 relative">
          <Image
            fill
            priority={true}
            alt=""
            src="/ponzu.png"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-start justify-start pt-3 px-0 pb-0">
          <div className="relative font-bold text-[inherit] inline-block min-w-[96px] whitespace-nowrap">
            sol ponzu
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start justify-start pt-3 px-0 pb-0 text-xs">
        <div className="flex flex-row items-center gap-[9px]">
          {["/telegram.svg", "/x.svg"].map((src, i) => (
            <Icon src={src} key={i} />
          ))}
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
};

export default Header;
