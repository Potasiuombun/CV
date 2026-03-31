$ErrorActionPreference = "Stop"
$nodeDir = Get-ChildItem "$PSScriptRoot/.node" -Directory | Where-Object { $_.Name -like "node-v*" } | Select-Object -First 1
if (-not $nodeDir) {
  throw "Local Node.js not found in .node/."
}
$env:Path = "$($nodeDir.FullName);$env:Path"
& "$($nodeDir.FullName)/npm.cmd" run dev -- --host localhost --port 5173
