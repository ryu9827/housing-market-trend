param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('ryu9827', 'Bruce-Li_xero')]
    [string]$Account,

    [ValidateSet('local', 'global')]
    [string]$Scope = 'local',

    [string]$RemoteOwner,

    [switch]$Login
)

$ErrorActionPreference = 'Stop'

$profiles = @{
    'ryu9827' = @{
        Name = 'ryu9827'
        Email = 'ryu9827@gmail.com'
    }
    'Bruce-Li_xero' = @{
        Name = 'Bruce Li'
        Email = 'bruce.li@xero.com'
    }
}

if (-not $profiles.ContainsKey($Account)) {
    throw "Unsupported account: $Account"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'git is required but was not found in PATH.'
}

$profile = $profiles[$Account]
$scopeArg = if ($Scope -eq 'global') { '--global' } else { '--local' }

& git config $scopeArg user.name $profile.Name
& git config $scopeArg user.email $profile.Email

# Hint Git credential managers to prefer this username for github.com.
& git config --global credential.https://github.com.username $Account

$origin = (& git remote get-url origin).Trim()

$owner = $null
$repo = $null

if ($origin -match '^https://(?:[^@/]+@)?github\.com/([^/]+)/(.+?)(?:\.git)?$') {
    $owner = $Matches[1]
    $repo = $Matches[2]
} elseif ($origin -match '^git@github\.com:([^/]+)/(.+?)(?:\.git)?$') {
    $owner = $Matches[1]
    $repo = $Matches[2]
} else {
    throw "Unsupported origin URL format: $origin"
}

if ([string]::IsNullOrWhiteSpace($RemoteOwner)) {
    $RemoteOwner = $Account
}

$newOrigin = "https://$Account@github.com/$RemoteOwner/$repo.git"
& git remote set-url origin $newOrigin

if ($Login) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw 'gh CLI is required for -Login but was not found in PATH.'
    }

    Write-Host 'Starting GitHub login flow in browser...' -ForegroundColor Cyan
    & gh auth login -h github.com -p https -w
    & gh auth setup-git
}

$currentName = (& git config --get user.name).Trim()
$currentEmail = (& git config --get user.email).Trim()
$currentOrigin = (& git remote get-url origin).Trim()

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "Account: $Account"
Write-Host "Scope:   $Scope"
Write-Host "Name:    $currentName"
Write-Host "Email:   $currentEmail"
Write-Host "Origin:  $currentOrigin"
