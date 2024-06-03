import { Fragment } from "react";
import ExplanationDialog from "./explanationDialog";
import Dashboard from "./ponzuDashboard";
import PonzuMessage from "./ponzuMessage";
import LocalHeader from "./localHeader";

const Home = () => {
  return (
    <Fragment>
      <ExplanationDialog />
      <LocalHeader page="contribute" />
      <div className="self-stretch flex flex-row items-center justify-center grow">
        <div className="self-stretch flex flex-col justify-between grow max-w-screen-md">
          <Dashboard />
          <PonzuMessage />
        </div>
      </div>
    </Fragment>
  );
};

export default Home;
