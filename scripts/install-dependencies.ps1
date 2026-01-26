# OS Athena Dependency Installer for Windows
# Detects and installs: OS Athena app, ollama, ngrok CLI, github CLI

#Requires -RunAsAdministrator

# Colors for output (PowerShell 5+)
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Error { Write-ColorOutput Red $args }

# Check if command exists
function Test-CommandExists {
    param([string]$Command)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try {
        if (Get-Command $Command) { return $true }
    } catch { return $false }
    finally { $ErrorActionPreference = $oldPreference }
}

# Check OS Athena installation
function Test-OsAthenaInstalled {
    $localBin = Join-Path $env:USERPROFILE ".local\bin\os-athena.exe"
    $programFiles = Join-Path $env:LOCALAPPDATA "Programs\os-athena\os-athena.exe"

    if (Test-CommandExists "os-athena") { return $true }
    if (Test-Path $localBin) { return $true }
    if (Test-Path $programFiles) { return $true }

    return $false
}

# Install OS Athena
function Install-OsAthena {
    Write-Info "Installing OS Athena..."

    try {
        # Get latest release URL from GitHub API
        $apiUrl = "https://api.github.com/repos/raynaythegreat/OS-Athena/releases/latest"
        $response = Invoke-RestMethod -Uri $apiUrl
        $exeAsset = $response.assets | Where-Object { $_.name -like "*.exe" -and $_.name -notlike "*.blockmap*" } | Select-Object -First 1

        if (-not $exeAsset) {
            Write-Warning "Could not auto-detect download URL."
            Write-Warning "Please visit: https://github.com/raynaythegreat/OS-Athena/releases/latest"
            return $false
        }

        $downloadUrl = $exeAsset.browser_download_url
        $outputPath = "$env:TEMP\os-athena-installer.exe"

        Write-Info "Downloading from: $downloadUrl"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath -UseBasicParsing

        Write-Info "Running installer..."
        Start-Process -FilePath $outputPath -Wait

        Remove-Item $outputPath -ErrorAction SilentlyContinue
        Write-Success "✓ OS Athena installed"
        return $true
    } catch {
        Write-Error "Failed to install OS Athena: $_"
        return $false
    }
}

# Check Ollama
function Test-OllamaInstalled {
    if (Test-CommandExists "ollama") { return $true }
    return $false
}

# Install Ollama
function Install-Ollama {
    Write-Info "Installing Ollama..."

    try {
        $downloadUrl = "https://ollama.com/download/OllamaSetup.exe"
        $outputPath = "$env:TEMP\ollama-installer.exe"

        Write-Info "Downloading Ollama installer..."
        Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath -UseBasicParsing

        Write-Info "Running installer..."
        Start-Process -FilePath $outputPath -Wait

        Remove-Item $outputPath -ErrorAction SilentlyContinue
        Write-Success "✓ Ollama installed"
        return $true
    } catch {
        Write-Error "Failed to install Ollama: $_"
        return $false
    }
}

# Check Ngrok
function Test-NgrokInstalled {
    if (Test-CommandExists "ngrok") { return $true }

    # Check in user bin directory
    $userBin = Join-Path $env:USERPROFILE ".local\bin\ngrok.exe"
    if (Test-Path $userBin) { return $true }

    return $false
}

# Install Ngrok
function Install-Ngrok {
    Write-Info "Installing Ngrok CLI..."

    try {
        # Detect architecture
        $arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
        $downloadUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-$arch.zip"
        $outputPath = "$env:TEMP\ngrok.zip"
        $extractPath = "$env:TEMP\ngrok"

        Write-Info "Downloading Ngrok CLI..."
        Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath -UseBasicParsing

        Write-Info "Extracting..."
        Expand-Archive -Path $outputPath -DestinationPath $extractPath -Force

        # Create user bin directory
        $userBin = Join-Path $env:USERPROFILE ".local\bin"
        New-Item -ItemType Directory -Path $userBin -Force | Out-Null

        # Move ngrok.exe
        Move-Item -Path "$extractPath\ngrok.exe" -Destination "$userBin\ngrok.exe" -Force

        # Cleanup
        Remove-Item $outputPath -ErrorAction SilentlyContinue
        Remove-Item $extractPath -Recurse -ErrorAction SilentlyContinue

        # Add to PATH if not already there
        $pathEnv = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($pathEnv -notlike "*$userBin*") {
            [Environment]::SetEnvironmentVariable("Path", "$pathEnv;$userBin", "User")
            Write-Warning "Added $userBin to user PATH. Restart your terminal for changes to take effect."
        }

        Write-Success "✓ Ngrok CLI installed to $userBin\ngrok.exe"
        return $true
    } catch {
        Write-Error "Failed to install Ngrok: $_"
        return $false
    }
}

# Check GitHub CLI
function Test-GhInstalled {
    if (Test-CommandExists "gh") { return $true }
    return $false
}

