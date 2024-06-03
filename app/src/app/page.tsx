import { Fragment } from "react";
import ExplanationDialog from "./explanationDialog";
import Dashboard from "./ponzuDashboard";
import PonzuMessage from "./ponzuMessage";
import LocalHeader from "./localHeader";
import Overview from "./overview";

const Home = () => {
  return (
    <Fragment>
      <ExplanationDialog />
      <LocalHeader page="contribute" />
      <div className="self-stretch flex flex-row items-center justify-center grow">
        <div className="self-stretch flex flex-col justify-between grow max-w-screen-md gap-[24px] px-3">
          <Dashboard />
          <Overview />
          <PonzuMessage />
        </div>
      </div>
    </Fragment>
  );
};

export default Home;
