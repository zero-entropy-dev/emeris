using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Emeris.Shell;

internal static class Program
{
    private const string DefaultUrl = "http://127.0.0.1:5173/";
    private const int DefaultW = 1280;
    private const int DefaultH = 800;

    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);

        var opts = ShellOptions.Parse(args);
        try
        {
            Application.Run(new ShellForm(opts));
        }
        catch (Exception ex)
        {
            Fail("Emeris shell failed to start.", ex);
        }
    }

    internal static void Fail(string message, Exception? ex = null)
    {
        var detail = ex is null ? message : $"{message}\n\n{ex}";
        try
        {
            File.AppendAllText(LogPath(), $"[{DateTimeOffset.Now:u}] {detail}{Environment.NewLine}");
        }
        catch
        {
            /* best effort */
        }
        MessageBox.Show(detail, "Emeris shell", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }

    private static string LogPath()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Emeris",
            "shell");
        Directory.CreateDirectory(dir);
        return Path.Combine(dir, "shell.log");
    }

    internal sealed class ShellOptions
    {
        internal string Url { get; init; } = DefaultUrl;
        internal string Title { get; init; } = "Emeris";
        internal string Profile { get; init; } = "default";
        internal string? IconPath { get; init; }

        internal static ShellOptions Parse(string[] args)
        {
            var url = DefaultUrl;
            var title = "Emeris";
            var profile = "default";
            string? icon = null;

            for (var i = 0; i < args.Length; i++)
            {
                var arg = args[i];
                if (arg.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                    || arg.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    url = arg;
                    continue;
                }

                static bool Take(string[] a, int idx, string flag, out string value)
                {
                    value = "";
                    if (!string.Equals(a[idx], flag, StringComparison.OrdinalIgnoreCase)) return false;
                    value = idx + 1 < a.Length ? a[idx + 1] : "";
                    return true;
                }

                if (Take(args, i, "--url", out var u) && u.Length > 0) { url = u; i++; continue; }
                if (Take(args, i, "--title", out var t) && t.Length > 0) { title = t; i++; continue; }
                if (Take(args, i, "--profile", out var p) && p.Length > 0) { profile = p; i++; continue; }
                if (Take(args, i, "--icon", out var ic) && ic.Length > 0) { icon = ic; i++; continue; }
            }

            return new ShellOptions { Url = url, Title = title, Profile = profile, IconPath = icon };
        }
    }

    private sealed class ShellForm : Form
    {
        private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
        private readonly ShellOptions _opts;
        private readonly HostSampler _hostSampler = new();
        private System.Windows.Forms.Timer? _hostPerf;

        internal ShellForm(ShellOptions opts)
        {
            _opts = opts;
            Text = opts.Title;
            ClientSize = new Size(DefaultW, DefaultH);
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(960, 540);
            ShowInTaskbar = true;

            if (!string.IsNullOrWhiteSpace(opts.IconPath) && File.Exists(opts.IconPath))
            {
                Icon = new Icon(opts.IconPath);
            }
            else
            {
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }

            Controls.Add(_web);
            Shown += OnShownAsync;
            FormClosed += OnFormClosed;
            KeyPreview = true;
            KeyDown += OnKeyDown;
        }

        private async void OnShownAsync(object? sender, EventArgs e)
        {
            Shown -= OnShownAsync;
            try
            {
                var profileDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Emeris",
                    "shell",
                    _opts.Profile);
                Directory.CreateDirectory(profileDir);

                var env = await CoreWebView2Environment.CreateAsync(null, profileDir);
                await _web.EnsureCoreWebView2Async(env);

                var core = _web.CoreWebView2;
                core.Settings.AreDevToolsEnabled = true;
                core.Settings.AreDefaultContextMenusEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsZoomControlEnabled = false;
                core.Settings.IsWebMessageEnabled = true;

                core.NavigationStarting += (_, ev) =>
                {
                    if (!IsAllowedDevUrl(ev.Uri))
                    {
                        ev.Cancel = true;
                    }
                };
                core.NavigationCompleted += (_, ev) =>
                {
                    if (ev.IsSuccess) ArmHostPerf(core);
                };

                await WaitForServerAsync(_opts.Url);
                core.Navigate(_opts.Url);
            }
            catch (Exception ex)
            {
                Fail("WebView2 failed to initialize.", ex);
                Close();
            }
        }

        private static bool IsAllowedDevUrl(string uri)
        {
            if (!Uri.TryCreate(uri, UriKind.Absolute, out var u)) return false;
            if (u.Scheme is not ("http" or "https")) return false;
            if (u.Host is "127.0.0.1" or "localhost") return true;
            return false;
        }

        private static async Task WaitForServerAsync(string url)
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(500) };
            var deadline = DateTime.UtcNow.AddSeconds(45);
            while (DateTime.UtcNow < deadline)
            {
                try
                {
                    using var res = await client.GetAsync(url);
                    if (res.IsSuccessStatusCode) return;
                }
                catch
                {
                    /* dev server still starting */
                }
                await Task.Delay(150);
            }
            throw new TimeoutException($"Dev server did not respond at {url}");
        }

        private void ArmHostPerf(CoreWebView2 core)
        {
            _hostPerf ??= new System.Windows.Forms.Timer { Interval = 250 };
            _hostPerf.Tick -= OnHostPerfTick;
            _hostPerf.Tick += OnHostPerfTick;
            _hostPerf.Tag = core;
            _hostPerf.Start();
        }

        private void OnHostPerfTick(object? sender, EventArgs e)
        {
            if (_hostPerf?.Tag is not CoreWebView2 core) return;
            try
            {
                var browser = 0;
                try
                {
                    browser = unchecked((int)core.BrowserProcessId);
                }
                catch
                {
                    /* core tearing down */
                }
                var json = _hostSampler.Tick(Environment.ProcessId, browser);
                if (json is null) return;
                core.PostWebMessageAsJson(json);
            }
            catch
            {
                /* page not ready / core gone */
            }
        }

        private void OnFormClosed(object? sender, FormClosedEventArgs e)
        {
            if (_hostPerf is null) return;
            _hostPerf.Stop();
            _hostPerf.Tick -= OnHostPerfTick;
            _hostPerf.Dispose();
            _hostPerf = null;
        }

        private void OnKeyDown(object? sender, KeyEventArgs e)
        {
            if (e.Control && e.Shift && e.KeyCode == Keys.I)
            {
                _web.CoreWebView2?.OpenDevToolsWindow();
                e.Handled = true;
            }
        }
    }
}
