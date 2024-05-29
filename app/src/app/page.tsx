import { Fragment } from "react";
import ExplanationDialog from "./explanationDialog";
import Dashboard from "./ponzuDashboard";
import PonzuMessage from "./ponzuMessage";

const Home = () => {
  return (
    <Fragment>
      <ExplanationDialog />
      <div className="self-stretch flex flex-col justify-between grow">
        <Dashboard />
        <PonzuMessage />
      </div>
    </Fragment>
  );
};

export default Home;
