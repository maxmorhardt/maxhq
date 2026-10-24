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
	ErrGameNotFound            = errors.New("game not found")
	ErrGamePastFirstQuarter    = errors.New("that game is past the first quarter, pick another one")
	ErrInviteNotFound          = errors.New("invite not found")
	ErrInviteExpired           = errors.New("invite link has expired")
	ErrInviteMaxUsesReached    = errors.New("invite link has reached its usage limit")
	ErrNotEnoughSquares        = errors.New("not enough squares remaining in this contest")
	ErrAlreadyParticipant      = errors.New("you are already a participant in this contest")
	ErrNotParticipant          = errors.New("not a participant in this contest")
	ErrInsufficientRole        = errors.New("insufficient permissions for this action")
	ErrCannotRemoveOwner       = errors.New("cannot remove the contest owner")
	ErrCannotChangeOwner       = errors.New("cannot change the owner's role")
	ErrSquareLimitReached      = errors.New("you have reached your square limit for this contest")
	ErrSquareLimitTooLow       = errors.New("new limit cannot be below the number of squares already claimed")
	ErrInvalidSquareCount      = errors.New("participants must be allotted at least one square")
	ErrParticipantsLocked      = errors.New("players can only be edited before kickoff")
	ErrViewerCannotHaveSquares = errors.New("viewers cannot be allotted squares")
	ErrWinnerNotDeterminable   = errors.New("winner cannot be determined for the given score")
	ErrInvalidQuarter          = errors.New("quarter must be between 1 and 4")
)
