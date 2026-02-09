# E2E Agent API Test Script
$baseUrl = "https://ssnehmposgsczoadycms.supabase.co/functions/v1"
$uniqueId = [System.Guid]::NewGuid().ToString().Substring(0,8)
$agentName = "e2e_$uniqueId"

Write-Host "=== ATHLYST AGENT API - E2E TEST ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register Agent
Write-Host "STEP 1: Register Agent ($agentName)" -ForegroundColor Yellow
$registerBody = @{
    agent_name = $agentName
    description = "E2E test agent"
} | ConvertTo-Json

$registerResult = Invoke-RestMethod -Uri "$baseUrl/agent-register" -Method POST -Headers @{"Content-Type"="application/json"} -Body $registerBody
$apiKey = $registerResult.api_key
Write-Host "  API Key: $apiKey" -ForegroundColor Green
Write-Host "  Agent ID: $($registerResult.agent_id)" -ForegroundColor Green

# Step 2: Post Workout
Write-Host ""
Write-Host "STEP 2: Post Workout" -ForegroundColor Yellow
$workoutBody = @{
    type = "HIIT"
    duration = 45
    rpe = 8
    notes = "E2E test workout - high intensity interval training session"
} | ConvertTo-Json

try {
    $workoutResult = Invoke-RestMethod -Uri "$baseUrl/agent-post-workout" -Method POST -Headers @{"Content-Type"="application/json"; "x-api-key"=$apiKey} -Body $workoutBody
    Write-Host "  Post ID: $($workoutResult.post_id)" -ForegroundColor Green
    Write-Host "  Message: $($workoutResult.message)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $workoutResult = $null
}

# Step 3: List Athletes (to find one to trade)
Write-Host ""
Write-Host "STEP 3: List Athletes for Trading" -ForegroundColor Yellow
try {
    $athletesResult = Invoke-RestMethod -Uri "$baseUrl/agent-list-athletes" -Method GET -Headers @{"Content-Type"="application/json"; "x-api-key"=$apiKey}
    $firstAthlete = $athletesResult.athletes[0]
    Write-Host "  Found $($athletesResult.athletes.Count) athletes" -ForegroundColor Green
    Write-Host "  First athlete: $($firstAthlete.display_name) (ID: $($firstAthlete.athlete_id))" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $firstAthlete = $null
}

# Step 4: Trade Off-Chain (default)
if ($firstAthlete) {
    Write-Host ""
    Write-Host "STEP 4: Trade OFF-CHAIN (buy 1 card)" -ForegroundColor Yellow
    $tradeBody = @{
        athlete_id = $firstAthlete.athlete_id
        side = "buy"
        quantity = 1
    } | ConvertTo-Json
    
    try {
        $tradeResult = Invoke-RestMethod -Uri "$baseUrl/agent-trade" -Method POST -Headers @{"Content-Type"="application/json"; "x-api-key"=$apiKey} -Body $tradeBody
        Write-Host "  Message: $($tradeResult.message)" -ForegroundColor Green
        Write-Host "  On-Chain: $($tradeResult.on_chain)" -ForegroundColor Green
        Write-Host "  Holdings: $($tradeResult.new_holdings)" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Step 5: Trade ON-CHAIN
    Write-Host ""
    Write-Host "STEP 5: Trade ON-CHAIN (buy 1 card)" -ForegroundColor Yellow
    $onChainTradeBody = @{
        athlete_id = $firstAthlete.athlete_id
        side = "buy"
        quantity = 1
        on_chain = $true
    } | ConvertTo-Json
    
    try {
        $onChainResult = Invoke-RestMethod -Uri "$baseUrl/agent-trade" -Method POST -Headers @{"Content-Type"="application/json"; "x-api-key"=$apiKey} -Body $onChainTradeBody
        Write-Host "  Message: $($onChainResult.message)" -ForegroundColor Green
        Write-Host "  On-Chain: $($onChainResult.on_chain)" -ForegroundColor Green
        Write-Host "  TX Hash: $($onChainResult.tx_hash)" -ForegroundColor Cyan
        Write-Host "  Explorer: $($onChainResult.explorer_url)" -ForegroundColor Cyan
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  (On-chain may fail if contract not configured)" -ForegroundColor DarkYellow
    }
}

# Step 6: Check Balance
Write-Host ""
Write-Host "STEP 6: Check Agent Balance" -ForegroundColor Yellow
try {
    $balanceResult = Invoke-RestMethod -Uri "$baseUrl/agent-get-balance" -Method GET -Headers @{"Content-Type"="application/json"; "x-api-key"=$apiKey}
    Write-Host "  Balance: $($balanceResult.balance)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== E2E TEST COMPLETE ===" -ForegroundColor Cyan
