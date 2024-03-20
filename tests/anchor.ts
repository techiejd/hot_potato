import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { HotPotato } from "../target/types/hot_potato";
import chai, { expect } from "chai";
import BN from "chai-bn";
import chaiAsPromised from "chai-as-promised";
import spies from "chai-spies";
chai.use(BN(anchor.BN));
chai.use(chaiAsPromised);
chai.use(spies);

describe("HotPotato", () => {
  const oneDay: anchor.BN = new anchor.BN(86400); // seconds
  const permilleProgramFee = 35; // 3.5% percent
  const oneHour = new anchor.BN(3600); // seconds
  const bigNumZero = new anchor.BN(0);
  const minimumTicketEntry = new anchor.BN(web3.LAMPORTS_PER_SOL / 2);
  const NumTurns = 150;
  const MaxNumOfRemainingAccountsDoableInOneDisbursementTx = 25;
  anchor.setProvider(anchor.AnchorProvider.env());
  type GameAccount = Awaited<ReturnType<typeof program.account.game.fetch>>;
  type BoardAccount = Awaited<ReturnType<typeof program.account.board.fetch>>;
  type PotatoHolder = BoardAccount["potatoHolders"][number];

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
      10 * web3.LAMPORTS_PER_SOL
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
  const expectBoardSlotToMatch = (
    holder: PotatoHolder,
    expected: PotatoHolder
  ) => {
    expect(holder).to.have.property("player").and.to.eql(expected.player);
    expect(holder)
      .to.have.property("turnNumber")
      .and.to.eq(expected.turnNumber);
    expect(holder)
      .to.have.property("paymentPending")
      .and.is.eq(expected.paymentPending);
    expect(holder)
      .to.have.property("turnAmount")
      .and.to.be.a.bignumber.that.is.eq(expected.turnAmount);
  };
  const expectEmptyBoardSlot = (holder: PotatoHolder) => {
    const emptyBoardSlot = {
      player: web3.SystemProgram.programId,
      turnNumber: 0,
      paymentPending: 0,
      turnAmount: bigNumZero,
    };
    expectBoardSlotToMatch(holder, emptyBoardSlot);
  };
  const initGame = async (
    stagingPeriodLength: anchor.BN,
    turnPeriodLength: anchor.BN
  ) => {
    const gameMasterAccountKp = new web3.Keypair();
    await airdrop(gameMasterAccountKp.publicKey);

    const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);

    const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
      [
        boardAccountKp.publicKey.toBuffer(),
        gameMasterAccountKp.publicKey.toBuffer(),
      ],
      program.programId
    );

    const txHash = await program.methods
      .initialize(
        stagingPeriodLength,
        turnPeriodLength,
        minimumTicketEntry,
        permilleProgramFee
      )
      .accounts({
        newGame: gameAccountPublicKey,
        newBoard: boardAccountKp.publicKey,
        gameMaster: gameMasterAccountKp.publicKey,
        boardAsSigner: boardAccountKp.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([gameMasterAccountKp, boardAccountKp])
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
  const initMediumGame = async () => initGame(bigNumZero, oneHour);
  const initShortGame = async () => initGame(bigNumZero, bigNumZero);

  const doPlayerRequestHotPotato = async (
    gameAccountPublicKey: web3.PublicKey,
    boardAccountPublicKey: web3.PublicKey,
    playerAccountKp: web3.Keypair,
    skipAirdrop = false
  ) => {
    if (!skipAirdrop) {
      await airdrop(playerAccountKp.publicKey);
    }
    const playerRequestsHotPotatoTxHash = await program.methods
      .requestHotPotato(minimumTicketEntry)
      .accounts({
        game: gameAccountPublicKey,
        board: boardAccountPublicKey,
        player: playerAccountKp.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([playerAccountKp])
      .rpc()
      .catch((e) => {
        console.log(anchor.translateError(e, new Map()));
        throw Error(e);
      })
      .then((txHash) => txHash);
    const playerRequestsHotPotatoTxConfirmation = await confirmTx(
      playerRequestsHotPotatoTxHash
    );
    return {
      playerRequestsHotPotatoTxHash,
      playerRequestsHotPotatoTxConfirmation,
    };
  };

  const doCrank = async (
    gameMasterAccountKp: web3.Keypair,
    gameAccountPublicKey: web3.PublicKey,
    boardAccountPublicKey: web3.PublicKey
  ) => {
    const crankTxHash = await program.methods
      .crank()
      .accounts({
        game: gameAccountPublicKey,
        board: boardAccountPublicKey,
        gameMaster: gameMasterAccountKp.publicKey,
      })
      .signers([gameMasterAccountKp])
      .rpc();
    const crankTxConfirmation = await confirmTx(crankTxHash);
    return {
      crankTxHash,
      crankTxConfirmation,
    };
  };

  const getPastFirstCrankInShortGameWithMaxTxPlayers = async () => {
    const { gameAccountPublicKey, boardAccountPublicKey, gameMasterAccountKp } =
      await initShortGame();
    const accounts = await Promise.all(
      Array.from(
        { length: MaxNumOfRemainingAccountsDoableInOneDisbursementTx },
        () => new web3.Keypair()
      )
    );
    await Promise.all(
      accounts.map((playerAccountKp) =>
        doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          playerAccountKp
        )
      )
    );
    await doCrank(
      gameMasterAccountKp,
      gameAccountPublicKey,
      boardAccountPublicKey
    );
    return {
      gameAccountPublicKey,
      boardAccountPublicKey,
      gameMasterAccountKp,
      accounts,
    };
  };

  describe("Fails initializing", async () => {
    it("fails initializing if seed doesn't include only gameMaster and board", async () => {
      const gameMasterAccountKp = new web3.Keypair();
      await airdrop(gameMasterAccountKp.publicKey);
      const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);
      const restOfAccounts = {
        newBoard: boardAccountKp.publicKey,
        gameMaster: gameMasterAccountKp.publicKey,
        boardAsSigner: boardAccountKp.publicKey,
        systemProgram: web3.SystemProgram.programId,
      };
      const [failingGameAccountPublicKey0] =
        web3.PublicKey.findProgramAddressSync([], program.programId);
      const [failingGameAccountPublicKey1] =
        web3.PublicKey.findProgramAddressSync(
          [boardAccountKp.publicKey.toBuffer()],
          program.programId
        );
      const [failingGameAccountPublicKey2] =
        web3.PublicKey.findProgramAddressSync(
          [gameMasterAccountKp.publicKey.toBuffer()],
          program.programId
        );
      const [failingGameAccountPublicKey3] =
        web3.PublicKey.findProgramAddressSync(
          [
            gameMasterAccountKp.publicKey.toBuffer(),
            boardAccountKp.publicKey.toBuffer(),
          ],
          program.programId
        );
      const someOtherAccountKp = new web3.Keypair();
      const [failingGameAccountPublicKey4] =
        web3.PublicKey.findProgramAddressSync(
          [
            boardAccountKp.publicKey.toBuffer(),
            gameMasterAccountKp.publicKey.toBuffer(),
            someOtherAccountKp.publicKey.toBuffer(),
          ],
          program.programId
        );
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
          .accounts({
            newGame: failingGameAccountPublicKey0,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
          .accounts({
            newGame: failingGameAccountPublicKey1,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
          .accounts({
            newGame: failingGameAccountPublicKey2,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
          .accounts({
            newGame: failingGameAccountPublicKey3,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
          .accounts({
            newGame: failingGameAccountPublicKey4,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
    });
    it("fails initializing if gameMaster and board are not the (only) signers", async () => {
      const gameMasterAccountKp = new web3.Keypair();
      await airdrop(gameMasterAccountKp.publicKey);
      const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);
      const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
        [
          boardAccountKp.publicKey.toBuffer(),
          gameMasterAccountKp.publicKey.toBuffer(),
        ],
        program.programId
      );
      const someOtherAccountKp = new web3.Keypair();
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
          .accounts({
            newGame: gameAccountPublicKey,
            newBoard: boardAccountKp.publicKey,
            gameMaster: gameMasterAccountKp.publicKey,
            boardAsSigner: boardAccountKp.publicKey,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([gameMasterAccountKp, boardAccountKp, someOtherAccountKp])
          .rpc()
      ).to.be.rejectedWith(
        Error,
        `unknown signer: ${someOtherAccountKp.publicKey.toString()}`
      );
    });
    it("fails initializing if more than 1000 is given as permilleProgramFee", async () => {
      const gameMasterAccountKp = new web3.Keypair();
      await airdrop(gameMasterAccountKp.publicKey);
      const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);
      const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
        [
          boardAccountKp.publicKey.toBuffer(),
          gameMasterAccountKp.publicKey.toBuffer(),
        ],
        program.programId
      );
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry, 1001)
          .accounts({
            newGame: gameAccountPublicKey,
            newBoard: boardAccountKp.publicKey,
            gameMaster: gameMasterAccountKp.publicKey,
            boardAsSigner: boardAccountKp.publicKey,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ImpossibleProgramFee");
    });
  });

  describe("Initializing", async () => {
    let gameMasterAccountKp: web3.Keypair;
    let boardAccountPublicKey: web3.PublicKey;
    let gameAccount: GameAccount;
    let boardAccount: BoardAccount;
    before(async () => {
      const res = await initLongGame();
      gameMasterAccountKp = res.gameMasterAccountKp;
      boardAccountPublicKey = res.boardAccountPublicKey;
      gameAccount = res.gameAccount;
      boardAccount = res.boardAccount;
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
    it("has permille program fee", () =>
      expect(gameAccount.permilleProgramFee).to.eq(permilleProgramFee));
    it("has a turn period", () =>
      expect(gameAccount.turnPeriodLength).to.be.a.bignumber.that.eq(oneHour));
    it("has a minimum ticket entry", () =>
      expect(gameAccount.minimumTicketEntry).to.be.a.bignumber.that.eq(
        minimumTicketEntry
      ));
    it("emits game initialized event", async () => {
      const gameMasterAccountKp = new web3.Keypair();
      await airdrop(gameMasterAccountKp.publicKey);

      const boardAccountKp = await initializeBoardAccount(gameMasterAccountKp);

      const [gameAccountPublicKey] = web3.PublicKey.findProgramAddressSync(
        [
          boardAccountKp.publicKey.toBuffer(),
          gameMasterAccountKp.publicKey.toBuffer(),
        ],
        program.programId
      );

      const expectOnEvent = (e: unknown) => {
        expect(e)
          .to.have.property("gameMaster")
          .and.to.eql(gameMasterAccountKp.publicKey);
        expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
        expect(e)
          .to.have.property("board")
          .and.to.eql(boardAccountKp.publicKey);
      };
      const eventListenerSpy = chai.spy(expectOnEvent);
      const gameInitializedListener = program.addEventListener(
        "GameInitialized",
        eventListenerSpy
      );

      const txHash = await program.methods
        .initialize(oneDay, oneHour, minimumTicketEntry, permilleProgramFee)
        .accounts({
          newGame: gameAccountPublicKey,
          newBoard: boardAccountKp.publicKey,
          gameMaster: gameMasterAccountKp.publicKey,
          boardAsSigner: boardAccountKp.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([gameMasterAccountKp, boardAccountKp])
        .rpc();
      await confirmTx(txHash);

      // This line is only for test purposes to ensure the event
      // listener has time to listen to event.
      await new Promise((resolve) => setTimeout(resolve, 5000));
      program.removeEventListener(gameInitializedListener);
      expect(eventListenerSpy).to.have.been.called();
    });
  });

  describe("Playing", async () => {
    const programFeePerTurn = Math.floor(
      (Math.floor(minimumTicketEntry.toNumber() / NumTurns) *
        permilleProgramFee) /
        1000
    );
    const returnPerTurn = Math.floor(
      Math.floor(
        (minimumTicketEntry.toNumber() * (1000 - permilleProgramFee)) / NumTurns
      ) / 1000
    );
    const amountWithoutChumpChange =
      NumTurns * (programFeePerTurn + returnPerTurn);
    const expectInitializedBoardSlot = (
      holder: PotatoHolder,
      player: web3.PublicKey
    ) => {
      const initializedBoardSlot = {
        player,
        turnNumber: 0,
        paymentPending: 0,
        turnAmount: new anchor.BN(amountWithoutChumpChange / NumTurns),
      };
      expectBoardSlotToMatch(holder, initializedBoardSlot);
    };
    describe("Prohibited actions", async () => {
      let gameMasterAccountKp: web3.Keypair;
      let gameAccountPublicKey: web3.PublicKey;
      let boardAccountPublicKey: web3.PublicKey;
      let someOtherAccountKp: web3.Keypair;

      before(async () => {
        const res = await initLongGame();
        gameAccountPublicKey = res.gameAccountPublicKey;
        boardAccountPublicKey = res.boardAccountPublicKey;
        gameMasterAccountKp = res.gameMasterAccountKp;
        someOtherAccountKp = new web3.Keypair();
      });
      it("fails cranking if gameMaster is not signer", async () =>
        expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(
          Error,
          `unknown signer: ${someOtherAccountKp.publicKey.toString()}`
        ));
      it("checks that the board matches when cranking", async () => {
        const { boardAccountPublicKey: someOtherBoardAccountPublicKey } =
          await initLongGame();
        await expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              board: someOtherBoardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "BoardMismatch");
      });
      it("checks that the board matches when requesting hot potato", async () => {
        const { boardAccountPublicKey: someOtherBoardAccountPublicKey } =
          await initLongGame();
        await expect(
          program.methods
            .requestHotPotato(minimumTicketEntry)
            .accounts({
              game: gameAccountPublicKey,
              board: someOtherBoardAccountPublicKey,
              player: someOtherAccountKp.publicKey,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "BoardMismatch");
      });
      it("only allows initial game master to crank", async () =>
        expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
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
              board: boardAccountPublicKey,
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
      it("changes status to staging with starting time when first player joins", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const {
          playerRequestsHotPotatoTxConfirmation: firstPlayerJoinsTxConfirmation,
        } = await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        const refetchedGameAccount =
          await program.account.game.fetch(gameAccountPublicKey);

        const txTime = await program.provider.connection.getBlockTime(
          firstPlayerJoinsTxConfirmation.context.slot
        );
        expect(refetchedGameAccount.state).to.eql({
          staging: { ending: new anchor.BN(txTime).add(oneDay) },
        });
      });
      it("emits status change event to staging", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        let stagingEndingTime: anchor.BN;
        const expectOnEvent = (e: unknown) => {
          expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
          expect(e)
            .to.have.property("state")
            .and.to.have.property("staging")
            .and.to.have.property("ending");
          stagingEndingTime = e["state"]["staging"]["ending"];
        };
        const eventListenerSpy = chai.spy(expectOnEvent);
        const gameInitializedListener = program.addEventListener(
          "GameStateChanged",
          eventListenerSpy
        );
        const firstPlayerAccountKp = new web3.Keypair();

        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        const refetchedGameAccount =
          await program.account.game.fetch(gameAccountPublicKey);

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(gameInitializedListener);
        expect(eventListenerSpy).to.have.been.called();
        expect(stagingEndingTime).to.be.a.bignumber.that.is.eq(
          refetchedGameAccount.state.staging?.ending
        );
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

        await doPlayerRequestHotPotato(
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
      it("emits PotatoReceived Event", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const expectOnEvent = (e: unknown) => {
          expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
          expect(e)
            .to.have.property("player")
            .and.to.eql(firstPlayerAccountKp.publicKey);
          const r = expect(e)
            .to.have.property("ticketEntryAmount")
            .and.to.be.a.bignumber.that.is.eq(
              new anchor.BN(amountWithoutChumpChange)
            );
        };
        const eventListenerSpy = chai.spy(expectOnEvent);
        const gameInitializedListener = program.addEventListener(
          "PotatoReceived",
          eventListenerSpy
        );

        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(gameInitializedListener);
        expect(eventListenerSpy).to.have.been.called();
      });
      it("fills hotPotatoHolders with player's turn information once", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        const refetchedboardAccount = await program.account.board.fetch(
          boardAccountPublicKey
        );

        const firstPlayerSlot = refetchedboardAccount.potatoHolders[0];
        expectInitializedBoardSlot(
          firstPlayerSlot,
          firstPlayerAccountKp.publicKey
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
      it("allows first player to request again", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        const refetchedboardAccount = await program.account.board.fetch(
          boardAccountPublicKey
        );

        const firstPlayerSlot0 = refetchedboardAccount.potatoHolders[0];
        expectInitializedBoardSlot(
          firstPlayerSlot0,
          firstPlayerAccountKp.publicKey
        );
        const firstPlayerSlot1 = refetchedboardAccount.potatoHolders[1];
        expectInitializedBoardSlot(
          firstPlayerSlot1,
          firstPlayerAccountKp.publicKey
        );
        expect(refetchedboardAccount.head).to.be.a.bignumber.that.is.eq(
          bigNumZero
        );
        expect(refetchedboardAccount.tail).to.be.a.bignumber.that.is.eq(
          new anchor.BN(2)
        );
        refetchedboardAccount.potatoHolders
          .slice(2)
          .every((holder) => expectEmptyBoardSlot(holder));
      });
      it("does not allow first crank until after staging period", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
        } = await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        await expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(
          anchor.AnchorError,
          "CrankNotAllowedBeforeStagingEnds"
        );
      });
    });
    it(
      "allows for up to 10_000 players to join" /*, async () => {
      // Heads up! This'll take a while to run.
      const { gameAccountPublicKey, boardAccountPublicKey } =
        await initLongGame();
      const playerAccountKps = Array.from({ length: 10_000 }, () => {
        return new web3.Keypair();
      });
      // Break up the players into chunks of 100 to avoid hitting tx or heap limits
      const chunkSize = 100;
      const chunkedPlayerAccountKps = playerAccountKps.reduce((acc, _, i) => {
        const index = Math.floor(i / chunkSize);
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(playerAccountKps[i]);
        return acc;
      }, [] as web3.Keypair[][]);
      let counter = 0;
      for (const chunk of chunkedPlayerAccountKps) {
        await Promise.all(
          chunk.map((playerAccountKp) =>
            doPlayerRequestHotPotato(
              gameAccountPublicKey,
              boardAccountPublicKey,
              playerAccountKp
            )
          )
        );
        console.log(
          `Chunk ${counter + 1} of ${chunkedPlayerAccountKps.length}`
        );
        counter++;
      }
      console.log("All players joined");
      const refetchedboardAccount = await program.account.board.fetch(
        boardAccountPublicKey
      );
      console.log("board refetched");
      expect(
        playerAccountKps.every((playerAccountKp) => {
          const playerSlot = refetchedboardAccount.potatoHolders.find(
            (holder) => holder.player.equals(playerAccountKp.publicKey)
          );
          expect(playerSlot).to.not.be.undefined;
          expectInitializedBoardSlot(playerSlot, playerAccountKp.publicKey);
          return true;
        })
      ).to.be.true;
      console.log("All players slots checked");

      const overTenThousandthPlayerAccountKp = new web3.Keypair();
      console.log("overTenThousandthPlayerAccountKp created");
      await expect(
        doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          overTenThousandthPlayerAccountKp
        )
      ).to.be.rejectedWith(Error, "BoardFull"); // Not an anchor.Error because that's not how their macro is defined. Typo?
    }*/
    );
    describe("First crank", async () => {
      it("changes status to active with next crank time", async () => {
        const {
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey,
        } = await initMediumGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        const crankTxHash = await program.methods
          .crank()
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountPublicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .rpc();
        const crankTxConfirmation = await confirmTx(crankTxHash);
        const refetchedGameAccount =
          await program.account.game.fetch(gameAccountPublicKey);
        const txTime = await program.provider.connection.getBlockTime(
          crankTxConfirmation.context.slot
        );
        expect(refetchedGameAccount.state).to.eql({
          active: {
            nextCrank: new anchor.BN(txTime).add(oneHour),
          },
        });
      });
      it("prevents next crank before next crank time", async () => {
        const {
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey,
        } = await initMediumGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        await doCrank(
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey
        );

        await expect(
          program.methods
            .crank()
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(
          anchor.AnchorError,
          "CrankNotAllowedBeforeNextCrankTime"
        );
      });
      it("emits crank event", async () => {
        const {
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey,
        } = await initMediumGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        let nextCrankTimeFromEvent: anchor.BN;
        const expectOnEvent = (e: unknown) => {
          expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
          expect(e)
            .to.have.property("state")
            .and.to.have.property("active")
            .and.to.have.property("nextCrank");
          nextCrankTimeFromEvent = e["state"]["active"]["nextCrank"];
        };
        const eventListenerSpy = chai.spy(expectOnEvent);
        const gameInitializedListener = program.addEventListener(
          "GameStateChanged",
          eventListenerSpy
        );

        await doCrank(
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey
        );
        const refetchedGameAccount =
          await program.account.game.fetch(gameAccountPublicKey);

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(gameInitializedListener);
        expect(eventListenerSpy).to.have.been.called();
        expect(nextCrankTimeFromEvent).to.be.a.bignumber.that.is.eql(
          refetchedGameAccount.state.active?.nextCrank
        );
      });
      it("updates player's turn and payout information", async () => {
        const {
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey,
        } = await initMediumGame();
        const firstPlayerAccountKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );
        await doCrank(
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey
        );
        const refetchedboardAccount = await program.account.board.fetch(
          boardAccountPublicKey
        );
        const firstPlayerSlot = refetchedboardAccount.potatoHolders[0];
        expect(firstPlayerSlot.turnNumber).to.eq(1);
        expect(firstPlayerSlot.paymentPending).to.eq(1);
      });
    });
    describe("Disburse", async () => {
      const getDisbursableState = async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
        } = await getPastFirstCrankInShortGameWithMaxTxPlayers();
        const fetchedBoardAccount = await program.account.board.fetch(
          boardAccountPublicKey
        );
        const firstPlayersAccounts = fetchedBoardAccount.potatoHolders.slice(
          0,
          MaxNumOfRemainingAccountsDoableInOneDisbursementTx
        );
        const remainingAccounts = firstPlayersAccounts.map((holder) => ({
          pubkey: holder.player,
          isSigner: false,
          isWritable: true,
        }));
        return {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
          firstPlayersAccounts,
          fetchedBoardAccount,
        };
      };

      it("checks the board matches when disbursing", async () => {
        const { gameAccountPublicKey, gameMasterAccountKp } =
          await initLongGame();
        const { boardAccountPublicKey: someOtherBoardAccountPublicKey } =
          await initLongGame();
        await expect(
          program.methods
            .disburseToPotatoHolders(0)
            .accounts({
              game: gameAccountPublicKey,
              board: someOtherBoardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "BoardMismatch");
      });
      it("checks it's the correct game master", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const someOtherAccountKp = new web3.Keypair();
        await expect(
          program.methods
            .disburseToPotatoHolders(0)
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: someOtherAccountKp.publicKey,
            })
            .signers([someOtherAccountKp])
            .rpc()
        ).to.be.rejectedWith(Error, "NotGameMaster");
      });
      it("checks each player in order", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableState();
        const allButLastTwo = remainingAccounts.slice(0, -2);
        const lastTwo = remainingAccounts.slice(-2);
        await expect(
          program.methods
            .disburseToPotatoHolders(0)
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .remainingAccounts([...allButLastTwo, lastTwo[1], lastTwo[0]])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "PlayerSlotMismatch");
        await expect(
          program.methods
            .disburseToPotatoHolders(0)
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .remainingAccounts(remainingAccounts)
            .rpc()
        ).to.eventually.be.ok;
      });
      it(`sends SOL to players and their program fee to game master
            and updates players' board`, async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableState();

        const gameMasterStartingBalance =
          await program.provider.connection.getBalance(
            gameMasterAccountKp.publicKey
          );
        const accountStartingBalances = await Promise.all(
          remainingAccounts.map((acc) =>
            program.provider.connection.getBalance(acc.pubkey)
          )
        );

        const txHash = await program.methods
          .disburseToPotatoHolders(0)
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountPublicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .remainingAccounts(remainingAccounts)
          .rpc();
        confirmTx(txHash);

        const gameMasterEndingBalance =
          await program.provider.connection.getBalance(
            gameMasterAccountKp.publicKey
          );
        const accountEndingBalances = await Promise.all(
          remainingAccounts.map((account) =>
            program.provider.connection.getBalance(account.pubkey)
          )
        );
        accountEndingBalances.every((endingBalance, i) => {
          expect(endingBalance).to.be.eq(
            accountStartingBalances[i] + returnPerTurn
          );
          return true;
        });
        expect(gameMasterEndingBalance).to.be.eq(
          gameMasterStartingBalance +
            programFeePerTurn *
              MaxNumOfRemainingAccountsDoableInOneDisbursementTx
        );

        const refetchedBoardAccount = await program.account.board.fetch(
          boardAccountPublicKey
        );
        refetchedBoardAccount.potatoHolders
          .slice(0, MaxNumOfRemainingAccountsDoableInOneDisbursementTx)
          .every((holder) => {
            expect(holder.turnNumber).to.eq(1);
            expect(holder.paymentPending).to.eq(0);
            return true;
          });
      });
      it("emits PlayerPayout event", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableState();
        let i = 0;
        const expectOnEvent = (e: unknown) => {
          expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
          expect(e).to.have.property("turn").and.to.eql(1);
          expect(e)
            .to.have.property("player")
            .and.to.eql(remainingAccounts[i].pubkey);
          expect(e)
            .to.have.property("amount")
            .and.to.be.a.bignumber.that.is.eq(new anchor.BN(returnPerTurn));
          i++;
        };
        const eventListenerSpy = chai.spy(expectOnEvent);
        const gameInitializedListener = program.addEventListener(
          "PotatoHolderPaid",
          eventListenerSpy
        );

        await program.methods
          .disburseToPotatoHolders(0)
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountPublicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .remainingAccounts(remainingAccounts)
          .rpc();

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(gameInitializedListener);
        expect(eventListenerSpy).to.have.been.called.exactly(
          MaxNumOfRemainingAccountsDoableInOneDisbursementTx
        );
      });
      it("emits GameMasterPayout event", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableState();
        const expectOnEvent = (e: unknown) => {
          expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
          expect(e)
            .to.have.property("amount")
            .and.to.be.a.bignumber.that.is.eq(
              new anchor.BN(
                programFeePerTurn *
                  MaxNumOfRemainingAccountsDoableInOneDisbursementTx
              )
            );
        };
        const eventListenerSpy = chai.spy(expectOnEvent);
        const gameInitializedListener = program.addEventListener(
          "GameMasterPaid",
          eventListenerSpy
        );

        await program.methods
          .disburseToPotatoHolders(0)
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountPublicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .remainingAccounts(remainingAccounts)
          .rpc();

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(gameInitializedListener);
        expect(eventListenerSpy).to.have.been.called();
      });
      it("fails if not in active state", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
        } = await initLongGame();
        await expect(
          program.methods
            .disburseToPotatoHolders(0)
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc()
        ).to.be.rejectedWith(anchor.AnchorError, "CannotDisburseWhenNotActive");
      });
      it("fails if a player does not have a pending payment", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableState();

        await program.methods
          .disburseToPotatoHolders(0)
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountPublicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .remainingAccounts(remainingAccounts)
          .rpc();

        await expect(
          program.methods
            .disburseToPotatoHolders(0)
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .remainingAccounts(remainingAccounts)
            .rpc()
        ).to.be.rejectedWith(
          anchor.AnchorError,
          "TriedToDisburseToNotPendingPayment"
        );
      });
    });
    describe("Subsequent cranks and disbursement", async () => {
      it("fails crank if payment is due");
      it("updates next crank time with each crank");
      it("emits crank event for subsequent crank");
    });
    describe("Affiliate link", async () => {
      it("saves affiliate");
      it("it splits program fee with affiliate link");
    });
  });

  describe("Finishing", () => {
    it("changes state to closed when we run out of money in the pot");
    it("emits closed event");
    it("it does not allow new players to join");
    it("allows for game master to take out the game master money");
  });
  it(
    `gives up to 150% - (program fee)% throughout the game, 
    pops out the winner, allows up to 10_000 to join and then closes 
    when no more money`
  );
});
