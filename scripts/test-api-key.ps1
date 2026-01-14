# 測試 Anthropic API Key
# 使用方式: .\scripts\test-api-key.ps1

Write-Host "🧪 測試 Anthropic API Key..." -ForegroundColor Cyan
Write-Host ""

# 讀取環境變數
$apiKey = $env:ANTHROPIC_API_KEY

if (-not $apiKey) {
    Write-Host "❌ 錯誤: 未設定 ANTHROPIC_API_KEY 環境變數" -ForegroundColor Red
    Write-Host ""
    Write-Host "請設定環境變數:" -ForegroundColor Yellow
    Write-Host "  `$env:ANTHROPIC_API_KEY = 'sk-ant-api03-...'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "或在 .env.local 中設定後重新載入:" -ForegroundColor Yellow
    Write-Host "  ANTHROPIC_API_KEY=sk-ant-api03-..." -ForegroundColor Yellow
    exit 1
}

# 檢查格式
if (-not $apiKey.StartsWith('sk-ant-')) {
    Write-Host "❌ 錯誤: API Key 格式不正確" -ForegroundColor Red
    Write-Host "  預期前綴: sk-ant-" -ForegroundColor Yellow
    Write-Host "  當前前綴: $($apiKey.Substring(0, [Math]::Min(7, $apiKey.Length)))" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ API Key 格式正確" -ForegroundColor Green
Write-Host "  Key 長度: $($apiKey.Length)" -ForegroundColor Gray
Write-Host "  Key 前綴: $($apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)))..." -ForegroundColor Gray
Write-Host ""

# 測試 API 調用
Write-Host "📡 測試 API 調用..." -ForegroundColor Cyan

$headers = @{
    'Content-Type' = 'application/json'
    'x-api-key' = $apiKey
    'anthropic-version' = '2023-06-01'
    'User-Agent' = 'Health-Care-Assistant/1.0'
}

$body = @{
    model = 'claude-sonnet-4-20250514'
    max_tokens = 100
    system = '你是一個專業的醫療助理。'
    messages = @(
        @{
            role = 'user'
            content = '請簡單介紹你自己'
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri 'https://api.anthropic.com/v1/messages' -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "✅ API 調用成功!" -ForegroundColor Green
    Write-Host ""
    Write-Host "回應內容:" -ForegroundColor Cyan
    $content = $response.content | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }
    Write-Host $content -ForegroundColor White
    Write-Host ""
    Write-Host "使用的模型: $($response.model)" -ForegroundColor Gray
    Write-Host "Token 使用: $($response.usage.input_tokens) input + $($response.usage.output_tokens) output = $($response.usage.input_tokens + $response.usage.output_tokens) total" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎉 API Key 測試通過!" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.ErrorDetails.Message
    
    Write-Host "❌ API 調用失敗" -ForegroundColor Red
    Write-Host "  狀態碼: $statusCode" -ForegroundColor Yellow
    
    if ($errorMessage) {
        try {
            $errorJson = $errorMessage | ConvertFrom-Json
            Write-Host "  錯誤類型: $($errorJson.error.type)" -ForegroundColor Yellow
            Write-Host "  錯誤訊息: $($errorJson.error.message)" -ForegroundColor Yellow
        } catch {
            Write-Host "  錯誤訊息: $errorMessage" -ForegroundColor Yellow
        }
    }
    
    if ($statusCode -eq 403) {
        Write-Host ""
        Write-Host "⚠️  可能的問題:" -ForegroundColor Yellow
        Write-Host "  1. API Key 可能是 Claude Code subscription 類型（2026年1月9日後被限制）" -ForegroundColor Yellow
        Write-Host "  2. 請確認您的 API Key 是標準的 Anthropic API Key" -ForegroundColor Yellow
        Write-Host "  3. 創建位置: https://console.anthropic.com/settings/keys" -ForegroundColor Yellow
    }
    
    exit 1
}
