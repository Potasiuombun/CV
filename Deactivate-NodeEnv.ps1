if ($env:OLD_PATH_NODEENV) {
  $env:Path = $env:OLD_PATH_NODEENV
  Remove-Item Env:OLD_PATH_NODEENV -ErrorAction SilentlyContinue
}

Remove-Item Env:NODEENV_ACTIVE -ErrorAction SilentlyContinue
Remove-Item Env:NODEENV_ROOT -ErrorAction SilentlyContinue

Write-Output "Node environment deactivated."
