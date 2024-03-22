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
  const TicketEntrySplit = 100;
  const MaxNumTurns = 150;
  const MaxNumPlayers = 10_000;
  const MaxNumOfRemainingAccountsDoableInOneDisbursementTx = 25;
  anchor.setProvider(anchor.AnchorProvider.env());
  type GameAccount = anchor.IdlAccounts<HotPotato>["game"];
  type BoardAccount = anchor.IdlAccounts<HotPotato>["board"];
  type PotatoHoldingInformation =
    anchor.IdlTypes<HotPotato>["PotatoHoldingInformation"];

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
    holder: PotatoHoldingInformation,
    expected: PotatoHoldingInformation
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
  const expectEmptyBoardSlot = (holder: PotatoHoldingInformation) => {
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
      .rpc();
    await confirmTx(txHash);
    return {
      gameMasterAccountKp,
      gameAccountPublicKey,
      boardAccountPublicKey: boardAccountKp.publicKey,
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
      .rpc();
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

  const doDisbursement = async (
    gameAccountPublicKey: web3.PublicKey,
    boardAccountPublicKey: web3.PublicKey,
    gameMasterAccountKp: web3.Keypair,
    remainingAccounts: {
      pubkey: web3.PublicKey;
      isSigner: boolean;
      isWritable: boolean;
    }[],
    offset = 0
  ) => {
    const disbursementTxHash = await program.methods
      .disburseToPotatoHolders(offset)
      .accounts({
        game: gameAccountPublicKey,
        board: boardAccountPublicKey,
        gameMaster: gameMasterAccountKp.publicKey,
      })
      .signers([gameMasterAccountKp])
      .remainingAccounts(remainingAccounts)
      .rpc();
    const disbursementTxHashConfirmation = await confirmTx(disbursementTxHash);
    return {
      disbursementTxHash,
      disbursementTxHashConfirmation,
    };
  };

  const getPastFirstCrankWithMaxTxPlayers = async (
    initGameCallback: typeof initShortGame
  ) => {
    const { gameAccountPublicKey, boardAccountPublicKey, gameMasterAccountKp } =
      await initGameCallback();
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

  const getDisbursableStateWithMaxTxPlayers = async (
    initGameCallback: typeof initShortGame
  ) => {
    const { gameAccountPublicKey, boardAccountPublicKey, gameMasterAccountKp } =
      await getPastFirstCrankWithMaxTxPlayers(initGameCallback);
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

  const getDisbursableStateWithMaxTxPlayersInShortGame = () =>
    getDisbursableStateWithMaxTxPlayers(initShortGame);

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
      gameAccount = await program.account.game.fetch(res.gameAccountPublicKey);
      boardAccount = await program.account.board.fetch(
        res.boardAccountPublicKey
      );
    });

    it("has game master", () =>
      expect(gameAccount.gameMaster).to.eql(gameMasterAccountKp.publicKey));
    it("has status is pending", () =>
      expect(gameAccount.state).to.eql({ pending: {} }));
    it("has a game board", () =>
      expect(gameAccount.board).to.eql(boardAccountPublicKey));
    it(`has an empty hotPotatoHolders of length ${MaxNumPlayers}`, () => {
      expect(boardAccount.head).to.be.a.bignumber.that.is.eq(bigNumZero);
      expect(boardAccount.tail).to.be.a.bignumber.that.is.eq(bigNumZero);
      boardAccount.potatoHolders.every((holder) =>
        expectEmptyBoardSlot(holder)
      );
      expect(boardAccount.potatoHolders.length).to.eq(MaxNumPlayers);
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
      const listener = program.addEventListener(
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
      program.removeEventListener(listener);
      expect(eventListenerSpy).to.have.been.called();
    });
  });

  describe("Playing", async () => {
    const programFeePerTurn = Math.floor(
      (Math.floor(minimumTicketEntry.toNumber() / TicketEntrySplit) *
        permilleProgramFee) /
        1000
    );
    const returnPerTurn = Math.floor(
      Math.floor(
        (minimumTicketEntry.toNumber() * (1000 - permilleProgramFee)) /
          TicketEntrySplit
      ) / 1000
    );
    const amountWithoutChumpChange =
      TicketEntrySplit * (programFeePerTurn + returnPerTurn);
    const expectInitializedBoardSlot = (
      holder: PotatoHoldingInformation,
      player: web3.PublicKey
    ) => {
      const initializedBoardSlot = {
        player,
        turnNumber: 0,
        paymentPending: 0,
        turnAmount: new anchor.BN(amountWithoutChumpChange / TicketEntrySplit),
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
        const listener = program.addEventListener(
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
        program.removeEventListener(listener);
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

        const { playerRequestsHotPotatoTxHash } =
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
        const listener = program.addEventListener(
          "PotatoReceived",
          eventListenerSpy
        );

        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(listener);
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
      `allows for up to ${MaxNumPlayers} players to join` /* async () => {
      // Heads up! This'll take a while to run.
      const { gameAccountPublicKey, boardAccountPublicKey } =
        await initLongGame();
      const { chunkedPlayerAccountKps, playerAccountKps } =
        makeAndChunkPlayerAccountsFor(MaxNumPlayers);
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
        const listener = program.addEventListener(
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
        program.removeEventListener(listener);
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
      it("checks the board matches when disbursing", async () => {
        const { gameAccountPublicKey, gameMasterAccountKp } =
          await initLongGame();
        const { boardAccountPublicKey: someOtherBoardAccountPublicKey } =
          await initLongGame();
        await expect(
          doDisbursement(
            gameAccountPublicKey,
            someOtherBoardAccountPublicKey,
            gameMasterAccountKp,
            []
          )
        ).to.be.rejectedWith(anchor.AnchorError, "BoardMismatch");
      });
      it("checks it's the correct game master", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const someOtherAccountKp = new web3.Keypair();
        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            someOtherAccountKp,
            []
          )
        ).to.be.rejectedWith(Error, "NotGameMaster");
      });
      it("checks each player in order", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayersInShortGame();
        const allButLastTwo = remainingAccounts.slice(0, -2);
        const lastTwo = remainingAccounts.slice(-2);
        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [...allButLastTwo, lastTwo[1], lastTwo[0]]
          )
        ).to.be.rejectedWith(anchor.AnchorError, "PlayerSlotMismatch");
        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            remainingAccounts
          ).catch((e) => {
            console.log(e);
            throw e;
          })
        ).to.eventually.be.ok;
      });
      it(`sends SOL to players and their program fee to game master
            and updates players' board and game pot`, async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayersInShortGame();

        const gameStartingPot = (
          await program.account.game.fetch(gameAccountPublicKey)
        ).pot;
        const gameMasterStartingBalance =
          await program.provider.connection.getBalance(
            gameMasterAccountKp.publicKey
          );
        const accountStartingBalances = await Promise.all(
          remainingAccounts.map((acc) =>
            program.provider.connection.getBalance(acc.pubkey)
          )
        );

        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
        );

        const gameMasterEndingBalance =
          await program.provider.connection.getBalance(
            gameMasterAccountKp.publicKey
          );
        const accountEndingBalances = await Promise.all(
          remainingAccounts.map((account) =>
            program.provider.connection.getBalance(account.pubkey)
          )
        );
        const gameEndingPot = (
          await program.account.game.fetch(gameAccountPublicKey)
        ).pot;
        const refetchedBoardAccount = await program.account.board.fetch(
          boardAccountPublicKey
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
        refetchedBoardAccount.potatoHolders
          .slice(0, MaxNumOfRemainingAccountsDoableInOneDisbursementTx)
          .every((holder) => {
            expect(holder.turnNumber).to.eq(1);
            expect(holder.paymentPending).to.eq(0);
            return true;
          });
        expect(gameEndingPot).to.be.a.bignumber.that.is.eq(
          gameStartingPot.sub(
            new anchor.BN(
              remainingAccounts.length * (returnPerTurn + programFeePerTurn)
            )
          )
        );
      });
      it("emits PlayerPayout event", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayersInShortGame();
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
        const listener = program.addEventListener(
          "PotatoHolderPaid",
          eventListenerSpy
        );

        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(listener);
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
        } = await getDisbursableStateWithMaxTxPlayersInShortGame();
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
        const listener = program.addEventListener(
          "GameMasterPaid",
          eventListenerSpy
        );

        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(listener);
        expect(eventListenerSpy).to.have.been.called();
      });
      it("fails if not in active state", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
        } = await initLongGame();
        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            []
          )
        ).to.be.rejectedWith(anchor.AnchorError, "CannotDisburseWhenNotActive");
      });
      it("fails if a player does not have a pending payment", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayersInShortGame();

        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
        );

        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            remainingAccounts
          )
        ).to.be.rejectedWith(
          anchor.AnchorError,
          "TriedToDisburseToNotPendingPayment"
        );
      });
    });
    describe("Subsequent cranks and disbursement", async () => {
      const getDisbursableStateWithMaxTxPlayersInOneSecGame = () =>
        getDisbursableStateWithMaxTxPlayers(
          () => initGame(bigNumZero, new anchor.BN(1)) // 1 second
        );
      const getTo101thCrankWithOnePlayer = async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
        } = await initShortGame();
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
        console.log("cranked once");
        for (let i = 0; i < 100; i++) {
          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );
          await doCrank(
            gameMasterAccountKp,
            gameAccountPublicKey,
            boardAccountPublicKey
          );
          console.log(`cranked ${i + 2} times out of 101`);
        }
        return {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          firstPlayerAccountKp,
        };
      };
      it("fails crank if payment is due", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
        } = await getDisbursableStateWithMaxTxPlayersInShortGame();

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
        ).to.be.rejectedWith(anchor.AnchorError, "CannotCrankWhenPaymentDue");
      });
      it("fails crank if before next crank time", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayers(() => initMediumGame());
        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
        );

        await expect(
          doCrank(
            gameMasterAccountKp,
            gameAccountPublicKey,
            boardAccountPublicKey
          )
        ).to.be.rejectedWith(
          anchor.AnchorError,
          "CrankNotAllowedBeforeNextCrankTime"
        );
      });
      it("updates next crank time with each crank", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayersInOneSecGame();
        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        const { crankTxConfirmation } = await doCrank(
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey
        );

        const txTime = await program.provider.connection.getBlockTime(
          crankTxConfirmation.context.slot
        );
        const fetchedGameAccount =
          await program.account.game.fetch(gameAccountPublicKey);
        expect(
          fetchedGameAccount.state.active?.nextCrank
        ).to.be.a.bignumber.that.is.eq(new anchor.BN(txTime + 1));
      });
      it("emits crank event for subsequent crank", async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts,
        } = await getDisbursableStateWithMaxTxPlayersInOneSecGame();
        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          remainingAccounts
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
        const listener = program.addEventListener(
          "GameStateChanged",
          eventListenerSpy
        );

        await doCrank(
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(listener);
        expect(eventListenerSpy).to.have.been.called();
        const fetchedGameAccount =
          await program.account.game.fetch(gameAccountPublicKey);
        expect(nextCrankTimeFromEvent).to.be.a.bignumber.that.is.eql(
          fetchedGameAccount.state.active?.nextCrank
        );
      });
      describe("Finishing", () => {
        it("stops disbursements when we run out of money in the pot", async () => {
          const {
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            firstPlayerAccountKp,
          } = await getTo101thCrankWithOnePlayer();
          const gameMasterStartingBalance =
            await program.provider.connection.getBalance(
              gameMasterAccountKp.publicKey
            );
          const firstPlayerStartingBalance =
            await program.provider.connection.getBalance(
              firstPlayerAccountKp.publicKey
            );

          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );

          expect(
            await program.provider.connection.getBalance(
              gameMasterAccountKp.publicKey
            )
          ).to.be.eq(gameMasterStartingBalance);

          expect(
            await program.provider.connection.getBalance(
              firstPlayerAccountKp.publicKey
            )
          ).to.be.eq(firstPlayerStartingBalance);
        });
        it("changes state to closed when we run out of money in the pot", async () => {
          const {
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            firstPlayerAccountKp,
          } = await getTo101thCrankWithOnePlayer();
          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );
          const fetchedGameAccount =
            await program.account.game.fetch(gameAccountPublicKey);
          expect(fetchedGameAccount.state).to.eql({ closed: {} });
        });
        it("emits closed event", async () => {
          const {
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            firstPlayerAccountKp,
          } = await getTo101thCrankWithOnePlayer();
          const expectOnEvent = (e: unknown) => {
            expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
            expect(e).to.have.property("state").and.to.eql({ closed: {} });
          };
          const eventListenerSpy = chai.spy(expectOnEvent);
          const listener = program.addEventListener(
            "GameStateChanged",
            eventListenerSpy
          );
          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );

          await new Promise((resolve) => setTimeout(resolve, 2000));
          program.removeEventListener(listener);
          expect(eventListenerSpy).to.have.been.called();
        });
        it("it does not allow new players to join", async () => {
          const {
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            firstPlayerAccountKp,
          } = await getTo101thCrankWithOnePlayer();
          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );
          const someOtherAccountKp = new web3.Keypair();
          await expect(
            doPlayerRequestHotPotato(
              gameAccountPublicKey,
              boardAccountPublicKey,
              someOtherAccountKp
            )
          ).to.be.rejectedWith(Error, "GameClosed");
        });
        it("allows for game master to take out the game master money", async () => {
          const {
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            firstPlayerAccountKp,
          } = await getTo101thCrankWithOnePlayer();
          const gameMasterStartingBalance =
            await program.provider.connection.getBalance(
              gameMasterAccountKp.publicKey
            );
          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );

          await program.methods
            .withdrawRemainingFunds()
            .accounts({
              game: gameAccountPublicKey,
              board: boardAccountPublicKey,
              gameMaster: gameMasterAccountKp.publicKey,
            })
            .signers([gameMasterAccountKp])
            .rpc();

          const gameMasterEndingBalance =
            await program.provider.connection.getBalance(
              gameMasterAccountKp.publicKey
            );
          const boardRentExemptAmount =
            await program.provider.connection.getMinimumBalanceForRentExemption(
              program.account.board.size
            );
          const gameRentExemptAmount =
            await program.provider.connection.getMinimumBalanceForRentExemption(
              program.account.game.size
            );
          expect(gameMasterEndingBalance).to.be.greaterThanOrEqual(
            gameMasterStartingBalance +
              gameRentExemptAmount +
              boardRentExemptAmount
          );
        });
      });
      it(`disburses up to max number of turns and then
       allows other to take spot`, async () => {
        const {
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          firstPlayerAccountKp,
        } = await getTo101thCrankWithOnePlayer(); // 100 disbursements already
        let numTimesFirstPlayerDisbursed = 101;
        const expectOnEvent = (e: unknown) => {
          console.log("AYO IS IT FAILING HERE?");
          expect(e).to.have.property("game").and.to.eql(gameAccountPublicKey);
          console.log("NO");
          expect(e).to.have.property("player");
          expect(e)
            .to.have.property("amount")
            .and.to.be.a.bignumber.that.is.eq(new anchor.BN(returnPerTurn));
          if (firstPlayerAccountKp.publicKey.equals((e as any).player)) {
            expect(e)
              .to.have.property("turn")
              .and.to.eql(numTimesFirstPlayerDisbursed);
            numTimesFirstPlayerDisbursed += 1;
          }
        };
        const eventListenerSpy = chai.spy(expectOnEvent);
        const listener = program.addEventListener(
          "PotatoHolderPaid",
          eventListenerSpy
        );
        const secondPlayerKp = new web3.Keypair();
        await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          secondPlayerKp
        );
        // We know that the first player went through the same
        // initialization steps, so we assume it has the same
        // balance at this point.
        const playerBalanceAfterRequestingHotPotato =
          await program.provider.connection.getBalance(
            secondPlayerKp.publicKey
          );
        await doDisbursement(
          gameAccountPublicKey,
          boardAccountPublicKey,
          gameMasterAccountKp,
          [
            {
              pubkey: firstPlayerAccountKp.publicKey,
              isSigner: false,
              isWritable: true,
            },
          ]
        );
        for (let i = 0; i < 49; i++) {
          await doCrank(
            gameMasterAccountKp,
            gameAccountPublicKey,
            boardAccountPublicKey
          );
          await doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: secondPlayerKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          );
          console.log(`cranked + disbursed ${102 + i} of 150`);
        }

        await doCrank(
          gameMasterAccountKp,
          gameAccountPublicKey,
          boardAccountPublicKey
        );

        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: firstPlayerAccountKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: secondPlayerKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          )
        ).to.be.eventually.rejectedWith(
          anchor.AnchorError,
          "PlayerSlotMismatch"
        );
        await expect(
          doDisbursement(
            gameAccountPublicKey,
            boardAccountPublicKey,
            gameMasterAccountKp,
            [
              {
                pubkey: secondPlayerKp.publicKey,
                isSigner: false,
                isWritable: true,
              },
            ]
          )
        ).to.eventually.be.ok;
        const firstPlayerEndingBalance =
          await program.provider.connection.getBalance(
            firstPlayerAccountKp.publicKey
          );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        program.removeEventListener(listener);
        expect(eventListenerSpy).to.have.been.called.exactly(100);
        expect(firstPlayerEndingBalance).to.be.eql(
          playerBalanceAfterRequestingHotPotato + MaxNumTurns * returnPerTurn
        );

        const expectedEmptySlots = MaxNumPlayers - 1; // Since player two is still in the game.
        const { chunkedPlayerAccountKps } =
          makeAndChunkPlayerAccountsFor(expectedEmptySlots);
        let counter = 0;
        for (const chunk of chunkedPlayerAccountKps) {
          await expect(
            Promise.all(
              chunk.map((playerAccountKp) =>
                doPlayerRequestHotPotato(
                  gameAccountPublicKey,
                  boardAccountPublicKey,
                  playerAccountKp
                )
              )
            )
          ).to.eventually.be.ok;
          console.log(
            `Chunk ${counter + 1} of ${chunkedPlayerAccountKps.length}`
          );
          counter++;
        }
      });
    });
    describe("Affiliate link", async () => {
      it("saves affiliate");
      it("it splits program fee with affiliate link");
    });
  });
  describe("Game master taking money out", async () => {
    it("Only allows game master to take money", async () => {
      const { gameAccountPublicKey, boardAccountKp, gameMasterAccountKp } =
        await initLongGame();
      const someOtherAccountKp = new web3.Keypair();
      await expect(
        program.methods
          .withdrawRemainingFunds()
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountKp.publicKey,
            gameMaster: someOtherAccountKp.publicKey,
          })
          .signers([someOtherAccountKp])
          .rpc()
      ).to.be.rejectedWith(anchor.AnchorError, "NotGameMaster");
    });
    it("Checks that game and board match", async () => {
      const { gameAccountPublicKey, gameMasterAccountKp } =
        await initLongGame();
      const { boardAccountPublicKey: someOtherBoardAccountPublicKey } =
        await initLongGame();
      await expect(
        program.methods
          .withdrawRemainingFunds()
          .accounts({
            game: gameAccountPublicKey,
            board: someOtherBoardAccountPublicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .rpc()
      ).to.be.rejectedWith(anchor.AnchorError, "BoardMismatch");
    });
    it("Allows for game master to take money out during pending and not staging or active", async () => {
      const { gameAccountPublicKey, boardAccountKp, gameMasterAccountKp } =
        await initLongGame();
      await expect(
        program.methods
          .withdrawRemainingFunds()
          .accounts({
            game: gameAccountPublicKey,
            board: boardAccountKp.publicKey,
            gameMaster: gameMasterAccountKp.publicKey,
          })
          .signers([gameMasterAccountKp])
          .rpc()
      ).to.eventually.be.ok;

      const {
        gameAccountPublicKey: gameAccountPublicKey0,
        boardAccountKp: boardAccountKp0,
        gameMasterAccountKp: gameMasterAccountKp0,
      } = await initShortGame();
      const firstPlayerAccountKp = new web3.Keypair();
      await doPlayerRequestHotPotato(
        gameAccountPublicKey0,
        boardAccountKp0.publicKey,
        firstPlayerAccountKp
      );
      await expect(
        program.methods
          .withdrawRemainingFunds()
          .accounts({
            game: gameAccountPublicKey0,
            board: boardAccountKp0.publicKey,
            gameMaster: gameMasterAccountKp0.publicKey,
          })
          .signers([gameMasterAccountKp0])
          .rpc()
      ).to.be.rejectedWith(anchor.AnchorError, "ProhibitedInPendingOrActive");
      doCrank(
        gameMasterAccountKp0,
        gameAccountPublicKey0,
        boardAccountKp0.publicKey
      );
      await expect(
        program.methods
          .withdrawRemainingFunds()
          .accounts({
            game: gameAccountPublicKey0,
            board: boardAccountKp0.publicKey,
            gameMaster: gameMasterAccountKp0.publicKey,
          })
          .signers([gameMasterAccountKp0])
          .rpc()
      ).to.be.rejectedWith(anchor.AnchorError, "ProhibitedInPendingOrActive");
    });
  });
});
function makeAndChunkPlayerAccountsFor(MaxNumPlayers: number) {
  const playerAccountKps = Array.from({ length: MaxNumPlayers }, () => {
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
  return { chunkedPlayerAccountKps, playerAccountKps };
}
