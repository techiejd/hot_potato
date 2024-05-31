export type HotPotato = {
  "version": "0.1.0",
  "name": "hot_potato",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "newGame",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newBoard",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "boardAsSigner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stagingPeriodLength",
          "type": "i64"
        },
        {
          "name": "turnPeriodLength",
          "type": "i64"
        },
        {
          "name": "minimumTicketEntry",
          "type": "u64"
        },
        {
          "name": "permilleProgramFee",
          "type": "u16"
        }
      ]
    },
    {
      "name": "crank",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "requestHotPotato",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ticketEntry",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disburseToPotatoHolders",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "offset",
          "type": "u16"
        }
      ]
    },
    {
      "name": "withdrawRemainingFunds",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "board",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "full",
            "type": "u64"
          },
          {
            "name": "head",
            "type": "u64"
          },
          {
            "name": "tail",
            "type": "u64"
          },
          {
            "name": "owningGameKey",
            "type": "publicKey"
          },
          {
            "name": "potatoHolders",
            "type": {
              "array": [
                {
                  "defined": "PotatoHoldingInformation"
                },
                10000
              ]
            }
          }
        ]
      }
    },
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pot",
            "type": "u64"
          },
          {
            "name": "stagingPeriodLength",
            "type": "i64"
          },
          {
            "name": "turnPeriodLength",
            "type": "i64"
          },
          {
            "name": "minimumTicketEntry",
            "type": "u64"
          },
          {
            "name": "permilleProgramFee",
            "type": "u16"
          },
          {
            "name": "state",
            "type": {
              "defined": "GameState"
            }
          },
          {
            "name": "gameMaster",
            "type": "publicKey"
          },
          {
            "name": "board",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "PotatoHoldingInformation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "publicKey"
          },
          {
            "name": "turnNumber",
            "type": "u32"
          },
          {
            "name": "paymentPending",
            "type": "u32"
          },
          {
            "name": "turnAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "GameState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Staging",
            "fields": [
              {
                "name": "ending",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Active",
            "fields": [
              {
                "name": "nextCrank",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Closed"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "GameInitialized",
      "fields": [
        {
          "name": "gameMaster",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "board",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "GameStateChanged",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "state",
          "type": {
            "defined": "GameState"
          },
          "index": false
        }
      ]
    },
    {
      "name": "PotatoReceived",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "player",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "ticketEntryAmount",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "PotatoHolderPaid",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "player",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "turn",
          "type": "u32",
          "index": false
        }
      ]
    },
    {
      "name": "GameMasterPaid",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotGameMaster"
    },
    {
      "code": 6001,
      "name": "CannotCrankWhilePending"
    },
    {
      "code": 6002,
      "name": "GameMasterCannotPlay"
    },
    {
      "code": 6003,
      "name": "BelowTicketEntryMinimum"
    },
    {
      "code": 6004,
      "name": "BoardMismatch"
    },
    {
      "code": 6005,
      "name": "BoardFull"
    },
    {
      "code": 6006,
      "name": "CrankNotAllowedBeforeStagingEnds"
    },
    {
      "code": 6007,
      "name": "CrankNotAllowedBeforeNextCrankTime"
    },
    {
      "code": 6008,
      "name": "ImpossibleProgramFee"
    },
    {
      "code": 6009,
      "name": "PlayerSlotMismatch"
    },
    {
      "code": 6010,
      "name": "CannotDisburseWhenNotActive"
    },
    {
      "code": 6011,
      "name": "TriedToDisburseToNotPendingPayment"
    },
    {
      "code": 6012,
      "name": "CannotCrankWhenPaymentDue"
    },
    {
      "code": 6013,
      "name": "GameClosed"
    },
    {
      "code": 6014,
      "name": "ProhibitedInPendingOrActive"
    }
  ]
};

