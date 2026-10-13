package model

type StreamResult string

const (
	StreamResultSuccess      StreamResult = "success"
	StreamResultBadRequest   StreamResult = "bad_request"
	StreamResultNotFound     StreamResult = "not_found"
	StreamResultUnauthorized StreamResult = "unauthorized"
	StreamResultUnavailable  StreamResult = "unavailable"
)

type StreamCloseReason string

const (
	StreamCloseClient         StreamCloseReason = "client"
	StreamCloseTokenExpired   StreamCloseReason = "token_expired"
	StreamCloseTokenRevoked   StreamCloseReason = "token_revoked"
	StreamCloseAccessRevoked  StreamCloseReason = "access_revoked"
	StreamCloseContestDeleted StreamCloseReason = "contest_deleted"
	StreamCloseFellBehind     StreamCloseReason = "fell_behind"
	StreamCloseServerShutdown StreamCloseReason = "server_shutdown"
)
