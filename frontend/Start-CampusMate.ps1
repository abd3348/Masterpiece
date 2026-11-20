$ErrorActionPreference = 'Stop'
$env:MSBuildEnableWorkloadResolver = 'false'
Push-Location $PSScriptRoot
try {
    & dotnet run --project backend/CampusMate.csproj --launch-profile CampusMate
} finally {
    Pop-Location
}
