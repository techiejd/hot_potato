"use client";
import { createContext, FC, PropsWithChildren, useState } from "react";

// Create the context
const ExplanationDialogContext = createContext<{
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}>({ isOpen: true, setOpen: () => {} });

// Create the provider component
const ExplanationDialogProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isOpen, setOpen] = useState(true);

  return (
    <ExplanationDialogContext.Provider value={{ isOpen, setOpen }}>
      {children}
    </ExplanationDialogContext.Provider>
  );
};

export default ExplanationDialogContext;
export { ExplanationDialogProvider };
