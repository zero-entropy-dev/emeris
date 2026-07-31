package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"unicode"
)

type TemplateKind string

const (
	TemplateBlank  TemplateKind = "blank"
	TemplateMeadow TemplateKind = "meadow"
)

type ScaffoldRequest struct {
	Name     string
	DestDir  string
	Template TemplateKind
}

type ScaffoldResult struct {
	ProjectDir string
	NodeOK     bool
}

var textExt = map[string]bool{
	".md": true, ".json": true, ".html": true, ".htm": true,
	".ts": true, ".tsx": true, ".js": true, ".mjs": true, ".cjs": true,
	".css": true, ".txt": true, ".svg": true,
}

func slugPackageName(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			prevDash = false
		case r == ' ' || r == '_' || r == '-' || r == '.':
			if b.Len() > 0 && !prevDash {
				b.WriteByte('-')
				prevDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "emeris-project"
	}
	if out[0] >= '0' && out[0] <= '9' {
		out = "p-" + out
	}
	return out
}

func nodeAvailable() bool {
	_, err := exec.LookPath("node")
	return err == nil
}

func Scaffold(req ScaffoldRequest) (ScaffoldResult, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return ScaffoldResult{}, fmt.Errorf("project name is required")
	}
	dest := strings.TrimSpace(req.DestDir)
	if dest == "" {
		return ScaffoldResult{}, fmt.Errorf("destination folder is required")
	}
	kind := req.Template
	if kind != TemplateBlank && kind != TemplateMeadow {
		kind = TemplateBlank
	}

	projectDir, err := filepath.Abs(dest)
	if err != nil {
		return ScaffoldResult{}, err
	}

	created := false
	if st, err := os.Stat(projectDir); err == nil {
		if !st.IsDir() {
			return ScaffoldResult{}, fmt.Errorf("destination path exists and is not a directory: %s", projectDir)
		}
		entries, readErr := os.ReadDir(projectDir)
		if readErr != nil {
			return ScaffoldResult{}, readErr
		}
		if len(entries) > 0 {
			return ScaffoldResult{}, fmt.Errorf("destination folder is not empty: %s", projectDir)
		}
	} else if os.IsNotExist(err) {
		if err := os.MkdirAll(projectDir, 0o755); err != nil {
			return ScaffoldResult{}, err
		}
		created = true
	} else {
		return ScaffoldResult{}, err
	}

	cleanup := func() {
		if created {
			_ = os.RemoveAll(projectDir)
		}
	}

	data, err := templateBytes(string(kind))
	if err != nil {
		cleanup()
		return ScaffoldResult{}, fmt.Errorf("embedded template %q: %w", kind, err)
	}

	if err := unzipBytes(data, projectDir); err != nil {
		cleanup()
		return ScaffoldResult{}, err
	}

	pkg := slugPackageName(name)
	repl := map[string]string{
		"{{PROJECT_NAME}}":  name,
		"{{PROJECT_TITLE}}": name,
		"{{PACKAGE_NAME}}":  pkg,
	}
	if err := replacePlaceholders(projectDir, repl); err != nil {
		cleanup()
		return ScaffoldResult{}, err
	}

	return ScaffoldResult{
		ProjectDir: projectDir,
		NodeOK:     nodeAvailable(),
	}, nil
}

func unzipBytes(data []byte, dest string) error {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}
	destAbs, err := filepath.Abs(dest)
	if err != nil {
		return err
	}
	for _, f := range r.File {
		name := filepath.Clean(filepath.FromSlash(f.Name))
		if name == "." || strings.HasPrefix(name, "..") {
			return fmt.Errorf("invalid zip entry: %s", f.Name)
		}
		target := filepath.Join(destAbs, name)
		rel, err := filepath.Rel(destAbs, target)
		if err != nil || strings.HasPrefix(rel, "..") {
			return fmt.Errorf("zip entry escapes destination: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, f.Mode())
		if err != nil {
			_ = rc.Close()
			return err
		}
		_, copyErr := io.Copy(out, rc)
		closeErr := out.Close()
		_ = rc.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}

func replacePlaceholders(root string, repl map[string]string) error {
	return filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if !textExt[ext] {
			base := strings.ToLower(filepath.Base(path))
			if base != "launch.json" && base != ".gitignore" && base != "gitignore" {
				if ext != "" {
					return nil
				}
			}
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if bytes.IndexByte(raw, 0) >= 0 {
			return nil
		}
		s := string(raw)
		orig := s
		for k, v := range repl {
			s = strings.ReplaceAll(s, k, v)
		}
		if s != orig {
			return os.WriteFile(path, []byte(s), 0o644)
		}
		return nil
	})
}

func WelcomeMessage(kind TemplateKind, nodeOK bool) string {
	scaffoldWord := "a minimal game scaffold"
	if kind == TemplateMeadow {
		scaffoldWord = "a demonstration meadow"
	}
	var b strings.Builder
	b.WriteString("Emeris is a small deterministic engine for building simulation-first games.\n\n")
	b.WriteString("This launcher has generated a complete starter project containing the engine, documentation, and ")
	b.WriteString(scaffoldWord)
	b.WriteString(". Begin by reading ENGINE.md.\n\n")
	if !nodeOK {
		b.WriteString("Node.js was not found on PATH. Install the latest LTS version first, then:\n\n")
	} else {
		b.WriteString("If you don't already have Node.js installed, install the latest LTS version first. Then install the project dependencies and start the development server:\n\n")
	}
	b.WriteString("npm install\n")
	b.WriteString("npm run dev\n\n")
	b.WriteString("Emeris was designed for AI-assisted development. The documentation and project structure are intended to help modern coding assistants understand the architecture quickly and make changes with minimal context. The project remains an ordinary TypeScript codebase, and you are free to use - or ignore - AI as you see fit.\n\n")
	b.WriteString("The generated project is entirely yours. Keep the architecture, reshape it, or replace it completely as your game evolves.\n\n")
	b.WriteString("Have fun building.")
	return b.String()
}

// welcomeForDialog uses Windows line endings so WinForms TextBox shows paragraphs.
func welcomeForDialog(kind TemplateKind, nodeOK bool) string {
	return strings.ReplaceAll(WelcomeMessage(kind, nodeOK), "\n", "\r\n")
}
