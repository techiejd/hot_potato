use anchor_lang::prelude::*;
use anchor_lang::system_program::transfer;
use anchor_lang::system_program::Transfer;
use solana_program::sysvar::clock::Clock;
use std::{ops::Add, vec::Vec};

use anchor_lang::error_code;
use std::result::Result::Ok;

#[event]
pub struct GameInitialized {
    pub game_master: Pubkey,
    pub game: Pubkey,
    pub board: Pubkey,
}

#[event]
pub struct GameStateChanged {
    pub game: Pubkey,
    pub state: GameState,
}

#[event]
pub struct PotatoReceived {
    pub game: Pubkey,
    pub player: Pubkey,
    pub ticket_entry_amount: u64,
}


#[error_code]
pub enum HotPotatoError {
    NotGameMaster,
    CannotCrankWhilePending,
    GameMasterCannotPlay,
    BelowTicketEntryMinimum,
    BoardMismatch,
    BoardFull,
    CrankNotAllowedBeforeStagingEnds,
    CrankNotAllowedBeforeNextCrankTime,
    ImpossibleProgramFee,
}

mod utils {
    pub const NUM_TURNS: u64 = 150;
    pub const NONUNIQUE_POTATO_HOLDERS_MAX: u64 = 10_000;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub enum GameState {
    Pending,
    Staging { ending: i64 },
    Active {
        next_crank: i64,
    },
    /*
    Closed {
        holding_potatoes: [Pubkey],
        holding_stars: [PubKey],
        end_time: u64,
    },
     */
}

#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, Debug, Copy, bytemuck::Pod, bytemuck::Zeroable,
)]
#[repr(C)]
pub struct PotatoHoldingInformation {
    pub player: Pubkey,   // 32 bytes
    pub turn_number: u32, // 4 bytes, have to use half word even though u8 would do because of zero copy repr(C)
    pub pay_outs_due: u32, // 4 bytes
    pub turn_amount: u64, // 8 bytes
}

#[account(zero_copy)]
#[repr(C)]
pub struct Board {
    full: u64,                                         // 8 bytes
    head: u64,                                          // 8 bytes
    tail: u64,                                          // 8 bytes
    pub owning_game_key: Pubkey,                        // 32 bytes
    potato_holders: [PotatoHoldingInformation; 10_000], // 480_000 bytes. There's a parsing bug which is why we don't use constants::NONUNIQUE_POTATO_HOLDERS_MAX
}

impl Board {
    fn next_tail(&self) -> u64 {
        (self.tail + 1) % utils::NONUNIQUE_POTATO_HOLDERS_MAX
    }
    pub fn push(&mut self, potato_holding_information: PotatoHoldingInformation) -> Result<()> {
        // This function adds a potato holding information to the end of the board in a round-robin fashion
        require_neq!(self.full, 1, HotPotatoError::BoardFull);
        self.potato_holders[self.tail as usize] = potato_holding_information;
        self.tail = self.next_tail();
        if self.tail == self.head {
            self.full = 1;
        }
        Ok(())
    }

    pub fn crank(&mut self) -> Result<()> {
        Ok(())
    }
}

#[account]
pub struct Game {
    pub staging_period_length: i64, // 8 bytes
    pub turn_period_length: i64,    // 8 bytes
    pub minimum_ticket_entry: u64,  // 8 bytes
    pub permille_program_fee: u16,  // 2 bytes but 8 bytes with padding
    pub state: GameState,           // 16 byte
    pub game_master: Pubkey,        // 32 bytes
    pub board: Pubkey,              // 32 bytes
}

impl Game {
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 16 + 32 + 32;

    fn set_state_active_with_next_crank_given(&mut self, current_time: i64, for_game: &Pubkey) {
        self.state = GameState::Active {
            next_crank: current_time.add(self.turn_period_length),
        };
        emit!(GameStateChanged {
            game: *for_game,
            state: self.state,
        });
    }

    pub fn request_hot_potato<F0, F1>(
        &mut self,
        for_game: &Pubkey,
        player: &Pubkey,
        ticket_entry: u64,
        charge_ticket_entry: Box<F0>,
        push_potato_holding_information: Box<F1>,
    ) -> Result<()>
    where
        F0: FnOnce() -> Result<()>,
        F1: FnOnce(PotatoHoldingInformation) -> Result<()>,
    {
        let give_player_hot_potato = || -> Result<()> {
            charge_ticket_entry()?;
            push_potato_holding_information(PotatoHoldingInformation {
                player: *player,
                turn_number: 0,
                pay_outs_due: 0,
                turn_amount: ticket_entry / utils::NUM_TURNS,
            })?;
            emit!(PotatoReceived {
                game: *for_game,
                player: *player,
                ticket_entry_amount: ticket_entry,
            });
            Ok(())
        };
        match self.state {
            GameState::Pending => {
                give_player_hot_potato()?;
                self.state = GameState::Staging {
                    ending: Clock::get()
                        .expect("No system clock time")
                        .unix_timestamp
                        .add(self.staging_period_length),
                };
                emit!(GameStateChanged {
                    game: *for_game,
                    state: self.state,
                });
            }
            _ => {
                give_player_hot_potato()?;
            }
        }

        Ok(())
    }
    pub fn crank(&mut self, for_game: &Pubkey) -> Result<()> {
        require!(
            self.state != GameState::Pending,
            HotPotatoError::CannotCrankWhilePending
        );
        let current_time = Clock::get().expect("No system clock time").unix_timestamp;
        match self.state {
            GameState::Staging { ending } => {
                require!(
                    current_time.ge(&ending),
                    HotPotatoError::CrankNotAllowedBeforeStagingEnds
                );
                self.set_state_active_with_next_crank_given(current_time, for_game);
            }
            GameState::Active { next_crank } => {
                require!(
                    current_time.ge(&next_crank),
                    HotPotatoError::CrankNotAllowedBeforeNextCrankTime
                );
                self.set_state_active_with_next_crank_given(current_time, for_game);
            }
            _ => {}
        }
        Ok(())
    }
}

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("9Y9Fcs7ixpxYYDdWZTKtXyEWJiUmDPmWPLsAT6bYvE4a");

