$ErrorActionPreference = "Stop"
$labRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$targets = @(
    (Join-Path $labRoot ".venv"),
    (Join-Path $labRoot ".tmp"),
    (Join-Path $labRoot "models"),
    (Join-Path $labRoot "output")
)

foreach ($target in $targets) {
    $resolvedRoot = [System.IO.Path]::GetFullPath($labRoot)
    $resolvedTarget = [System.IO.Path]::GetFullPath($target)
    if (-not $resolvedTarget.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a path outside the OCR lab: $resolvedTarget"
    }
    if (Test-Path -LiteralPath $resolvedTarget) {
        Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
        Write-Host "Removed $resolvedTarget"
    }
}

Write-Host "OCR lab runtime data removed. Source files were kept."
