import { headers } from "next/headers";
import * as admin from "firebase-admin";
import { cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as anchor from "@coral-xyz/anchor";
import { HotPotato, IDL } from "../../hot_potato";
import { programPublicKey } from "../utils";

type HotPotatoEvents = anchor.IdlEvents<HotPotato>;

function convertPropertiesToString<T extends object>(
  obj: T
): { [K in keyof T]: any } {
  const result: Partial<{ [K in keyof T]: any }> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === "string" || typeof value === "number") {
        // If the value is already a string or a number, assign it directly
        result[key] = value;
      } else if (
        value instanceof anchor.BN ||
        value instanceof anchor.web3.PublicKey
      ) {
        const v = value as anchor.BN | anchor.web3.PublicKey; // To avoid vercel build issue
        // If the value is a BigNumber or a PublicKey, call toString on it
        result[key] = v.toString();
      } else if (value !== null && typeof value === "object") {
        const v = value as Object; // To avoid vercel build issue
        // Recursively convert properties
        result[key] = convertPropertiesToString(v);
      } else {
        // Fallback to toString for other types
        throw new Error(`Unsupported type for property ${key}`);
      }
    }
  }

  return result as { [K in keyof T]: string };
}

const isDevEnvironment = process && process.env.NODE_ENV === "development";

const getAdminApp = () => {
  const ADMIN_APP_NAME = "firebase-ponzu-admin-app";
  const adminApp =
    getApps().find((it) => it.name === ADMIN_APP_NAME) ||
    admin.initializeApp(
      {
        credential: cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT! as string)
        ),
      },
      ADMIN_APP_NAME
    );
  return adminApp;
};

const getAdminFirestore = () => {
  if (isDevEnvironment) {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  }
  return getFirestore(getAdminApp());
};

export async function POST(request: Request, response: Response) {
  const authorization = headers().get("Authorization");
  if (!authorization || authorization != process.env.WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const req = await request.json();
  if (!req) {
    throw new Error("No request body");
  }
  const transactions: anchor.web3.TransactionResponse[] = req;
  const firestore = getAdminFirestore();
  const eventParser = new anchor.EventParser(
    programPublicKey,
    new anchor.BorshCoder(IDL)
  );

  // for each transaction, for each event, we create a StoredEvent and store it in firestore
  const processedTransactions = transactions.map(async (transaction) => {
    if (!transaction?.meta?.logMessages) {
      firestore
        .collection("events")
        .add({ ...transaction, name: "NoLogsError" });
      return;
    }
    const events = eventParser.parseLogs(transaction!.meta!.logMessages!);
    const batch = firestore.batch();
    let eventSeen = false;
    for (const event of events) {
      eventSeen = true;
      batch.set(firestore.collection("events").doc(), {
        ...transaction,
        ...convertPropertiesToString(event.data),
        name: event.name as keyof HotPotatoEvents,
      });
    }
    if (!eventSeen) {
      batch.set(firestore.collection("events").doc(), {
        ...transaction,
        name: "NoEventsError",
      });
    }
    await batch.commit();
    return;
  });
  await Promise.all(processedTransactions);

  return Response.json({}, { status: 200 });
}
