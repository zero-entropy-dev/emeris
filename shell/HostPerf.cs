using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

namespace Emeris.Shell;

/// <summary>
/// Process-tree CPU and working set for this window (shell + WebView2 browser/GPU/renderer).
/// Posted to the page as <c>emeris-host-perf</c>. Not Qualcomm GPU counters.
/// </summary>
internal sealed class HostSampler
{
    private const uint Th32CsSnapProcess = 2;
    private static readonly IntPtr InvalidHandle = new(-1);

    private Dictionary<int, TimeSpan>? _prevCpu;
    private long _prevStamp;

    public string? Tick(int shellPid, int browserPid)
    {
        var pids = Tree(shellPid, browserPid);
        if (pids.Count == 0) return null;

        var now = Stopwatch.GetTimestamp();
        var cpu = new Dictionary<int, TimeSpan>(pids.Count);
        long ram = 0;
        var alive = 0;
        foreach (var pid in pids)
        {
            try
            {
                using var proc = Process.GetProcessById(pid);
                cpu[pid] = proc.TotalProcessorTime;
                ram += proc.WorkingSet64;
                alive += 1;
            }
            catch
            {
                /* exited between snapshot and open */
            }
        }

        double cpuPct = 0;
        if (_prevCpu is not null && _prevStamp > 0)
        {
            var wall = (now - _prevStamp) / (double)Stopwatch.Frequency;
            if (wall > 0.02)
            {
                double used = 0;
                foreach (var (pid, total) in cpu)
                {
                    if (_prevCpu.TryGetValue(pid, out var before) && total > before)
                    {
                        used += (total - before).TotalSeconds;
                    }
                }
                var cores = Math.Max(1, Environment.ProcessorCount);
                cpuPct = Math.Clamp(100.0 * used / (wall * cores), 0, 100);
            }
        }

        _prevCpu = cpu;
        _prevStamp = now;

        var ramMb = (int)Math.Round(ram / (1024.0 * 1024.0));
        var coresN = Environment.ProcessorCount;
        var inv = CultureInfo.InvariantCulture;
        var sb = new StringBuilder(160);
        sb.Append("{\"type\":\"emeris-host-perf\",\"cpuPct\":");
        sb.Append(cpuPct.ToString("0.0", inv));
        sb.Append(",\"ramMb\":");
        sb.Append(ramMb.ToString(inv));
        sb.Append(",\"procs\":");
        sb.Append(alive.ToString(inv));
        sb.Append(",\"cores\":");
        sb.Append(coresN.ToString(inv));
        sb.Append('}');
        return sb.ToString();
    }

    private static HashSet<int> Tree(int shellPid, int browserPid)
    {
        var kids = new Dictionary<int, List<int>>();
        var snap = CreateToolhelp32Snapshot(Th32CsSnapProcess, 0);
        if (snap == IntPtr.Zero || snap == InvalidHandle) return [];
        try
        {
            var pe = new ProcessEntry32 { dwSize = (uint)Marshal.SizeOf<ProcessEntry32>() };
            if (!Process32First(snap, ref pe)) return [];
            do
            {
                var pid = (int)pe.th32ProcessID;
                var parent = (int)pe.th32ParentProcessID;
                if (pid <= 0) continue;
                if (!kids.TryGetValue(parent, out var list))
                {
                    list = [];
                    kids[parent] = list;
                }
                list.Add(pid);
            } while (Process32Next(snap, ref pe));
        }
        finally
        {
            CloseHandle(snap);
        }

        var seen = new HashSet<int>();
        var q = new Queue<int>();
        void Seed(int pid)
        {
            if (pid > 0 && seen.Add(pid)) q.Enqueue(pid);
        }
        Seed(shellPid);
        Seed(browserPid);
        while (q.Count > 0)
        {
            var id = q.Dequeue();
            if (!kids.TryGetValue(id, out var list)) continue;
            foreach (var child in list)
            {
                if (seen.Add(child)) q.Enqueue(child);
            }
        }
        return seen;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct ProcessEntry32
    {
        public uint dwSize;
        public uint cntUsage;
        public uint th32ProcessID;
        public IntPtr th32DefaultHeapID;
        public uint th32ModuleID;
        public uint cntThreads;
        public uint th32ParentProcessID;
        public int pcPriClassBase;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szExeFile;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint pid);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool Process32First(IntPtr snap, ref ProcessEntry32 pe);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool Process32Next(IntPtr snap, ref ProcessEntry32 pe);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);
}