export const IDL: HotPotato = {
  "version": "0.1.0",
  "name": "hot_potato",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "newGame",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "newBoard",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "boardAsSigner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "stagingPeriodLength",
          "type": "i64"
        },
        {
          "name": "turnPeriodLength",
          "type": "i64"
        },
        {
          "name": "minimumTicketEntry",
          "type": "u64"
        },
        {
          "name": "permilleProgramFee",
          "type": "u16"
        }
      ]
    },
    {
      "name": "crank",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "requestHotPotato",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "player",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ticketEntry",
          "type": "u64"
        }
      ]
    },
    {
      "name": "disburseToPotatoHolders",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "offset",
          "type": "u16"
        }
      ]
    },
    {
      "name": "withdrawRemainingFunds",
      "accounts": [
        {
          "name": "game",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "board",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "gameMaster",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "board",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "full",
            "type": "u64"
          },
          {
            "name": "head",
            "type": "u64"
          },
          {
            "name": "tail",
            "type": "u64"
          },
          {
            "name": "owningGameKey",
            "type": "publicKey"
          },
          {
            "name": "potatoHolders",
            "type": {
              "array": [
                {
                  "defined": "PotatoHoldingInformation"
                },
                10000
              ]
            }
          }
        ]
      }
    },
    {
      "name": "game",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pot",
            "type": "u64"
          },
          {
            "name": "stagingPeriodLength",
            "type": "i64"
          },
          {
            "name": "turnPeriodLength",
            "type": "i64"
          },
          {
            "name": "minimumTicketEntry",
            "type": "u64"
          },
          {
            "name": "permilleProgramFee",
            "type": "u16"
          },
          {
            "name": "state",
            "type": {
              "defined": "GameState"
            }
          },
          {
            "name": "gameMaster",
            "type": "publicKey"
          },
          {
            "name": "board",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "PotatoHoldingInformation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "publicKey"
          },
          {
            "name": "turnNumber",
            "type": "u32"
          },
          {
            "name": "paymentPending",
            "type": "u32"
          },
          {
            "name": "turnAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "GameState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Staging",
            "fields": [
              {
                "name": "ending",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Active",
            "fields": [
              {
                "name": "nextCrank",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Closed"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "GameInitialized",
      "fields": [
        {
          "name": "gameMaster",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "board",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "GameStateChanged",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "state",
          "type": {
            "defined": "GameState"
          },
          "index": false
        }
      ]
    },
    {
      "name": "PotatoReceived",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "player",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "ticketEntryAmount",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "PotatoHolderPaid",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "player",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        },
        {
          "name": "turn",
          "type": "u32",
          "index": false
        }
      ]
    },
    {
      "name": "GameMasterPaid",
      "fields": [
        {
          "name": "game",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotGameMaster"
    },
    {
      "code": 6001,
      "name": "CannotCrankWhilePending"
    },
    {
      "code": 6002,
      "name": "GameMasterCannotPlay"
    },
    {
      "code": 6003,
      "name": "BelowTicketEntryMinimum"
    },
    {
      "code": 6004,
      "name": "BoardMismatch"
    },
    {
      "code": 6005,
      "name": "BoardFull"
    },
    {
      "code": 6006,
      "name": "CrankNotAllowedBeforeStagingEnds"
    },
    {
      "code": 6007,
      "name": "CrankNotAllowedBeforeNextCrankTime"
    },
    {
      "code": 6008,
      "name": "ImpossibleProgramFee"
    },
    {
      "code": 6009,
      "name": "PlayerSlotMismatch"
    },
    {
      "code": 6010,
      "name": "CannotDisburseWhenNotActive"
    },
    {
      "code": 6011,
      "name": "TriedToDisburseToNotPendingPayment"
    },
    {
      "code": 6012,
      "name": "CannotCrankWhenPaymentDue"
    },
    {
      "code": 6013,
      "name": "GameClosed"
    },
    {
      "code": 6014,
      "name": "ProhibitedInPendingOrActive"
    }
  ]
};
