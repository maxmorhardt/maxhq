package errs

import "errors"

// authorization errors for contest and square actions
var (
	ErrUnauthorizedContestEdit   = errors.New("only the contest owner can update this contest")
	ErrUnauthorizedContestDelete = errors.New("only the contest owner can delete this contest")
	ErrUnauthorizedSquareEdit    = errors.New("only the square owner can update this square")
	ErrMissingInitials           = errors.New("set your default initials in your profile before claiming a square")
)

// validation errors for contest, team, and square attributes
var (
	ErrInvalidSquareValue = errors.New("value must be 1-3 uppercase letters or numbers")
)

// state errors for contests and squares
var (
	ErrContestNotEditable         = errors.New("contest is not in an editable state")
	ErrContestFinalized           = errors.New("contest is finished or deleted and cannot be modified")
	ErrContestNotReady            = errors.New("all squares must be claimed before the contest can be started")
	ErrSquareNotEditable          = errors.New("squares can only be edited when contest is active")
	ErrSquareTaken                = errors.New("that square was just claimed by someone else")
	ErrContestAlreadyExists       = errors.New("contest already exists with this name")
	ErrQuarterResultAlreadyExists = errors.New("result of this quarter has already been recorded")
	ErrNoQuarterResultToRollback  = errors.New("there is no recorded quarter result to roll back")
	ErrVersionConflict            = errors.New("this contest was changed by someone else, refresh and try again")
)

// database errors for service availability
var (
	ErrDatabaseUnavailable = errors.New("service temporarily unavailable, please try again later")
)

// not found and request errors
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
)

// game, contest, and invite related errors
var (
	ErrGameNotFound            = errors.New("game not found")
	ErrContestIsGameLinked     = errors.New("this contest is linked to a live game and scores are updated automatically")
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
	ErrViewerCannotHaveSquares = errors.New("viewers cannot be allotted squares")
	ErrWinnerNotDeterminable   = errors.New("winner cannot be determined for the given score")
	ErrInvalidQuarter          = errors.New("quarter must be between 1 and 4")
)
