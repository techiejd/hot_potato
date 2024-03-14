import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { HotPotato } from "../target/types/hot_potato";
import chai, { expect } from "chai";
import BN from "chai-bn";
import chaiAsPromised from "chai-as-promised";
chai.use(BN(anchor.BN));
chai.use(chaiAsPromised);

describe("HotPotato", () => {
  const oneDay: anchor.BN = new anchor.BN(86400); // seconds
  const oneHour = new anchor.BN(3600); // seconds
  const minimumTicketEntry = new anchor.BN(web3.LAMPORTS_PER_SOL / 2);
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;
  const confirmTx = async (txHash: string) => {
    const latestBlockHash =
      await program.provider.connection.getLatestBlockhash();

    return await program.provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txHash,
    });
  };
  const airdrop = async (addy: web3.PublicKey) => {
    const airdropSignature = await program.provider.connection.requestAirdrop(
      addy,
      web3.LAMPORTS_PER_SOL
    );
    return confirmTx(airdropSignature);
  };
  const initGame = async (
    stagingPeriodLength: anchor.BN,
    turnPeriodLength: anchor.BN
  ) => {
    const gameMasterAccountKp = new web3.Keypair();

    const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
      [gameMasterAccountKp.publicKey.toBuffer()],
      program.programId
    );
    await airdrop(gameMasterAccountKp.publicKey);

    const txHash = await program.methods
      .initialize(stagingPeriodLength, turnPeriodLength, minimumTicketEntry)
      .accounts({
        newGame: gameAccountPublicKey,
        gameMaster: gameMasterAccountKp.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([gameMasterAccountKp])
      .rpc()
      .catch((e) => {
        console.log(anchor.translateError(e, new Map()));
        throw Error(e);
      })
      .then((txHash) => txHash);
    await confirmTx(txHash);
    const gameAccount = await program.account.game.fetch(gameAccountPublicKey);
    return { gameMasterAccountKp, gameAccountPublicKey, gameAccount, txHash };
  };

  const initLongGame = async () => initGame(oneDay, oneHour);

  it("fails initializing if gameMaster is not signer", async () => {
    const gameMasterAccountKp = new web3.Keypair();
    const someOtherAccountKp = new web3.Keypair();
    const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
      [gameMasterAccountKp.publicKey.toBuffer()],
      program.programId
    );

    await airdrop(gameMasterAccountKp.publicKey);
    await expect(
      program.methods
        .initialize(oneDay, oneHour, minimumTicketEntry)
        .accounts({
          newGame: gameAccountPublicKey,
          gameMaster: gameMasterAccountKp.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([someOtherAccountKp])
        .rpc()
    ).to.be.rejectedWith(
      Error,
      `unknown signer: ${someOtherAccountKp.publicKey.toString()}`
    );
  });

  describe("Initializing", async () => {
    let gameMasterAccountKp: web3.Keypair;
    let gameAccount: Awaited<ReturnType<typeof program.account.game.fetch>>;
    let txHash: string;
    before(async () => {
      const res = await initLongGame();
      gameMasterAccountKp = res.gameMasterAccountKp;
      gameAccount = res.gameAccount;
      txHash = res.txHash;
    });

    it("has game master", () =>
      assert(gameMasterAccountKp.publicKey.equals(gameAccount.gameMaster)));
    it("has status is pending", () =>
      expect(gameAccount.state).to.eql({ pending: {} }));
    it("has an empty board", () => expect(gameAccount.board).to.eql([]));
    it("has a staging period", () =>
      expect(gameAccount.stagingPeriodLength).to.be.a.bignumber.that.eq(
        oneDay
      ));
    it("has a turn period", () =>
      expect(gameAccount.turnPeriodLength).to.be.a.bignumber.that.eq(oneHour));
    it("logs state starting and pending", async () => {
      const txDetails = await program.provider.connection.getTransaction(
        txHash,
        {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        }
      );
      const logs = txDetails?.meta?.logMessages;
      expect(logs.join("\n")).to.include("Game initialized and is now pending");
    });
    it("has a minimum ticket entry", () =>
      expect(gameAccount.minimumTicketEntry).to.be.a.bignumber.that.eq(
        minimumTicketEntry
      ));
  });

  describe("Playing", async () => {
    describe("Prohibited actions", async () => {
      let gameMasterAccountKp: web3.Keypair;
      let gameAccountPublicKey: web3.PublicKey;
      let someOtherAccountKp: web3.Keypair;

      before(async () => {
        const res = await initLongGame();
        gameAccountPublicKey = res.gameAccountPublicKey;
        gameMasterAccountKp = res.gameMasterAccountKp;
        someOtherAccountKp = new web3.Keypair();
      });
      it("fails cranking if gameMaster is not signer", async () =>
        expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(
          Error,
          `unknown signer: ${someOtherAccountKp.publicKey.toString()}`
        ));
      it("only allows initial game master to crank", async () =>
        expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              gameMaster: someOtherAccountKp.publicKey,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "NotGameMaster"));
      it("cannot crank while pending", async () =>
        expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "CannotCrankWhilePending"));
      it("does not allow game master to request hot potato", async () =>
        await expect(
          program.methods
            .requestHotPotato(minimumTicketEntry)
            .accounts({
              game: gameAccountPublicKey,
              player: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "GameMasterCannotPlay"));
      it("does not allow player to request hot potato with less than minimum", async () =>
        await expect(
          program.methods
            .requestHotPotato(minimumTicketEntry.subn(1))
            .accounts({
              game: gameAccountPublicKey,
              player: someOtherAccountKp.publicKey,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "InsufficientFunds"));
    });
    it("changes status to staging when first player joins", async () => {});
    it("logs status change to staging", async () => {});
    it("logs player joining and amount", async () => {});
    it("fills board with player's turns", async () => {});
    it("allows first player to join again");
    it("allows second player to join");
    it("does not allow first crank until after staging period", async () => {});
    it("changes status to active on first crank", async () => {});
    // TODO(techiejd): Allow for affiliate links.
    it("sends SOL to first and second player after first crank", async () => {});
    it("allows third player to join", async () => {});
    it("sends SOL to first, second and third player in second crank", async () => {});
    it("allows for game master to take out the game master money", async () => {});
  });

  describe("Finishing", () => {
    it("changes state to closing", async () => {});
    it("logs state change to closing", async () => {});
    it("it does not allow new players to join", async () => {});
    it("allows for game master to take out the game master money", async () => {});
  });
});
