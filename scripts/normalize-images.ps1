$imagesDir = Join-Path $PSScriptRoot '..' 'public/images/tutorials'
$imagesDir = [System.IO.Path]::GetFullPath($imagesDir)

if (-not (Test-Path $imagesDir)) {
    Write-Host "Images directory not found: $imagesDir"
    exit 1
}

Get-ChildItem $imagesDir -File | ForEach-Object {
    if ($_.Name -match '^Pasted image (.+)\.png$') {
        $newName = "pasted-image-$($matches[1]).png"
        $newName = $newName -replace '\s+', '-'
        if ($_.Name -ne $newName) {
            Rename-Item -Path $_.FullName -NewName $newName
        }
    }
}

Write-Host "Normalized image names in $imagesDir"
