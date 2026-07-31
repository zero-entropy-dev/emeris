//go:build windows

package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32         = windows.NewLazySystemDLL("user32.dll")
	kernel32        = windows.NewLazySystemDLL("kernel32.dll")
	procMessageBoxW = user32.NewProc("MessageBoxW")
	procFreeConsole = kernel32.NewProc("FreeConsole")
)

const (
	mbOK        = 0x00000000
	mbIconError = 0x00000010
)

func messageBox(title, text string, flags uint32) {
	t, _ := windows.UTF16PtrFromString(title)
	b, _ := windows.UTF16PtrFromString(text)
	procMessageBoxW.Call(0, uintptr(unsafe.Pointer(b)), uintptr(unsafe.Pointer(t)), uintptr(flags))
}

func runUI() {
	procFreeConsole.Call()

	name, dest, kind, ok := nativeForm()
	if !ok {
		return
	}
	res, err := Scaffold(ScaffoldRequest{
		Name:     name,
		DestDir:  dest,
		Template: kind,
	})
	if err != nil {
		messageBox("Emeris Launcher", err.Error(), mbOK|mbIconError)
		return
	}
	showWelcomeDialog(welcomeForDialog(kind, res.NodeOK))
	_ = res
}

func nativeForm() (name, dest string, kind TemplateKind, ok bool) {
	out, code, errOut, err := runPowerShellFile(formScript())
	if code == 2 {
		return "", "", TemplateBlank, false
	}
	if err != nil || code != 0 {
		detail := strings.TrimSpace(errOut)
		if detail == "" && err != nil {
			detail = err.Error()
		}
		if detail == "" {
			detail = fmt.Sprintf("PowerShell exited with code %d", code)
		}
		messageBox("Emeris Launcher", "Could not open the create dialog.\n\n"+detail, mbOK|mbIconError)
		return "", "", TemplateBlank, false
	}
	out = strings.TrimSpace(out)
	parts := strings.SplitN(out, "\t", 3)
	if len(parts) != 3 {
		messageBox("Emeris Launcher", "Could not read form values.", mbOK|mbIconError)
		return "", "", TemplateBlank, false
	}
	return parts[0], parts[1], parseTemplate(parts[2]), true
}

func showWelcomeDialog(text string) {
	textFile := tempPath("welcome.txt")
	scriptFile := tempPath("welcome.ps1")
	if err := os.WriteFile(textFile, []byte(text), 0o600); err != nil {
		messageBox("Welcome to Emeris", text, mbOK)
		return
	}
	defer os.Remove(textFile)

	// Path embedded as a single-quoted PowerShell string (escape embedded quotes).
	psPath := strings.ReplaceAll(textFile, "'", "''")
	script := fmt.Sprintf(`Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$body = [System.IO.File]::ReadAllText('%s', [System.Text.Encoding]::UTF8)

$fontUI = New-Object System.Drawing.Font('Segoe UI', 10)
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$fontMono = New-Object System.Drawing.Font('Consolas', 10)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Welcome to Emeris'
$form.ClientSize = New-Object System.Drawing.Size(560, 480)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Font = $fontUI
$form.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 252)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Welcome to Emeris'
$title.Font = $fontTitle
$title.Location = New-Object System.Drawing.Point(24, 20)
$title.AutoSize = $true
$form.Controls.Add($title)

$box = New-Object System.Windows.Forms.TextBox
$box.Multiline = $true
$box.ReadOnly = $true
$box.ScrollBars = 'Vertical'
$box.WordWrap = $true
$box.BorderStyle = 'FixedSingle'
$box.BackColor = [System.Drawing.Color]::White
$box.Location = New-Object System.Drawing.Point(24, 56)
$box.Size = New-Object System.Drawing.Size(512, 360)
$box.Font = $fontUI
$box.Text = $body
$box.SelectionStart = 0
$box.SelectionLength = 0
$form.Controls.Add($box)

$ok = New-Object System.Windows.Forms.Button
$ok.Text = 'OK'
$ok.Size = New-Object System.Drawing.Size(100, 32)
$ok.Location = New-Object System.Drawing.Point(436, 432)
$ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.AcceptButton = $ok
$form.Controls.Add($ok)

[void]$form.ShowDialog()
`, psPath)

	if err := os.WriteFile(scriptFile, []byte(script), 0o600); err != nil {
		messageBox("Welcome to Emeris", text, mbOK)
		return
	}
	defer os.Remove(scriptFile)

	_, code, errOut, err := runPowerShellPath(scriptFile)
	if err != nil || code != 0 {
		detail := strings.TrimSpace(errOut)
		if detail != "" {
			messageBox("Emeris Launcher", "Welcome dialog failed.\n\n"+detail+"\n\n"+text, mbOK|mbIconError)
		} else {
			messageBox("Welcome to Emeris", text, mbOK)
		}
	}
}

