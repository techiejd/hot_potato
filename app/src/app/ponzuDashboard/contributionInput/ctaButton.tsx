import { useWalletModal } from "@/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { ButtonHTMLAttributes, FC } from "react";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const CtaButtonInternal: FC<ButtonProps> = ({ children, ...props }) => (
  <button
    className={`[border:none] py-[13px] px-5 self-stretch flex flex-row items-center justify-center whitespace-nowrap ${props.disabled ? "bg-tan-200" : "bg-tan-100 cursor-pointer hover:bg-tan-200"}`}
    {...props}
  >
    <div className="relative text-base font-tahoma text-transparent !bg-clip-text [background:linear-gradient(90deg,_#370c0a,_#346f01)] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] text-left inline-block">
      {children}
    </div>
  </button>
);

const CtaButton: FC<{ submitting: boolean }> = ({ submitting }) => {
  const { setVisible } = useWalletModal();
  const { connected, connecting } = useWallet();

  return connected ? (
    <CtaButtonInternal disabled={submitting} type="submit">
      {submitting ? "sending..." : "send SOL"}
    </CtaButtonInternal>
  ) : (
    <CtaButtonInternal disabled={connecting} onClick={() => setVisible(true)}>
      {connecting ? "connecting..." : "[connect wallet]"}
    </CtaButtonInternal>
  );
};

export default CtaButton;
