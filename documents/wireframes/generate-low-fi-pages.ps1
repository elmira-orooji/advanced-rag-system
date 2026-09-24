$sourcePath = Join-Path $PSScriptRoot 'nexora-wireframes-low-fi.svg'
$outputDirectory = Join-Path $PSScriptRoot 'low-fi-pages'
$pageNames = @(
  '01-login',
  '02-workspace',
  '03-conversation',
  '04-knowledge-base',
  '05-upload-ocr-retry',
  '06-connector',
  '07-assistants',
  '08-team-members',
  '09-settings',
  '10-analytics-export',
  '11-notifications',
  '12-confirmation-modal',
  '13-empty-state',
  '14-error-retry',
  '15-mobile-drawer',
  '16-mobile-conversation',
  '17-mobile-source-sheet',
  '18-mobile-filters'
)

$style = @'
<style>
  .canvas{fill:#fafbfc}.board{fill:#fff;stroke:#8d98a7;stroke-width:1.5}.thin{fill:none;stroke:#8d98a7;stroke-width:1.3}.shade{fill:#edf0f3;stroke:#8d98a7;stroke-width:1.1}.label{font:600 13px sans-serif;fill:#344054}.sub{font:11px sans-serif;fill:#667085}.ghost{stroke:#b7c0cb;stroke-width:5;stroke-linecap:round}.mini{stroke:#b7c0cb;stroke-width:3;stroke-linecap:round}.dot{fill:#aab4c1}
</style>
'@

$content = Get-Content -Raw $sourcePath
$groups = [regex]::Matches($content, '<g transform="translate\([^)]*\)">.*?</g>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($groups.Count -ne $pageNames.Count) {
  throw "Expected $($pageNames.Count) wireframe boards, found $($groups.Count)."
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
for ($index = 0; $index -lt $pageNames.Count; $index++) {
  $board = $groups[$index].Value -replace 'translate\([^)]*\)', 'translate(10 10)'
  $svg = "<svg xmlns=`"http://www.w3.org/2000/svg`" width=`"540`" height=`"320`" viewBox=`"0 0 540 320`"><rect width=`"540`" height=`"320`" class=`"canvas`"/>$style$board</svg>"
  Set-Content -Path (Join-Path $outputDirectory "$($pageNames[$index]).svg") -Value $svg -Encoding utf8NoBOM
}

Write-Output "Created $($pageNames.Count) individual low-fi SVG wireframes in $outputDirectory"
