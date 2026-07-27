<#
Minimal static file server for local testing (no installs required).
Usage:  powershell -ExecutionPolicy Bypass -File .\serve.ps1 [-Port 8080]
Then open http://localhost:8080/index.html (or http://<your-LAN-IP>:8080/index.html on your phone).
Stop with Ctrl+C.
#>
param(
    [int]$Port = 8080
)

Add-Type -AssemblyName System.Net.Http

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$prefix = "http://+:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Failed to bind $prefix - trying http://localhost:$Port/ instead (LAN access from phone won't work with this fallback)." -ForegroundColor Yellow
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
}

$mimeTypes = @{
    ".html" = "text/html"
    ".js"   = "application/javascript"
    ".css"  = "text/css"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json"
    ".csv"  = "text/csv"
    ".tmx"  = "application/xml"
    ".tsx"  = "application/xml"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
    ".ico"  = "image/x-icon"
}

Write-Host "Serving '$root' at http://localhost:$Port/ (Ctrl+C to stop)" -ForegroundColor Green
try {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
    if ($ip) { Write-Host "On your phone (same Wi-Fi): http://$ip`:$Port/index.html" -ForegroundColor Cyan }
} catch {}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
        $relPath = [Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = "index.html" }
        $filePath = Join-Path $root $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mimeTypes[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relPath")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
        $response.StatusCode = 500
        Write-Host "Error serving $($request.Url): $_" -ForegroundColor Red
    } finally {
        $response.OutputStream.Close()
    }
}
