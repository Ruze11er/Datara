# Creates "Datara" shortcuts on the Desktop and in the Start menu, so the app opens with a double-click.
# Run with: npm run shortcut
#
# The shortcut starts the built app (out/) with npm's Electron, the same way `npm start` does. That works with
# Windows Smart App Control, which blocks the unsigned packaged Datara.exe. After changing code or content,
# run `npm run build` again; the shortcut always opens the latest build.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$icon = Join-Path $root 'build\icon.ico'
$built = Join-Path $root 'out\main\index.js'

if (-not (Test-Path $electron)) {
  throw "Electron is not installed. Run 'npm install' in $root first."
}
if (-not (Test-Path $icon)) {
  throw "The icon is missing. Run 'npm run icons' first."
}
if (-not (Test-Path $built)) {
  Write-Host 'The app has not been built yet. Building it now (npm run build)...'
  Push-Location $root
  try { npm run build } finally { Pop-Location }
  if (-not (Test-Path $built)) { throw 'The build failed, so no shortcut was created.' }
}

$shell = New-Object -ComObject WScript.Shell
$folders = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
)
foreach ($folder in $folders) {
  $path = Join-Path $folder 'Datara.lnk'
  $link = $shell.CreateShortcut($path)
  $link.TargetPath = $electron
  $link.Arguments = '"' + $root + '"'   # the project folder: Electron runs package.json's "main" (out/main/index.js)
  $link.WorkingDirectory = $root
  $link.IconLocation = "$icon,0"
  $link.Description = 'Datara: learn data analytics with SQL and Python'
  $link.Save()
  Write-Host "Created $path"
}
Write-Host 'Done. Double-click "Datara" on your Desktop or search for it in the Start menu.'