#[program]
mod hot_potato {
    use super::*;
    pub fn initialize(
        ctx: Context<InitializeGame>,
        staging_period_length: i64,
        turn_period_length: i64,
        minimum_ticket_entry: u64,
        permille_program_fee: u16,
    ) -> Result<()> {
        require_gte!(
            1_000,
            permille_program_fee,
            HotPotatoError::ImpossibleProgramFee
        );
        *ctx.accounts.new_game = Game {
            game_master: *ctx.accounts.game_master.key,
            board: *ctx.accounts.new_board.to_account_info().key,
            permille_program_fee,
            state: GameState::Pending,
            staging_period_length,
            turn_period_length,
            minimum_ticket_entry,
        };
        ctx.accounts.new_board.load_init()?.owning_game_key =
            *ctx.accounts.new_game.to_account_info().key;
        emit!(GameInitialized {
            game_master: *ctx.accounts.game_master.key,
            game: *ctx.accounts.new_game.to_account_info().key,
            board: *ctx.accounts.new_board.to_account_info().key,
        });
        Ok(())
    }

    pub fn crank(ctx: Context<Crank>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let board = &mut ctx.accounts.board.load_mut()?;
        let for_game = game.to_account_info().key();

        game.crank(&for_game)?;
        board.crank()?;
        Ok(())
    }

    pub fn request_hot_potato(ctx: Context<RequestHotPotato>, ticket_entry: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let for_game = game.to_account_info().key();
        let game_account_info = game.to_account_info().clone();
        let player = &ctx.accounts.player;
        let board = &mut ctx.accounts.board.load_mut()?;
        require_keys_neq!(
            game.game_master,
            player.key(),
            HotPotatoError::GameMasterCannotPlay
        );
        require_gte!(
            ticket_entry,
            game.minimum_ticket_entry,
            HotPotatoError::BelowTicketEntryMinimum
        );
        let calculate_portion_per_turn = |permille: u16| -> u64 {
            ((ticket_entry * permille as u64) / 1000) / utils::NUM_TURNS
        };
        let actual_ticket_entry = utils::NUM_TURNS * (calculate_portion_per_turn( game.permille_program_fee) + calculate_portion_per_turn(1000 - game.permille_program_fee));
        let charge_ticket_entry = || {
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: player.to_account_info().clone(),
                    to: game_account_info,
                },
            );
            transfer(cpi_context, actual_ticket_entry)
        };
        let push_potato_holding_information =
            |potato_holding_information: PotatoHoldingInformation| {
                board.push(potato_holding_information)
            };
        game.request_hot_potato(
            &for_game,
            &player.key(),
            actual_ticket_entry,
            Box::new(charge_ticket_entry),
            Box::new(push_potato_holding_information),
        )
    }

    pub fn disburse_to_potato_holders(ctx: Context<DisburseToPotatoHolders>) -> Result<()> {
        /*let game = &mut ctx.accounts.game;
        let board = &mut ctx.accounts.board.load_mut()?;
        let for_game = game.to_account_info().key();
        require_keys_eq!(
            game.game_master,
            ctx.accounts.game_master.key(),
            HotPotatoError::NotGameMaster
        );*/
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(init, seeds=[new_board.key().as_ref(), game_master.key().as_ref()], bump, payer = game_master, space = 8 + Game::SIZE)]
    pub new_game: Account<'info, Game>,
    #[account(zero, constraint = new_board.to_account_info().key() == board_as_signer.to_account_info().key())]
    pub new_board: AccountLoader<'info, Board>,
    #[account(mut)]
    pub game_master: Signer<'info>,
    pub board_as_signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Crank<'info> {
    #[account(mut,
        constraint = 
        game.board == board.to_account_info().key()
        @ HotPotatoError::BoardMismatch,
        constraint = 
        game.game_master == game_master.to_account_info().key()
        @ HotPotatoError::NotGameMaster)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub board: AccountLoader<'info, Board>,
    pub game_master: Signer<'info>,
}

#[derive(Accounts)]
pub struct RequestHotPotato<'info> {
    #[account(mut,
        constraint = 
        game.board == board.to_account_info().key()
        @ HotPotatoError::BoardMismatch)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub board: AccountLoader<'info, Board>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DisburseToPotatoHolders<'info> {
    #[account(constraint = 
        game.board == board.to_account_info().key()
        @ HotPotatoError::BoardMismatch,
        constraint = 
        game.game_master == game_master.to_account_info().key()
        @ HotPotatoError::NotGameMaster)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub board: AccountLoader<'info, Board>,
    pub game_master: Signer<'info>,
    pub system_program: Program<'info, System>,
}
