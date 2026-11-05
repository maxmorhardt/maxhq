package errs

import "errors"

var (
	ErrUnauthorizedContestDelete = errors.New("only the contest owner can delete this contest")
	ErrUnauthorizedSquareEdit    = errors.New("only the square owner can update this square")
	ErrMissingInitials           = errors.New("set your default initials in your profile before claiming a square")
)

var (
	ErrInvalidSquareValue = errors.New("value must be 1-3 uppercase letters or numbers")
)

var (
	ErrContestNotEditable = errors.New("contest is not in an editable state")
	ErrContestFinalized   = errors.New("contest is finished or deleted and cannot be modified")
	ErrSquareNotEditable  = errors.New("squares can only be edited when contest is active")
	ErrBoardLocked        = errors.New("the board is full and locked, so squares can no longer be cleared")
	ErrSquareTaken        = errors.New("that square was just claimed by someone else")
	ErrNoEmptySquares     = errors.New("there are no empty squares left")
	ErrVersionConflict    = errors.New("this contest was changed by someone else, refresh and try again")
)

var (
	ErrDatabaseUnavailable = errors.New("service temporarily unavailable, please try again later")
)

var (
	ErrContestNotFound    = errors.New("contest not found")
	ErrSquareNotFound     = errors.New("square not found")
	ErrInvalidRequestBody = errors.New("invalid request body")
	ErrClaimsNotFound     = errors.New("authentication required")
)

var (
	ErrInvalidCursor = errors.New("invalid cursor parameter")
	ErrInvalidLimit  = errors.New("invalid limit parameter")
	ErrInvalidFilter = errors.New("invalid filter parameter")
	ErrInvalidSearch = errors.New("invalid search parameter")
)

var (
	ErrGameNotFound          = errors.New("game not found")
	ErrGamePastFirstQuarter  = errors.New("that game is past the first quarter, pick another one")
	ErrGameCanceled          = errors.New("that game was canceled, pick another one")
	ErrInviteNotFound        = errors.New("this invite link doesn't work anymore, ask the owner for a new one")
	ErrBannedFromContest     = errors.New("the owner removed you from this contest")
	ErrNotEnoughSquares      = errors.New("that would give out more than the board's 100 squares")
	ErrAlreadyPlayer         = errors.New("you are already a player in this contest")
	ErrNotPlayer             = errors.New("not a player in this contest")
	ErrPlayerNotFound        = errors.New("that player isn't in this contest")
	ErrNotBanned             = errors.New("that person isn't banned from this contest")
	ErrInsufficientRole      = errors.New("insufficient permissions for this action")
	ErrCannotRemoveOwner     = errors.New("cannot remove the contest owner")
	ErrSquareLimitReached    = errors.New("you have reached your square limit for this contest")
	ErrPlayersLocked         = errors.New("players can only be edited before kickoff")
	ErrWinnerNotDeterminable = errors.New("winner cannot be determined for the given score")
	ErrInvalidQuarter        = errors.New("quarter must be between 1 and 4")
	ErrContestLimitReached   = errors.New("you have too many open contests, finish or delete one first")
	ErrDailyContestLimit     = errors.New("you have created too many contests today, try again later")
)
