use anchor_lang::prelude::*;
use anchor_lang::system_program::transfer;
use anchor_lang::system_program::Transfer;
use solana_program::sysvar::clock::Clock;
use std::{ops::Add, vec::Vec};

use anchor_lang::error_code;

#[error_code]
pub enum HotPotatoError {
    NotGameMaster,
    CannotCrankWhilePending,
    GameMasterCannotPlay,
    BelowTicketEntryMinimum,
    BoardMismatch,
    CrankNotAllowedBeforeStagingEnds,
    BoardFull,
}

mod constants {
    pub const NUM_TURNS: u64 = 150;
    pub const NONUNIQUE_POTATO_HOLDERS_MAX: u64 = 10_000;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub enum GameState {
    Pending,
    Staging { ending: i64 },
    /*
    Active {
        round: u64,
    },
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
    pub turn_number: u64, // 8 bytes
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
        (self.tail + 1) % constants::NONUNIQUE_POTATO_HOLDERS_MAX
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
}

#[account]
pub struct Game {
    pub staging_period_length: i64, // 8 bytes
    pub turn_period_length: i64,    // 8 bytes
    pub minimum_ticket_entry: u64,  // 8 bytes
    pub state: GameState,           // 16 byte
    pub game_master: Pubkey,        // 32 bytes
    pub board: Pubkey,              // 32 bytes
}

impl Game {
    pub const SIZE: usize = 8 + 8 + 8 + 16 + 32 + 32;

    pub fn request_hot_potato<F0, F1>(
        &mut self,
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
                turn_amount: ticket_entry / constants::NUM_TURNS,
            })?;
            msg!("Player {} joined with {}", player, ticket_entry);
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
                msg!("Game is now in staging mode");
            }
            _ => {
                give_player_hot_potato()?;
            }
        }

        Ok(())
    }
    pub fn crank(&mut self) -> Result<()> {
        require!(
            self.state != GameState::Pending,
            HotPotatoError::CannotCrankWhilePending
        );
        match self.state {
            GameState::Staging { ending } => {
                require!(
                    Clock::get()
                        .expect("No system clock time")
                        .unix_timestamp
                        .ge(&ending),
                    HotPotatoError::CrankNotAllowedBeforeStagingEnds
                );
                self.state = GameState::Pending;
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
    ) -> Result<()> {
        *ctx.accounts.new_game = Game {
            game_master: *ctx.accounts.game_master.key,
            board: *ctx.accounts.new_board.to_account_info().key,
            state: GameState::Pending,
            staging_period_length,
            turn_period_length,
            minimum_ticket_entry,
        };
        ctx.accounts.new_board.load_init()?.owning_game_key =
            *ctx.accounts.new_game.to_account_info().key;
        msg!("Game initialized and is now pending");
        Ok(())
    }

    pub fn crank(ctx: Context<Crank>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require_keys_eq!(
            game.game_master,
            ctx.accounts.game_master.key(),
            HotPotatoError::NotGameMaster
        );

        game.crank()?;
        Ok(())
    }

    pub fn request_hot_potato(ctx: Context<RequestHotPotato>, ticket_entry: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
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
        let chump_change = ticket_entry % constants::NUM_TURNS;
        let actual_ticket_entry = ticket_entry - chump_change;
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
            &player.key(),
            actual_ticket_entry,
            Box::new(charge_ticket_entry),
            Box::new(push_potato_holding_information),
        )
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
        @ HotPotatoError::BoardMismatch)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub board: AccountLoader<'info, Board>,
    #[account(signer)]
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
    #[account(mut, signer)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}