# Install GitHub CLI
function Install-Gh {
    Write-Info "Installing GitHub CLI..."

    try {
        # Use winget if available
        if (Test-CommandExists "winget") {
            Write-Info "Using winget to install GitHub CLI..."
            Start-Process -FilePath "winget" -ArgumentList "install", "--id", "GitHub.cli", "--accept-source-agreements", "--accept-package-agreements" -Wait -NoNewWindow
        } else {
            # Fallback to manual download
            $downloadUrl = "https://github.com/cli/cli/releases/latest/download/gh-windows-amd64.exe"
            $userBin = Join-Path $env:USERPROFILE ".local\bin"
            New-Item -ItemType Directory -Path $userBin -Force | Out-Null
            $outputPath = "$userBin\gh.exe"

            Write-Info "Downloading GitHub CLI..."
            Invoke-WebRequest -Uri $downloadUrl -OutFile $outputPath -UseBasicParsing

            # Add to PATH if not already there
            $pathEnv = [Environment]::GetEnvironmentVariable("Path", "User")
            if ($pathEnv -notlike "*$userBin*") {
                [Environment]::SetEnvironmentVariable("Path", "$pathEnv;$userBin", "User")
                Write-Warning "Added $userBin to user PATH. Restart your terminal for changes to take effect."
            }
        }

        Write-Success "✓ GitHub CLI installed"
        return $true
    } catch {
        Write-Error "Failed to install GitHub CLI: $_"
        return $false
    }
}

# Main installation flow
function Main {
    Write-Info "=== OS Athena Dependency Installer ==="
    Write-Info "Platform: Windows"
    Write-Output ""

    # Track what needs installation
    $installOsAthena = -not (Test-OsAthenaInstalled)
    $installOllama = -not (Test-OllamaInstalled)
    $installNgrok = -not (Test-NgrokInstalled)
    $installGh = -not (Test-GhInstalled)

    # Show status
    Write-Output "Checking dependencies..."

    if (-not $installOsAthena) { Write-Success "✓ OS Athena installed" }
    else { Write-Warning "✗ OS Athena not found" }

    if (-not $installOllama) { Write-Success "✓ Ollama installed" }
    else { Write-Warning "✗ Ollama not found" }

    if (-not $installNgrok) { Write-Success "✓ Ngrok CLI installed" }
    else { Write-Warning "✗ Ngrok CLI not found" }

    if (-not $installGh) { Write-Success "✓ GitHub CLI installed" }
    else { Write-Warning "✗ GitHub CLI not found" }

    Write-Output ""

    # If everything is installed
    if (-not $installOsAthena -and -not $installOllama -and -not $installNgrok -and -not $installGh) {
        Write-Success "=== All Dependencies Already Installed! ==="
        Write-Output ""
        Write-Output "You're ready to use OS Athena!"
        Write-Output ""
        Write-Output "Next steps:"
        Write-Output "1. Launch OS Athena"
        Write-Output "2. Go to Settings and configure API keys:"
        Write-Output "   - Ngrok API Key (get from https://dashboard.ngrok.com/api-keys)"
        Write-Output "   - Vercel Token (get from https://vercel.com/account/tokens)"
        Write-Output "   - GitHub Token (get from https://github.com/settings/tokens)"
        Write-Output "3. For mobile deployment: Click 'Mobile' tab → 'Launch Mobile Version'"
        return
    }

    # Show what will be installed
    Write-Output "The following will be installed:"
    if ($installOsAthena) { Write-Output "  - OS Athena" }
    if ($installOllama) { Write-Output "  - Ollama (for local AI)" }
    if ($installNgrok) { Write-Output "  - Ngrok CLI (for mobile access)" }
    if ($installGh) { Write-Output "  - GitHub CLI (for repository management)" }
    Write-Output ""

    # Ask for confirmation
    $response = Read-Host "Continue? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Output "Installation cancelled."
        return
    }

    # Install missing components
    if ($installOsAthena) { Install-OsAthena | Out-Null }
    if ($installOllama) { Install-Ollama | Out-Null }
    if ($installNgrok) { Install-Ngrok | Out-Null }
    if ($installGh) { Install-Gh | Out-Null }

    Write-Output ""
    Write-Success "=== Installation Complete! ==="
    Write-Output ""
    Write-Output "Next steps:"
    Write-Output "1. Launch OS Athena"
    Write-Output "2. Go to Settings and configure API keys:"
    Write-Output "   - Ngrok API Key (get from https://dashboard.ngrok.com/api-keys)"
    Write-Output "   - Vercel Token (get from https://vercel.com/account/tokens)"
    Write-Output "   - GitHub Token (get from https://github.com/settings/tokens)"
    Write-Output "3. For mobile deployment: Click 'Mobile' tab → 'Launch Mobile Version'"

    Write-Warning "Note: If PATH was modified, restart your terminal for changes to take effect."
}

# Run main function
Main
