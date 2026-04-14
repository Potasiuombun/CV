$ErrorActionPreference = "Stop"

$nodeDir = Get-ChildItem "$PSScriptRoot/.node" -Directory | Where-Object { $_.Name -like "node-v*" } | Select-Object -First 1
if (-not $nodeDir) {
  throw "Local Node.js not found in .node/."
}

if (-not $env:OLD_PATH_NODEENV) {
  $env:OLD_PATH_NODEENV = $env:Path
}

$env:NODEENV_ACTIVE = "1"
$env:NODEENV_ROOT = $nodeDir.FullName
$env:Path = "$($nodeDir.FullName);$env:Path"

Write-Output "Node environment activated: $($nodeDir.FullName)"
Write-Output "Run Deactivate-NodeEnv.ps1 to restore your previous PATH."
