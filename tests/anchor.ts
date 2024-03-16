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
  const bigNumZero = new anchor.BN(0);
  const minimumTicketEntry = new anchor.BN(web3.LAMPORTS_PER_SOL / 2);
  const NumTurns = 150;
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.HotPotato as anchor.Program<HotPotato>;
  const confirmTx = async (txHash: string) => {
    const latestBlockHash =
      await program.provider.connection.getLatestBlockhash();

    return program.provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txHash,
    });
  };
  const airdrop = async (addy: web3.PublicKey) => {
    const airdropSignature = await program.provider.connection.requestAirdrop(
      addy,
      5 * web3.LAMPORTS_PER_SOL
    );
    return confirmTx(airdropSignature);
  };
  const initializeBoardAccount = async (gameMasterAccountKp: web3.Keypair) => {
    const boardAccountKp = new web3.Keypair();
    const boardAccountSize = program.account.board.size;
    const lamportsForRentExemption =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        boardAccountSize
      );
    const createAccountInstruction = web3.SystemProgram.createAccount({
      fromPubkey: gameMasterAccountKp.publicKey,
      newAccountPubkey: boardAccountKp.publicKey,
      lamports: lamportsForRentExemption,
      space: boardAccountSize,
      programId: program.programId,
    });
    const transaction = new web3.Transaction().add(createAccountInstruction);
    await web3.sendAndConfirmTransaction(
      program.provider.connection,
      transaction,
      [gameMasterAccountKp, boardAccountKp]
    );
    return boardAccountKp;
  };
  const expectEmptyBoardSlot = (holder: {
    player: web3.PublicKey;
    turnNumber: anchor.BN;
    turnAmount: anchor.BN;
  }) => {
    const emptyBoardSlot = {
      player: web3.SystemProgram.programId,
      turnNumber: bigNumZero,
      turnAmount: bigNumZero,
    };
    expect(holder).to.have.property("player").and.to.eql(emptyBoardSlot.player);
    expect(holder)
      .to.have.property("turnNumber")
      .and.to.be.a.bignumber.that.is.eq(emptyBoardSlot.turnNumber);
    expect(holder)
      .to.have.property("turnAmount")
      .and.to.be.a.bignumber.that.is.eq(emptyBoardSlot.turnAmount);
  };
  const initGame = async (
    stagingPeriodLength: anchor.BN,
    turnPeriodLength: anchor.BN
  ) => {
    const gameMasterAccountKp = new web3.Keypair();
    await airdrop(gameMasterAccountKp.publicKey);

    const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);

    const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
      [gameMasterAccountKp.publicKey.toBuffer()],
      program.programId
    );

    const txHash = await program.methods
      .initialize(stagingPeriodLength, turnPeriodLength, minimumTicketEntry)
      .accounts({
        newGame: gameAccountPublicKey,
        newBoard: boardAccountKp.publicKey,
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
    const boardAccount = await program.account.board.fetch(
      boardAccountKp.publicKey
    );
    return {
      gameMasterAccountKp,
      gameAccountPublicKey,
      boardAccountPublicKey: boardAccountKp.publicKey,
      gameAccount,
      boardAccount,
      boardAccountKp,
      txHash,
    };
  };

  const initLongGame = async () => initGame(oneDay, oneHour);

  const doFirstPlayerRequestHotPotato = async (
    gameAccountPublicKey: web3.PublicKey,
    boardAccountPublicKey: web3.PublicKey,
    firstPlayerAccountKp: web3.Keypair,
    skipAirdrop = false
  ) => {
    if (!skipAirdrop) {
      await airdrop(firstPlayerAccountKp.publicKey);
    }
    const firstPlayerJoinsTxHash = await program.methods
      .requestHotPotato(minimumTicketEntry)
      .accounts({
        game: gameAccountPublicKey,
        board: boardAccountPublicKey,
        player: firstPlayerAccountKp.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([firstPlayerAccountKp])
      .rpc()
      .catch((e) => {
        console.log(anchor.translateError(e, new Map()));
        throw Error(e);
      })
      .then((txHash) => txHash);
    const firstPlayerJoinsTxConfirmation = await confirmTx(
      firstPlayerJoinsTxHash
    );
    const refetchedGameAccount =
      await program.account.game.fetch(gameAccountPublicKey);
    const refetchedboardAccount = await program.account.board.fetch(
      refetchedGameAccount.board
    );
    return {
      firstPlayerJoinsTxHash,
      firstPlayerJoinsTxConfirmation,
      refetchedGameAccount,
      refetchedboardAccount,
    };
  };

  it("fails initializing if gameMaster is not signer", async () => {
    const gameMasterAccountKp = new web3.Keypair();
    await airdrop(gameMasterAccountKp.publicKey);
    const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);
    const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
      [gameMasterAccountKp.publicKey.toBuffer()],
      program.programId
    );
    const someOtherAccountKp = new web3.Keypair();
    await expect(
      program.methods
        .initialize(oneDay, oneHour, minimumTicketEntry)
        .accounts({
          newGame: gameAccountPublicKey,
          newBoard: boardAccountKp.publicKey,
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
    let boardAccountPublicKey: web3.PublicKey;
    let gameAccount: Awaited<ReturnType<typeof program.account.game.fetch>>;
    let boardAccount: Awaited<ReturnType<typeof program.account.board.fetch>>;
    let txHash: string;
    before(async () => {
      const res = await initLongGame();
      gameMasterAccountKp = res.gameMasterAccountKp;
      boardAccountPublicKey = res.boardAccountPublicKey;
      gameAccount = res.gameAccount;
      boardAccount = res.boardAccount;
      txHash = res.txHash;
    });

    it("has game master", () =>
      assert(gameMasterAccountKp.publicKey.equals(gameAccount.gameMaster)));
    it("has status is pending", () =>
      expect(gameAccount.state).to.eql({ pending: {} }));
    it("has a game board", () =>
      expect(gameAccount.board).to.eql(boardAccountPublicKey));
    it("has an empty hotPotatoHolders of length 10_000", () => {
      expect(boardAccount.head).to.be.a.bignumber.that.is.eq(bigNumZero);
      expect(boardAccount.tail).to.be.a.bignumber.that.is.eq(bigNumZero);
      boardAccount.potatoHolders.every((holder) =>
        expectEmptyBoardSlot(holder)
      );
      expect(boardAccount.potatoHolders.length).to.eq(10_000);
    });
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
      let boardAccountPublicKey: web3.PublicKey;
      let someOtherAccountKp: web3.Keypair;
      let boardAccountKp: web3.Keypair;

      before(async () => {
        const res = await initLongGame();
        gameAccountPublicKey = res.gameAccountPublicKey;
        boardAccountPublicKey = res.boardAccountPublicKey;
        gameMasterAccountKp = res.gameMasterAccountKp;
        boardAccountKp = res.boardAccountKp;
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
              board: boardAccountPublicKey,
              player: gameMasterAccountKp.publicKey,
              systemProgram: web3.SystemProgram.programId,
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
              board: boardAccountPublicKey,
              player: someOtherAccountKp.publicKey,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "BelowTicketEntryMinimum"));
      it("does not allow player to request hot potato with more than they have", async () => {
        const playerAccount = new web3.Keypair();
        await expect(
          program.methods
            .requestHotPotato(minimumTicketEntry)
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              player: playerAccount.publicKey,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([playerAccount])
            .rpc()
        ).to.be.rejectedWith(Error, "custom program error: 0x1"); // InsufficientFunds
      });
    });
    describe("First player requests hot potato", async () => {
      const amountWithoutChumpChange =
        minimumTicketEntry.toNumber() -
        (minimumTicketEntry.toNumber() % NumTurns);

      it("changes status to staging with starting time when first player joins", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const { firstPlayerJoinsTxConfirmation, refetchedGameAccount } =
          await doFirstPlayerRequestHotPotato(
            gameAccountPublicKey,
            boardAccountPublicKey,
            firstPlayerAccountKp
          );

        const txTime = await program.provider.connection.getBlockTime(
          firstPlayerJoinsTxConfirmation.context.slot
        );
        expect(refetchedGameAccount.state).to.eql({
          staging: { ending: new anchor.BN(txTime).add(oneDay) },
        });
      });
      it("logs status change to staging", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const { firstPlayerJoinsTxHash } = await doFirstPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        const txDetails = await program.provider.connection.getTransaction(
          firstPlayerJoinsTxHash,
          {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          }
        );
        const logs = txDetails?.meta?.logMessages;
        expect(logs.join("\n")).to.include("Game is now in staging mode");
      });
      it("transfer funds to the hotPotatoGame", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await airdrop(firstPlayerAccountKp.publicKey);
        const gameAccountStartingBalance =
          await program.provider.connection.getBalance(gameAccountPublicKey);
        const firstPlayerStartingBalance =
          await program.provider.connection.getBalance(
            firstPlayerAccountKp.publicKey
          );

        await doFirstPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp,
          true
        );
        const gameAccountEndingBalance =
          await program.provider.connection.getBalance(gameAccountPublicKey);
        const firstPlayerEndingBalance =
          await program.provider.connection.getBalance(
            firstPlayerAccountKp.publicKey
          );

        expect(gameAccountEndingBalance).to.be.eq(
          gameAccountStartingBalance + amountWithoutChumpChange
        );
        expect(firstPlayerEndingBalance).to.be.eq(
          firstPlayerStartingBalance - amountWithoutChumpChange
        );
      });
      it("logs player joining and amount", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const { firstPlayerJoinsTxHash } = await doFirstPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        const txDetails = await program.provider.connection.getTransaction(
          firstPlayerJoinsTxHash,
          {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          }
        );
        const logs = txDetails?.meta?.logMessages;

        expect(logs.join("\n")).to.include(
          `Player ${firstPlayerAccountKp.publicKey.toString()} joined with ${amountWithoutChumpChange}`
        );
      });
      it("fills hotPotatoHolders with player's turn information once", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const { refetchedboardAccount } = await doFirstPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        const firstPlayerSlot = refetchedboardAccount.potatoHolders[0];
        expect(firstPlayerSlot)
          .to.have.a.property("player")
          .and.to.eql(firstPlayerAccountKp.publicKey);
        console.log("0");
        expect(firstPlayerSlot)
          .to.have.a.property("turnNumber")
          .and.to.be.a.bignumber.that.is.eq(bigNumZero);
        console.log("1");
        expect(firstPlayerSlot)
          .to.have.a.property("turnAmount")
          .and.to.be.a.bignumber.that.is.eq(
            new anchor.BN(amountWithoutChumpChange / NumTurns)
          );
        expect(refetchedboardAccount.head).to.be.a.bignumber.that.is.eq(
          bigNumZero
        );
        expect(refetchedboardAccount.tail).to.be.a.bignumber.that.is.eq(
          new anchor.BN(1)
        );
        refetchedboardAccount.potatoHolders
          .slice(1)
          .every((holder) => expectEmptyBoardSlot(holder));
      });
      it("does not allow first crank until after staging period", async () => {});
    });
    it("changes status to active on first crank", async () => {});
    it("allows first player to join again");
    it("allows second player to join");
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
