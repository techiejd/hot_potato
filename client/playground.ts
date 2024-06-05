import * as anchor from "@coral-xyz/anchor";
import { HotPotato, IDL } from "../target/types/hot_potato";
import { programId } from "../app/src/program/utils";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;

const body = `[{"blockTime":1716538480,"indexWithinBlock":6,"meta":{"err":null,"fee":15000,"innerInstructions":[{"index":0,"instructions":[{"accounts":[1,3],"data":"11115i3gztfJW6c4U8YUP4gLUKajeUd1iDr1K6rWbkUpzrsT7YQ7QLbJBxEU82R3DPcmuf","programIdIndex":4}]}],"loadedAddresses":{"readonly":[],"writable":[]},"logMessages":["Program FTmU5btw8kipZEcacr1cf5kd7Ld9qnaBmQjxbyYd76yo invoke [1]","Program log: Instruction: Initialize","Program 11111111111111111111111111111111 invoke [2]","Program 11111111111111111111111111111111 success","Program data: Ut0LAvQ08PqJsIIZhtw+H0Kf1HUVSKbHDt6VyA39Am+warKgF31wbTEgAiBAmq8j4v97fuxRY0D6NUB4rCtR1BPUNEWp/ftl5NEwQkXu9m+IEygxeqanoiKIY85YRZ99U7r0WbOfVhU=","Program FTmU5btw8kipZEcacr1cf5kd7Ld9qnaBmQjxbyYd76yo consumed 11260 of 200000 compute units","Program FTmU5btw8kipZEcacr1cf5kd7Ld9qnaBmQjxbyYd76yo success"],"postBalances":[1216970160,1656127600,3342136320,1726080,1,1141440],"postTokenBalances":[],"preBalances":[1216985160,1657853680,3342136320,0,1,1141440],"preTokenBalances":[],"rewards":[]},"slot":301020408,"transaction":{"message":{"accountKeys":["7PWNTuudBT8f4AQvqAGhS8puUTR21TjPMq6z4NV3gwPw","AGUxeE8AEMjsgeXKU39fQAUvCEAaNGTkYwut9i8zKJqi","GQCxpkKmAiis6XWyVStx2GF3ebzbkZ4K3dBLLhKLTNKE","4JmHZQvhHoHKvA8fuBPSTzyQU1TqxNE1fwe6sPyPMhDE","11111111111111111111111111111111","FTmU5btw8kipZEcacr1cf5kd7Ld9qnaBmQjxbyYd76yo"],"addressTableLookups":null,"header":{"numReadonlySignedAccounts":0,"numReadonlyUnsignedAccounts":2,"numRequiredSignatures":3},"instructions":[{"accounts":[3,2,1,2,4],"data":"4yMVZ7r6bdx7TUMG7nGaeyoWDyz9hNCLciERfCqujBejdQT","programIdIndex":5}],"recentBlockhash":"G2DXQiM8pgZdvjEcAdmrwwN5hgmCfZ3oxKGRobT3rLfz"},"signatures":["43VUx4ke5cuszTXmtYjeA9yT7CBfb94ajWBY2c4H545PFQadBe9VjYPbDdanNixjEQ7nMResCX1SWfS4gvmLskHY","5ZZ5VajKeDFTDQx7Tv2v9qHVSAz6x8uNxo7vUZ26eEkWj9npXEJY2MhHGkP29vLdX2Jyhtkv58HTYrspCQKKCCrJ","3gc7GLFD5FYU3FfQvcmmqKyktRsbraTx1KoRcNZ84fMuHxvZSXooXijay5taQaH5afhffyTi9QbGVt8DieMfbGgf"]},"version":"legacy"}]`;
const parsed = JSON.parse(body);
console.log(JSON.stringify(parsed, null, 2));
console.log(JSON.stringify(parsed[0].meta.logMessages, null, 2));

const parseEventsWith = (eventParser: anchor.EventParser) => {
  const events = eventParser.parseLogs(parsed[0].meta.logMessages);
  let i = 0;
  for (const event of events) {
    console.log(i++);
    console.log(event);
  }
  if (i == 0) {
    console.log("no events");
  }
};

const eventParserByBorsh = new anchor.EventParser(
  programId,
  new anchor.BorshCoder(IDL)
);
const eventParserByProgramIdl = new anchor.EventParser(
  programId,
  new anchor.BorshCoder(program.idl)
);

const eventParserByProgramCoder = new anchor.EventParser(
  programId,
  program.coder
);

console.log("printing events by borsh");
parseEventsWith(eventParserByBorsh);

console.log("printing events by programIdl");
parseEventsWith(eventParserByProgramIdl);

console.log("printing events by programCoder");
parseEventsWith(eventParserByProgramCoder);

console.log(program.programId.toString());
console.log(programId.toString());
