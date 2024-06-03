import { FC } from "react";
import Link from "next/link";

const LocalHeader: FC<{ page: "contribute" | "payments" }> = ({ page }) => (
  <div className="self-stretch h-[42px] bg-cornsilk overflow-hidden shrink-0 flex flex-row justify-between px-[12px] md:px-[32px] box-border gap-[20px] text-left text-xs font-tahoma [text-decoration:none] font-bold mb-[48px]">
    <div className="flex flex-row items-start justify-start gap-[12px]">
      <Link
        className={`[text-decoration:none] text-[inherit] self-stretch flex items-center justify-center ${page == "contribute" ? "border-b-2 border-solid" : "text-gray-2100 cursor-pointer"}`}
        href="/"
      >
        Contribute
      </Link>
      <Link
        className={`[text-decoration:none] text-[inherit] self-stretch flex items-center justify-center ${page == "payments" ? "border-b-2 border-solid" : "text-gray-2100 cursor-pointer"}`}
        href="/payments"
        {...(page == "payments" ? { "aria-current": "page" } : {})}
      >
        Payments
      </Link>
    </div>
    <div className="flex flex-row items-start justify-start gap-[12px]">
      <a className="self-stretch flex items-center justify-center cursor-pointer">
        [4sus]
      </a>
      <a className="self-stretch flex items-center justify-center cursor-pointer">
        [how it works]
      </a>
    </div>
  </div>
);

export default LocalHeader;
