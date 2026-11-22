param(
    [int]$Port = 8093,
    [string]$ServiceKey = 'learning-only-key'
)

# Learning-only stand-in: every offer is treated as part of one listing.
# Stop with Ctrl+C. This process keeps its winner only in memory.
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$winner = $null
$listingId = [guid]::NewGuid().ToString()
$listener.Start()
Write-Host "Learning Trading stub at http://127.0.0.1:$Port (one listing: $listingId)"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $status = 404
        $result = @{ code = 'NOT_FOUND' }
        try {
            if ($request.Headers['X-Service-Key'] -ne $ServiceKey) {
                $status = 403
                $result = @{ code = 'FORBIDDEN' }
            } elseif ($request.Url.AbsolutePath -match '^/internal/v1/offers/([0-9a-fA-F-]{36})/deposit-commit$') {
                $offerId = $Matches[1].ToLowerInvariant()
                if ($request.HttpMethod -eq 'POST') {
                    $reader = [System.IO.StreamReader]::new($request.InputStream)
                    try { $body = $reader.ReadToEnd() | ConvertFrom-Json }
                    finally { $reader.Dispose() }
                    $key = $request.Headers['Idempotency-Key']
                    if (-not $key -or $key -ne $body.paymentTrackingId -or $body.currency -ne 'VND' -or
                        -not $body.contractId -or -not $body.depositAmount) {
                        $status = 400
                        $result = @{ code = 'VALIDATION_ERROR' }
                    } elseif ($null -eq $winner) {
                        $winner = @{
                            offerId = $offerId
                            listingId = $listingId
                            contractId = $body.contractId
                            paymentTrackingId = $body.paymentTrackingId
                            listingStatus = 'LOCKED'
                            depositAmount = $body.depositAmount
                        }
                        $status = 200
                        $result = $winner
                    } elseif ($winner.offerId -eq $offerId -and $winner.contractId -eq $body.contractId -and
                              $winner.paymentTrackingId -eq $body.paymentTrackingId -and
                              $winner.depositAmount -eq $body.depositAmount) {
                        $status = 200
                        $result = $winner
                    } else {
                        $status = 409
                        $result = @{ code = 'LISTING_ALREADY_COMMITTED' }
                    }
                } elseif ($request.HttpMethod -eq 'GET') {
                    if ($null -ne $winner -and $winner.offerId -eq $offerId -and
                        $winner.contractId -eq $request.QueryString['contractId'] -and
                        $winner.paymentTrackingId -eq $request.QueryString['paymentTrackingId']) {
                        $status = 200
                        $result = $winner
                    }
                }
            }
        } catch {
            $status = 400
            $result = @{ code = 'VALIDATION_ERROR' }
        }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes(($result | ConvertTo-Json -Compress))
        $response.StatusCode = $status
        $response.ContentType = 'application/json'
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
