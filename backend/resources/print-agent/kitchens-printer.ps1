# Kitchens — oshxona printer dasturi (print agent) v__VERSION__
# Restoran: __COMPANY__ / Kompyuter: __AGENT__
#
# O'rnatish: faylni o'ng tugma bilan bosing -> "Run with PowerShell".
# Dastur o'zini %LOCALAPPDATA%\KitchensPrint papkasiga ko'chiradi va Windows yoqilganda
# o'zi ishga tushadi. Oyna kichraytirilgan holda turadi — yopmang.
# Ishlashi: har 2 soniyada serverdan chek vazifalarini oladi va bo'lim printeriga
# (LAN, ESC/POS, 9100-port) to'g'ridan-to'g'ri yuboradi.

param([switch]$NoInstall)

$Server  = '__SERVER__'
$Token   = '__TOKEN__'
$Version = '__VERSION__'

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
function Wait-Ms([int]$ms) { [System.Threading.Thread]::Sleep($ms) }
$Dir    = Join-Path $env:LOCALAPPDATA 'KitchensPrint'
$Target = Join-Path $Dir 'kitchens-printer.ps1'
$LogFile = Join-Path $Dir 'agent.log'

function Log([string]$msg) {
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Write-Host $line
    try {
        if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt 1MB)) { Move-Item $LogFile "$LogFile.old" -Force }
        Add-Content -Path $LogFile -Value $line -Encoding UTF8
    } catch { }
}

# --- O'rnatish (birinchi ishga tushirishda) ---
if (-not $NoInstall -and $PSCommandPath -ne $Target) {
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
    Copy-Item -Path $PSCommandPath -Destination $Target -Force
    $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$Target`""
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'Kitchens printer.lnk'))
    $lnk.TargetPath = $ps
    $lnk.Arguments = $args
    $lnk.WindowStyle = 7
    $lnk.Description = 'Kitchens oshxona printerlari'
    $lnk.Save()
    Write-Host "O'rnatildi. Windows yoqilganda o'zi ishga tushadi." -ForegroundColor Green
    Start-Process -FilePath $ps -ArgumentList $args -WindowStyle Minimized
    Wait-Ms 3000
    exit
}

try { $Host.UI.RawUI.WindowTitle = "Kitchens printer - __AGENT__ (yopmang)" } catch { }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Headers = @{ 'X-Agent-Token' = $Token; 'Accept' = 'application/json' }

function Api([string]$Method, [string]$Path, $Body = $null) {
    $p = @{ Method = $Method; Uri = "$Server/api/v1/agent/$Path"; Headers = $Headers; TimeoutSec = 20; UseBasicParsing = $true }
    if ($null -ne $Body) {
        $p.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 5 -Compress))
        $p.ContentType = 'application/json; charset=utf-8'
    }
    Invoke-RestMethod @p
}

function Send-ToPrinter([string]$Ip, [int]$Port, [byte[]]$Bytes) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $wait = $client.BeginConnect($Ip, $Port, $null, $null)
        if (-not $wait.AsyncWaitHandle.WaitOne(4000) -or -not $client.Connected) {
            throw "Printer javob bermadi ($Ip`:$Port) — yoqilganini va tarmoqni tekshiring"
        }
        $client.EndConnect($wait)
        $stream = $client.GetStream()
        $stream.WriteTimeout = 8000
        $stream.Write($Bytes, 0, $Bytes.Length)
        $stream.Flush()
        Wait-Ms 300
    } finally {
        $client.Close()
    }
}

function Test-Printer([string]$Ip, [int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $wait = $client.BeginConnect($Ip, $Port, $null, $null)
        return ($wait.AsyncWaitHandle.WaitOne(2000) -and $client.Connected)
    } catch { return $false } finally { $client.Close() }
}

Log "Ishga tushdi (v$Version). Server: $Server"
$printers = @()
$lastBeat = [datetime]::MinValue

while ($true) {
    try {
        if (((Get-Date) - $lastBeat).TotalSeconds -ge 30) {
            $status = @($printers | ForEach-Object { @{ id = [int]$_.id; online = (Test-Printer $_.ip ([int]$_.port)) } })
            $beat = Api 'POST' 'heartbeat' @{ version = $Version; printers = $status }
            $printers = @($beat.data.printers)
            $lastBeat = Get-Date
        }

        $res = Api 'GET' 'jobs'
        foreach ($job in @($res.data)) {
            if ($null -eq $job) { continue }
            try {
                Send-ToPrinter $job.printer.ip ([int]$job.printer.port) ([Convert]::FromBase64String($job.data))
                Api 'POST' "jobs/$($job.id)" @{ ok = $true } | Out-Null
                Log "Chop etildi #$($job.id) -> $($job.printer.name)"
            } catch {
                $err = $_.Exception.Message
                try { Api 'POST' "jobs/$($job.id)" @{ ok = $false; error = $err } | Out-Null } catch { }
                Log "XATO #$($job.id) -> $($job.printer.name): $err"
            }
        }
    } catch {
        $code = $null
        try { $code = [int]$_.Exception.Response.StatusCode } catch { }
        if ($code -eq 401) {
            Log "Kalit bekor qilingan — panelda kompyuterni qayta ulang va yangi faylni yuklab oling."
            Wait-Ms 60000
        } else {
            Log "Server bilan aloqa yo'q: $($_.Exception.Message)"
            Wait-Ms 5000
        }
    }
    Wait-Ms 2000
}