func formScript() string {
	return `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$fontUI = New-Object System.Drawing.Font('Segoe UI', 10)
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$fontHint = New-Object System.Drawing.Font('Segoe UI', 9)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Emeris Launcher'
$form.ClientSize = New-Object System.Drawing.Size(520, 300)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.Font = $fontUI
$form.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 252)
$form.Padding = New-Object System.Windows.Forms.Padding(24)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Create an Emeris project'
$title.Font = $fontTitle
$title.Location = New-Object System.Drawing.Point(24, 18)
$title.AutoSize = $true
$form.Controls.Add($title)

$hint = New-Object System.Windows.Forms.Label
$hint.Text = 'Files are written into the destination folder (not a subfolder).'
$hint.Font = $fontHint
$hint.ForeColor = [System.Drawing.Color]::FromArgb(90, 90, 100)
$hint.Location = New-Object System.Drawing.Point(24, 48)
$hint.AutoSize = $true
$form.Controls.Add($hint)

$lblName = New-Object System.Windows.Forms.Label
$lblName.Text = 'Project name'
$lblName.Location = New-Object System.Drawing.Point(24, 84)
$lblName.AutoSize = $true
$form.Controls.Add($lblName)

$txtName = New-Object System.Windows.Forms.TextBox
$txtName.Location = New-Object System.Drawing.Point(24, 106)
$txtName.Size = New-Object System.Drawing.Size(472, 26)
$form.Controls.Add($txtName)

$lblDest = New-Object System.Windows.Forms.Label
$lblDest.Text = 'Destination folder'
$lblDest.Location = New-Object System.Drawing.Point(24, 144)
$lblDest.AutoSize = $true
$form.Controls.Add($lblDest)

$txtDest = New-Object System.Windows.Forms.TextBox
$txtDest.Location = New-Object System.Drawing.Point(24, 166)
$txtDest.Size = New-Object System.Drawing.Size(372, 26)
$form.Controls.Add($txtDest)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = 'Browse...'
$btnBrowse.Location = New-Object System.Drawing.Point(404, 164)
$btnBrowse.Size = New-Object System.Drawing.Size(92, 28)
$btnBrowse.FlatStyle = 'System'
$btnBrowse.Add_Click({
  $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
  $dlg.Description = 'Choose destination folder'
  if ($dlg.ShowDialog() -eq 'OK') { $txtDest.Text = $dlg.SelectedPath }
})
$form.Controls.Add($btnBrowse)

$lblTmpl = New-Object System.Windows.Forms.Label
$lblTmpl.Text = 'Template'
$lblTmpl.Location = New-Object System.Drawing.Point(24, 208)
$lblTmpl.AutoSize = $true
$form.Controls.Add($lblTmpl)

$rbBlank = New-Object System.Windows.Forms.RadioButton
$rbBlank.Text = 'Blank Project'
$rbBlank.Location = New-Object System.Drawing.Point(24, 230)
$rbBlank.AutoSize = $true
$rbBlank.Checked = $true
$form.Controls.Add($rbBlank)

$rbMeadow = New-Object System.Windows.Forms.RadioButton
$rbMeadow.Text = 'Demo Meadow'
$rbMeadow.Location = New-Object System.Drawing.Point(160, 230)
$rbMeadow.AutoSize = $true
$form.Controls.Add($rbMeadow)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = 'Cancel'
$btnCancel.Location = New-Object System.Drawing.Point(280, 256)
$btnCancel.Size = New-Object System.Drawing.Size(100, 30)
$btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.CancelButton = $btnCancel
$form.Controls.Add($btnCancel)

$btnCreate = New-Object System.Windows.Forms.Button
$btnCreate.Text = 'Create Project'
$btnCreate.Location = New-Object System.Drawing.Point(388, 256)
$btnCreate.Size = New-Object System.Drawing.Size(108, 30)
$btnCreate.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.AcceptButton = $btnCreate
$form.Controls.Add($btnCreate)

$result = $form.ShowDialog()
if ($result -ne [System.Windows.Forms.DialogResult]::OK) { exit 2 }
$tmpl = if ($rbMeadow.Checked) { 'meadow' } else { 'blank' }
Write-Output ($txtName.Text + [char]9 + $txtDest.Text + [char]9 + $tmpl)
`
}

func tempPath(suffix string) string {
	return filepath.Join(os.TempDir(), fmt.Sprintf("emeris-launcher-%d-%d-%s", os.Getpid(), time.Now().UnixNano(), suffix))
}

func runPowerShellFile(script string) (stdout string, exitCode int, stderr string, err error) {
	file := tempPath("ui.ps1")
	if writeErr := os.WriteFile(file, []byte(script), 0o600); writeErr != nil {
		return "", 1, "", writeErr
	}
	defer os.Remove(file)
	return runPowerShellPath(file)
}

func runPowerShellPath(file string) (stdout string, exitCode int, stderr string, err error) {
	cmd := exec.Command(
		"powershell.exe",
		"-NoProfile",
		"-ExecutionPolicy", "Bypass",
		"-STA",
		"-File", file,
	)
	var buf, errBuf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &errBuf
	runErr := cmd.Run()
	if cmd.ProcessState != nil {
		exitCode = cmd.ProcessState.ExitCode()
	}
	if runErr != nil && exitCode == 0 {
		exitCode = 1
	}
	return buf.String(), exitCode, errBuf.String(), runErr
}
