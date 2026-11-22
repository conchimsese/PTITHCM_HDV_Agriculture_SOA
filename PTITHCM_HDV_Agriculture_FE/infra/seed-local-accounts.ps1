param(
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Password
)
$ErrorActionPreference = 'Stop'

function Send-AuthRequest($Action, $Body) {
    Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/auth/$Action" `
        -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 5) -TimeoutSec 10
}

$accounts = @(
    @{ username = 'nongdan.v5'; email = 'nongdan.v5@example.test'; role = 'FARMER'; profile = @{ fullName = 'Nông dân V5' } },
    @{ username = 'thuonglai.v5'; email = 'thuonglai.v5@example.test'; role = 'TRADER'; profile = @{ businessName = 'Thương lái V5' } }
)
foreach ($account in $accounts) {
    $credentials = @{ username = $account.username; password = $Password }
    try {
        $login = Send-AuthRequest login $credentials
        if ($login.role -ne $account.role) { throw "Unexpected role for $($account.username)" }
        Write-Output "$($account.username): $($login.role)"
        continue
    } catch {
        if (!$_.Exception.Response -or [int]$_.Exception.Response.StatusCode -notin 401,403) { throw }
    }

    try {
        $registered = Send-AuthRequest register ($account + @{ password = $Password })
        if ($registered.verificationEmailStatus -ne 'SENT') { throw "Mail was not sent for $($account.username)" }
    } catch {
        if (!$_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 409) { throw }
        $null = Send-AuthRequest resend-verification @{ email = $account.email }
    }

    $query = [Uri]::EscapeDataString("to:$($account.email)")
    $mail = $null
    for ($attempt = 0; $attempt -lt 15 -and !$mail; $attempt++) {
        $mail = (Invoke-RestMethod "http://localhost:8025/api/v1/search?query=$query" -TimeoutSec 5).messages |
            Select-Object -First 1
        if (!$mail) { Start-Sleep -Seconds 1 }
    }
    if (!$mail) { throw "No verification email for $($account.username)" }
    $message = Invoke-RestMethod "http://localhost:8025/api/v1/message/$($mail.ID)" -TimeoutSec 5
    $otp = [regex]::Match($message.Text, 'verification code is ([0-9]{6})').Groups[1].Value
    if (!$otp) { throw "Verification email did not contain the expected code" }
    $null = Send-AuthRequest verify-email @{ email = $account.email; otp = $otp }
    $login = Send-AuthRequest login $credentials
    if ($login.role -ne $account.role) { throw "Unexpected role for $($account.username)" }
    Write-Output "$($account.username): $($login.role)"
}
