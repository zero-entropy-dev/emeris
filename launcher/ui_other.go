//go:build !windows

package main

import (
	"fmt"
	"os"
)

func runUI() {
	fmt.Fprintln(os.Stderr, "Emeris Launcher GUI is Windows-only in this release.")
	fmt.Fprintln(os.Stderr, "Use: EmerisLauncher --name <name> --dest <folder> [--template blank|meadow]")
	os.Exit(2)
}
