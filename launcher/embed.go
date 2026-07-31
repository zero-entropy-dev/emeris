package main

import "embed"

//go:embed embedded/blank.zip embedded/meadow.zip
var templateFS embed.FS

func templateBytes(kind string) ([]byte, error) {
	name := "embedded/" + kind + ".zip"
	return templateFS.ReadFile(name)
}
