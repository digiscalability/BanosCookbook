Param(
    [int]$StartupDelaySeconds = 20,
    [int]$PostShareWaitSeconds = 45
)

$ErrorActionPreference = 'Stop'

# Ensure Node.js is on PATH for child processes
if (-not ($env:PATH -like 'C:\Program Files\nodejs*')) {
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
}

Write-Host "Starting Next.js dev server..."
$startInfo = @{
    FilePath         = 'cmd.exe'
    ArgumentList     = @('/c', 'set PATH=C:\Program Files\nodejs;%PATH% && npm run dev')
    WorkingDirectory = 'D:\GitHUB\Clients\BanosCookbook'
    WindowStyle      = 'Hidden'
    PassThru         = $true
}
$serverProcess = Start-Process @startInfo

try {
    Write-Host "Waiting $StartupDelaySeconds seconds for server startup..."
    Start-Sleep -Seconds $StartupDelaySeconds

    $payload = @{
        title         = "Instagram Verification Recipe 2025-10-20"
        author        = "Automation Bot"
        description   = "Recipe created via script to verify Instagram posting flow"
        cuisine       = "Test Kitchen"
        ingredients   = @('1 cup flour', '2 eggs', 'Pinch of salt')
        instructions  = @('Mix ingredients', 'Bake for 20 minutes')
        imageUrl      = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'
        postToInstagram = $true
    } | ConvertTo-Json -Depth 5

    Write-Host "Creating recipe via API..."
    $response = Invoke-RestMethod -Uri 'http://localhost:9002/api/recipes' -Method Post -Body $payload -ContentType 'application/json'
    $responseJson = $response | ConvertTo-Json -Depth 5
    Write-Host "API response:`n$responseJson"

    if (-not $response.id) {
        throw "Recipe creation failed. No ID returned."
    }

    $script:CreatedRecipeId = $response.id
    Write-Host "Created recipe with ID: $script:CreatedRecipeId"

    Write-Host "Waiting $PostShareWaitSeconds seconds to allow Instagram posting to complete..."
    Start-Sleep -Seconds $PostShareWaitSeconds
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Write-Host "Stopping Next.js dev server..."
        try {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        } catch {}
        try {
            Wait-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
        } catch {}
    }
    Write-Host "Next.js dev server stopped."
}

if ($script:CreatedRecipeId) {
    Write-Host "Recipe created successfully: $script:CreatedRecipeId"
}
