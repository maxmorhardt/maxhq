package email

import (
	"bytes"
	"embed"
	"fmt"
	htmltemplate "html/template"
	"net/url"
	"strings"
	texttemplate "text/template"

	"github.com/google/uuid"
)

const FeedbackAddress = "support@maxhq.io"

//go:embed templates
var templateFS embed.FS

var (
	recapHTML = htmltemplate.Must(htmltemplate.New("recap.html").Funcs(htmltemplate.FuncMap{
		"msoOpen":  func() htmltemplate.HTML { return msoOpen },
		"msoClose": func() htmltemplate.HTML { return msoClose },
	}).ParseFS(templateFS, "templates/recap.html"))
	recapText = texttemplate.Must(texttemplate.ParseFS(templateFS, "templates/recap.txt"))
)

type Recap struct {
	ContestID   uuid.UUID
	ContestName string
	AwayTeam    string
	HomeTeam    string
	AwayAbbr    string
	HomeAbbr    string
	AwayScore   int
	HomeScore   int
	Canceled    bool
	Started     bool
	Quarters    []RecapQuarter
}

type RecapQuarter struct {
	Number    int
	AwayScore int
	HomeScore int
	Winner    string
}

type recapView struct {
	Subject         string
	Preheader       string
	ContestName     string
	Headline        string
	Subhead         string
	Started         bool
	Canceled        bool
	Status          string
	AwayTeam        string
	HomeTeam        string
	AwayLabel       string
	HomeLabel       string
	AwayScore       int
	HomeScore       int
	Quarters        []quarterView
	BoardURL        string
	CreateURL       string
	HomeURL         string
	HomeHost        string
	LogoURL         string
	FeedbackAddress string
}

type quarterView struct {
	Label     string
	AwayScore int
	HomeScore int
	Winner    string
	Open      bool
}

type Content struct {
	Subject string
	HTML    string
	Text    string
}

func RenderRecap(webURL string, recap *Recap) (*Content, error) {
	view := newRecapView(strings.TrimRight(webURL, "/"), recap)

	var html, text bytes.Buffer
	if err := recapHTML.Execute(&html, view); err != nil {
		return nil, fmt.Errorf("render recap html: %w", err)
	}
	if err := recapText.Execute(&text, view); err != nil {
		return nil, fmt.Errorf("render recap text: %w", err)
	}
	return &Content{Subject: view.Subject, HTML: html.String(), Text: text.String()}, nil
}

func newRecapView(webURL string, recap *Recap) *recapView {
	away, home := teamLabel(recap.AwayAbbr, recap.AwayTeam), teamLabel(recap.HomeAbbr, recap.HomeTeam)
	matchup := fmt.Sprintf("%s at %s", recap.AwayTeam, recap.HomeTeam)

	view := &recapView{
		ContestName:     recap.ContestName,
		Started:         recap.Started,
		Canceled:        recap.Canceled,
		Status:          "Final",
		AwayTeam:        recap.AwayTeam,
		HomeTeam:        recap.HomeTeam,
		AwayLabel:       away,
		HomeLabel:       home,
		AwayScore:       recap.AwayScore,
		HomeScore:       recap.HomeScore,
		BoardURL:        fmt.Sprintf("%s/contests/%s%s", webURL, recap.ContestID, utm),
		CreateURL:       webURL + "/contests/create" + utm,
		HomeURL:         webURL,
		HomeHost:        hostOf(webURL),
		LogoURL:         webURL + "/squares_logo.png",
		FeedbackAddress: FeedbackAddress,
	}

	results := make([]string, 0, len(recap.Quarters))
	for _, q := range recap.Quarters {
		qv := quarterView{
			Label:     fmt.Sprintf("Q%d", q.Number),
			AwayScore: q.AwayScore,
			HomeScore: q.HomeScore,
			Winner:    q.Winner,
		}
		switch qv.Winner {
		case "":
			qv.Winner, qv.Open = "Open square", true
		case RemovedPlayer:
			qv.Open = true
		}
		view.Quarters = append(view.Quarters, qv)
		results = append(results, qv.Label+" "+qv.Winner)
	}

	switch {
	case recap.Canceled && !recap.Started:
		view.Status = "Canceled"
		view.Subject = recap.ContestName + ": game canceled"
		view.Headline = "Game canceled"
		view.Subhead = fmt.Sprintf("%s was canceled before %s drew its numbers, so it closed with no winners.", matchup, recap.ContestName)
	case recap.Canceled:
		view.Status = "Canceled"
		view.Subject = recap.ContestName + ": game canceled"
		view.Headline = "Game canceled"
		view.Subhead = fmt.Sprintf("%s was canceled, so the board finished where it stood. Played quarters keep their winners.", matchup)
	default:
		view.Subject = recap.ContestName + ": final results"
		view.Headline = "Final results"
		view.Subhead = fmt.Sprintf("%s %d, %s %d. Here's the winning square for each quarter.", recap.AwayTeam, recap.AwayScore, recap.HomeTeam, recap.HomeScore)
	}

	view.Preheader = view.Subhead
	if recap.Started {
		view.Preheader = fmt.Sprintf("%s: %s %d, %s %d. %s", view.Status, away, recap.AwayScore, home, recap.HomeScore, strings.Join(results, " · "))
	}

	return view
}

const utm = "?utm_source=recap&utm_medium=email"

func teamLabel(abbr, name string) string {
	if abbr != "" {
		return abbr
	}
	return name
}

const (
	RemovedPlayer = "Removed player"
	msoOpen       = `<!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`
	msoClose      = `<!--[if mso]></td></tr></table><![endif]-->`
)

func hostOf(raw string) string {
	if u, err := url.Parse(raw); err == nil && u.Host != "" {
		return u.Host
	}
	return raw
}
