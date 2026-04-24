$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = "C:\Users\Fadhi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$systemNode = $null

try {
    $systemNode = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
} catch {
    $systemNode = $null
}

$nodePath = @($systemNode, $bundledNode) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $nodePath) {
    throw "Node.js was not found. Install Node.js or update run-chatbot.ps1 with a valid node.exe path."
}

& $nodePath (Join-Path $root "server.mjs")
