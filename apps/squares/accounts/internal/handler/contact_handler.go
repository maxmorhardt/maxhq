package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/maxmorhardt/maxstash/libs/platform/strutil"
)

type ContactHandler interface {
	SubmitContact(c *gin.Context)
}

type contactHandler struct {
	contactService service.ContactService
}

func NewContactHandler(contactService service.ContactService) ContactHandler {
	return &contactHandler{
		contactService: contactService,
	}
}

// @Summary Submit a contact form
// @Description Submit a contact form message
// @Tags contact
// @Accept json
// @Produce json
// @Param contact body model.ContactRequest true "Contact form data"
// @Param Idempotency-Key header string false "Replays the first response when a submission is retried with the same key"
// @Success 200 {object} model.ContactResponse
// @Failure 400 {object} api.APIError
// @Failure 429 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /contact [post]
func (h *contactHandler) SubmitContact(c *gin.Context) {
	log := reqctx.LoggerFromGinContext(c)

	// parse request body
	var req model.ContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Warn("failed to bind contact request json", "error", err)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, strutil.CapitalizeFirstLetter(errs.ErrInvalidRequestBody), c))
		return
	}

	// get client ip address
	ipAddress := c.ClientIP()

	// submit contact via service
	if err := h.contactService.SubmitContact(c.Request.Context(), &req, ipAddress); err != nil {
		if errors.Is(err, errs.ErrInvalidTurnstile) {
			log.Error("invalid contact submission captcha", "error", err)
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, strutil.CapitalizeFirstLetter(err), c))
		} else {
			log.Error("failed to submit contact", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to submit contact form. Please try again", c))
		}
		return
	}

	c.JSON(http.StatusOK, model.ContactResponse{Message: "Contact request submitted successfully. We will get back to you soon"})
}
