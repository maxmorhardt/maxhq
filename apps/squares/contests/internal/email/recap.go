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
	recapHTML = htmltemplate.Must(htmltemplate.ParseFS(templateFS, "templates/recap.html"))
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
	AwayTeam        string
	HomeTeam        string
	AwayScore       int
	HomeScore       int
	AwayLeads       bool
	HomeLeads       bool
	Quarters        []quarterView
	BoardURL        string
	CreateURL       string
	HomeURL         string
	HomeHost        string
	LogoURL         string
	FeedbackAddress string
}

type quarterView struct {
	Label  string
	Score  string
	Winner string
	Open   bool
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
		AwayTeam:        recap.AwayTeam,
		HomeTeam:        recap.HomeTeam,
		AwayScore:       recap.AwayScore,
		HomeScore:       recap.HomeScore,
		AwayLeads:       recap.AwayScore > recap.HomeScore,
		HomeLeads:       recap.HomeScore > recap.AwayScore,
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
			Label:  quarterLabel(q.Number),
			Score:  fmt.Sprintf("%s %d – %d %s", away, q.AwayScore, q.HomeScore, home),
			Winner: q.Winner,
		}
		if qv.Winner == "" {
			qv.Winner, qv.Open = "Open square", true
		}
		view.Quarters = append(view.Quarters, qv)
		results = append(results, qv.Label+" "+qv.Winner)
	}

	switch {
	case recap.Canceled && !recap.Started:
		view.Subject = recap.ContestName + ": game canceled"
		view.Headline = "Game canceled"
		view.Subhead = fmt.Sprintf("%s was canceled before kickoff, so %s closed without drawing numbers.", matchup, recap.ContestName)
	case recap.Canceled:
		view.Subject = recap.ContestName + ": game canceled"
		view.Headline = "Game canceled"
		view.Subhead = fmt.Sprintf("%s was canceled, so %s finished where it stood. Played quarters keep their winners.", matchup, recap.ContestName)
	default:
		view.Subject = recap.ContestName + ": final results"
		view.Headline = "Final results"
		view.Subhead = fmt.Sprintf("%s is in the books. Here's who won each quarter.", matchup)
	}

	view.Preheader = view.Subhead
	if recap.Started {
		status := "Final"
		if recap.Canceled {
			status = "Canceled"
		}
		view.Preheader = fmt.Sprintf("%s: %s %d, %s %d. %s", status, away, recap.AwayScore, home, recap.HomeScore, strings.Join(results, " · "))
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

func quarterLabel(n int) string {
	switch n {
	case 2:
		return "Half"
	case 4:
		return "Final"
	default:
		return fmt.Sprintf("Q%d", n)
	}
}

func hostOf(raw string) string {
	if u, err := url.Parse(raw); err == nil && u.Host != "" {
		return u.Host
	}
	return raw
}
