package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
)

func main() {
	name := flag.String("name", "", "project name")
	dest := flag.String("dest", "", "project folder (files go here directly)")
	tmpl := flag.String("template", "blank", "template: blank|meadow")
	flag.Parse()

	cli := strings.TrimSpace(*name) != "" || strings.TrimSpace(*dest) != ""
	if cli {
		if strings.TrimSpace(*name) == "" || strings.TrimSpace(*dest) == "" {
			fmt.Fprintln(os.Stderr, "usage: EmerisLauncher --name <name> --dest <project-folder> [--template blank|meadow]")
			os.Exit(2)
		}
		kind := parseTemplate(*tmpl)
		res, err := Scaffold(ScaffoldRequest{
			Name:     *name,
			DestDir:  *dest,
			Template: kind,
		})
		if err != nil {
			fmt.Fprintln(os.Stderr, "scaffold failed:", err)
			os.Exit(1)
		}
		fmt.Println(WelcomeMessage(kind, res.NodeOK))
		fmt.Println()
		fmt.Println("Created:", res.ProjectDir)
		return
	}

	runUI()
}

func parseTemplate(s string) TemplateKind {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "meadow", "demo", "demo-meadow":
		return TemplateMeadow
	default:
		return TemplateBlank
	}
}
