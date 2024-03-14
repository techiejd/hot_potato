use anchor_lang::prelude::*;
use std::vec::Vec;

use anchor_lang::error_code;

#[error_code]
pub enum HotPotatoError {
    NotGameMaster,
    CannotCrankWhilePending,
    GameMasterCannotPlay,
    InsufficientFunds,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameState {
    Pending,
    /*
    Staging {
        start_time: u64,
    },
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct Turn {
    pub player: Pubkey,
    pub turn_number: u8,
}

#[account]
pub struct Game {
    pub game_master: Pubkey,        // 32 bytes
    pub board: Option<Vec<Turn>>,   // 25 bytes
    pub state: GameState,           // 1 byte
    pub staging_period_length: u64, // 8 bytes
    pub turn_period_length: u64,    // 8 bytes
    pub minimum_ticket_entry: u64,  // 8 bytes
}

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("9Y9Fcs7ixpxYYDdWZTKtXyEWJiUmDPmWPLsAT6bYvE4a");

#[program]
mod hot_potato {
    use super::*;
    pub fn initialize(
        ctx: Context<InitializeGame>,
        staging_period_length: u64,
        turn_period_length: u64,
        minimum_ticket_entry: u64,
    ) -> Result<()> {
        *ctx.accounts.new_game = Game {
            game_master: *ctx.accounts.game_master.key,
            board: Some(Vec::new()),
            state: GameState::Pending,
            staging_period_length,
            turn_period_length,
            minimum_ticket_entry,
        };
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

        require!(
            game.state != GameState::Pending,
            HotPotatoError::CannotCrankWhilePending
        );

        //game.crank();
        Ok(())
    }

    pub fn request_hot_potato(ctx: Context<RequestHotPotato>, ticket_entry: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require_keys_neq!(
            game.game_master,
            ctx.accounts.player.key(),
            HotPotatoError::GameMasterCannotPlay
        );
        require_gt!(
            ticket_entry,
            game.minimum_ticket_entry,
            HotPotatoError::InsufficientFunds
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(init, seeds=[game_master.key().as_ref()], bump, payer = game_master, space = 8 + 82)]
    pub new_game: Account<'info, Game>,
    #[account(mut)]
    pub game_master: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Crank<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(signer)]
    pub game_master: Signer<'info>,
}

#[derive(Accounts)]
pub struct RequestHotPotato<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(signer)]
    pub player: Signer<'info>,
}

/*
// Make this a pda so we can know who is already playing
pub struct ParticipationToken {
    pub player: Pubkey,
    // Is this really necessary or can we do it with msgs?
    pub entry_amount: Lamports,
    pub entered_round: u64,
    pub exited_round: u64,
}

pub fn play(ctx: Context<Play>, tile: Tile) -> Result<()> {
    let game = &mut ctx.accounts.game;

    require_keys_eq!(
        game.current_player(),
        ctx.accounts.player.key(),
        TicTacToeError::NotPlayersTurn
    );

    game.play(&tile)
}*/
