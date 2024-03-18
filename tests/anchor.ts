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
      .and.to.be.a.bignumber.that.is.eq(expected.turnNumber);
    expect(holder)
      .to.have.property("turnAmount")
      .and.to.be.a.bignumber.that.is.eq(expected.turnAmount);
  };
  const expectEmptyBoardSlot = (holder: PotatoHolder) => {
    const emptyBoardSlot = {
      player: web3.SystemProgram.programId,
      turnNumber: bigNumZero,
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
      .initialize(stagingPeriodLength, turnPeriodLength, minimumTicketEntry)
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
    const refetchedGameAccount =
      await program.account.game.fetch(gameAccountPublicKey);
    const refetchedboardAccount = await program.account.board.fetch(
      refetchedGameAccount.board
    );
    return {
      playerRequestsHotPotatoTxHash,
      playerRequestsHotPotatoTxConfirmation,
      refetchedGameAccount,
      refetchedboardAccount,
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
          .initialize(oneDay, oneHour, minimumTicketEntry)
          .accounts({
            newGame: failingGameAccountPublicKey0,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry)
          .accounts({
            newGame: failingGameAccountPublicKey1,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry)
          .accounts({
            newGame: failingGameAccountPublicKey2,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry)
          .accounts({
            newGame: failingGameAccountPublicKey3,
            ...restOfAccounts,
          })
          .signers([gameMasterAccountKp, boardAccountKp])
          .rpc()
      ).to.be.rejectedWith(Error, "ConstraintSeeds");
      await expect(
        program.methods
          .initialize(oneDay, oneHour, minimumTicketEntry)
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
  });

  describe("Initializing", async () => {
    let gameMasterAccountKp: web3.Keypair;
    let boardAccountPublicKey: web3.PublicKey;
    let gameAccount: GameAccount;
    let boardAccount: BoardAccount;
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
    const amountWithoutChumpChange =
      minimumTicketEntry.toNumber() -
      (minimumTicketEntry.toNumber() % NumTurns);
    const expectInitializedBoardSlot = (
      holder: PotatoHolder,
      player: web3.PublicKey
    ) => {
      const initializedBoardSlot = {
        player,
        turnNumber: bigNumZero,
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
          refetchedGameAccount,
        } = await doPlayerRequestHotPotato(
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

        const { playerRequestsHotPotatoTxHash: firstPlayerJoinsTxHash } =
          await doPlayerRequestHotPotato(
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
      it("logs player joining and amount", async () => {
        const { gameAccountPublicKey, boardAccountPublicKey } =
          await initLongGame();
        const firstPlayerAccountKp = new web3.Keypair();

        const { playerRequestsHotPotatoTxHash: firstPlayerJoinsTxHash } =
          await doPlayerRequestHotPotato(
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

        const { refetchedboardAccount } = await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
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
        const { refetchedboardAccount } = await doPlayerRequestHotPotato(
          gameAccountPublicKey,
          boardAccountPublicKey,
          firstPlayerAccountKp
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
    /*it("allows for up to 10_000 players to join", async () => {
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
    });*/
    describe("First crank", async () => {
      it("changes status to active with next crank time");
      it("sends SOL to first player and program fee to game master");
    });
    describe("Subsequent cranks", async () => {
      it("updates next crank time");
      it("gives sol until they finished holding a potato");
    });
    describe("Affiliate link", async () => {
      it("saves affiliate");
      it("it splits program fee with affiliate link");
    });
  });

  describe("Finishing", () => {
    it("changes state to closing");
    it("logs state change to closing");
    it("it does not allow new players to join");
    it("allows for game master to take out the game master money");
  });
  it(
    `gives up to 150% - (program fee)% throughout the game, 
    pops out the winner, allows up to 10_000 to join and then closes 
    when no more money`
  );
});
