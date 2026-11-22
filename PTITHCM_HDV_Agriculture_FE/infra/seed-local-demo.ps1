param(
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$Password,
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$MailpitUrl = "http://localhost:8025",
    [string]$EnvFile = "",
    [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"
if (!$EnvFile) {
    $EnvFile = Join-Path $PSScriptRoot ".env"
}
Add-Type -AssemblyName System.Net.Http

$script:Http = New-Object System.Net.Http.HttpClient
$script:Http.Timeout = [TimeSpan]::FromSeconds(20)

function U([string]$Escaped) {
    return [regex]::Unescape($Escaped)
}

function Read-EnvMap([string]$Path) {
    $map = @{}
    if (!(Test-Path $Path)) { return $map }
    foreach ($rawLine in (Get-Content -Path $Path -Encoding UTF8)) {
        $line = $rawLine.Trim()
        if (!$line -or $line.StartsWith("#")) { continue }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { continue }
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1).Trim()
        $map[$k] = $v
    }
    return $map
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [string]$Token = "",
        $Body = $null,
        [hashtable]$Headers = @{},
        [int[]]$AllowedStatusCodes = @()
    )

    $req = New-Object System.Net.Http.HttpRequestMessage ([System.Net.Http.HttpMethod]::new($Method.ToUpper())), $Url
    if ($Token) {
        $req.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    }
    foreach ($key in $Headers.Keys) {
        $null = $req.Headers.TryAddWithoutValidation($key, [string]$Headers[$key])
    }
    if ($null -ne $Body) {
        $json = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 10 -Compress) }
        $req.Content = New-Object System.Net.Http.StringContent($json, [System.Text.Encoding]::UTF8, "application/json")
    }

    $resp = $script:Http.SendAsync($req).GetAwaiter().GetResult()
    $status = [int]$resp.StatusCode
    $raw = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()

    if ($status -ge 200 -and $status -lt 300) {
        if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
        return ($raw | ConvertFrom-Json)
    }
    if ($AllowedStatusCodes -contains $status) {
        return [pscustomobject]@{ __status = $status; __raw = $raw }
    }
    throw "HTTP $status from $Method $Url`: $raw"
}

function Upload-SampleListingImage([string]$Token) {
    # Minimal valid 1x1 PNG image (blue-green pixel)
    $pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    $bytes = [Convert]::FromBase64String($pngBase64)

    $multipart = New-Object System.Net.Http.MultipartFormDataContent
    $fileContent = New-Object System.Net.Http.ByteArrayContent (, $bytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/png")
    $multipart.Add($fileContent, "images", "rice-lot-sample.png")

    $req = New-Object System.Net.Http.HttpRequestMessage ([System.Net.Http.HttpMethod]::Post), "$($GatewayUrl.TrimEnd('/'))/api/v1/listings/upload"
    $req.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
    $req.Content = $multipart

    $resp = $script:Http.SendAsync($req).GetAwaiter().GetResult()
    $status = [int]$resp.StatusCode
    $raw = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if ($status -lt 200 -or $status -ge 300) {
        throw "Upload failed HTTP $status`: $raw"
    }
    $parsed = $raw | ConvertFrom-Json
    return [string]$parsed.data.urls[0]
}

function Get-VerificationOtp([string]$Email, [string]$PreviousMailId = "") {
    $query = [Uri]::EscapeDataString("to:$Email")
    $mail = $null
    for ($attempt = 0; $attempt -lt 20 -and !$mail; $attempt++) {
        $search = Invoke-Api -Method "GET" -Url "$($MailpitUrl.TrimEnd('/'))/api/v1/search?query=$query"
        $top = $search.messages | Select-Object -First 1
        if ($top -and (!$PreviousMailId -or $top.ID -ne $PreviousMailId)) {
            $mail = $top
            break
        }
        Start-Sleep -Milliseconds 500
    }
    if (!$mail) { throw "No fresh verification email found in Mailpit for $Email" }
    $msg = Invoke-Api -Method "GET" -Url "$($MailpitUrl.TrimEnd('/'))/api/v1/message/$($mail.ID)"
    $m = [regex]::Match($msg.Text, "verification code is ([0-9]{6})")
    if (!$m.Success) { throw "Verification email for $Email did not contain a 6-digit OTP" }
    return @{ otp = $m.Groups[1].Value; mailId = [string]$mail.ID }
}

function Ensure-VerifiedLogin {
    param(
        [string]$Username,
        [string]$Email,
        [string]$Pass,
        [string]$Role,
        [hashtable]$RegisterProfile = @{},
        [switch]$AllowRegister
    )

    $base = $GatewayUrl.TrimEnd("/")
    $loginRes = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/login" `
        -Body @{ username = $Username; password = $Pass } -AllowedStatusCodes @(401, 403, 404)

    if ($null -ne $loginRes -and $loginRes.accessToken) {
        if ($Role -and $loginRes.role -ne $Role) {
            throw "Account $Username has role $($loginRes.role), expected $Role"
        }
        return $loginRes
    }

    $needsResend = $false
    if ($AllowRegister) {
        $regRes = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/register" -Body @{
            username = $Username
            email = $Email
            password = $Pass
            role = $Role
            profile = $RegisterProfile
        } -AllowedStatusCodes @(409)
        if ($null -ne $regRes -and $regRes.__status -eq 409) {
            $needsResend = $true
        }
    } else {
        $needsResend = $true
    }

    $mailQuery = [Uri]::EscapeDataString("to:$Email")
    $existingMail = (Invoke-Api -Method "GET" -Url "$($MailpitUrl.TrimEnd('/'))/api/v1/search?query=$mailQuery").messages | Select-Object -First 1
    if ($needsResend -and !$existingMail) {
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/resend-verification" -Body @{ email = $Email }
    }

    $otpInfo = Get-VerificationOtp -Email $Email
    $verifyRes = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/verify-email" -Body @{
        email = $Email
        otp   = $otpInfo.otp
    } -AllowedStatusCodes @(400)
    if ($null -ne $verifyRes -and $verifyRes.__status -eq 400) {
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/resend-verification" -Body @{ email = $Email }
        $otpInfo = Get-VerificationOtp -Email $Email -PreviousMailId $otpInfo.mailId
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/verify-email" -Body @{
            email = $Email
            otp   = $otpInfo.otp
        }
    }

    $loggedIn = Invoke-Api -Method "POST" -Url "$base/api/v1/auth/login" -Body @{ username = $Username; password = $Pass }
    if ($Role -and $loggedIn.role -ne $Role) {
        throw "Account $Username has role $($loggedIn.role), expected $Role"
    }
    return $loggedIn
}

$base = $GatewayUrl.TrimEnd("/")
$envMap = Read-EnvMap -Path $EnvFile

# 1. Verify seeded Admin account(s) from infra/.env (or -AdminPassword)
$admin1User = if ($envMap["ADMIN_1_USERNAME"]) { $envMap["ADMIN_1_USERNAME"] } else { "admin.v5" }
$admin1Email = if ($envMap["ADMIN_1_EMAIL"]) { $envMap["ADMIN_1_EMAIL"] } else { "admin-v5@example.test" }
$admin1Pass = if ($AdminPassword) { $AdminPassword } else { $envMap["ADMIN_1_PASSWORD"] }

$adminSession = $null
if ($admin1Pass) {
    $adminSession = Ensure-VerifiedLogin -Username $admin1User -Email $admin1Email -Pass $admin1Pass -Role "ADMIN"
    $accountsPage = Invoke-Api -Method "GET" -Url "$base/api/v1/admin/accounts?size=20" -Token $adminSession.accessToken
    Write-Output "[seed] Verified admin $admin1User (accounts visible: $($accountsPage.totalElements))"
} else {
    Write-Warning "[seed] ADMIN_1_PASSWORD not found in $EnvFile and -AdminPassword omitted; skipping admin verification."
}

$admin2User = $envMap["ADMIN_2_USERNAME"]
$admin2Email = $envMap["ADMIN_2_EMAIL"]
$admin2Pass = if ($AdminPassword) { $AdminPassword } else { $envMap["ADMIN_2_PASSWORD"] }
if ($admin2User -and $admin2Email -and $admin2Pass) {
    $admin2Session = Ensure-VerifiedLogin -Username $admin2User -Email $admin2Email -Pass $admin2Pass -Role "ADMIN"
    Write-Output "[seed] Verified secondary admin $admin2User ($($admin2Session.accountId))"
}

# 2. Ensure Farmer & Trader demo accounts + realistic profiles
$farmer = Ensure-VerifiedLogin -Username "nongdan.v5" -Email "nongdan.v5@example.test" -Pass $Password -Role "FARMER" `
    -RegisterProfile @{ fullName = (U "Nguy\u1ec5n V\u0103n An") } -AllowRegister
$null = Invoke-Api -Method "PUT" -Url "$base/api/v1/users/me" -Token $farmer.accessToken -Body @{
    fullName  = (U "Nguy\u1ec5n V\u0103n An")
    phone     = "0912345001"
    address   = (U "\u1ea4p Ch\u1ee3 C\u0169, Th\u1ecb tr\u1ea5n M\u1ef9 Xuy\u00ean")
    province  = (U "S\u00f3c Tr\u0103ng")
    district  = (U "M\u1ef9 Xuy\u00ean")
    avatarUrl = $null
}

$trader = Ensure-VerifiedLogin -Username "thuonglai.v5" -Email "thuonglai.v5@example.test" -Pass $Password -Role "TRADER" `
    -RegisterProfile @{ businessName = (U "HTX Thu mua L\u00faa g\u1ea1o C\u1eedu Long") } -AllowRegister
$null = Invoke-Api -Method "PUT" -Url "$base/api/v1/users/me" -Token $trader.accessToken -Body @{
    businessName = (U "HTX Thu mua L\u00faa g\u1ea1o C\u1eedu Long")
    phone        = "0988777002"
    address      = (U "KCN Tr\u00e0 N\u00f3c")
    province     = (U "C\u1ea7n Th\u01a1")
    district     = (U "B\u00ecnh Th\u1ee7y")
    avatarUrl    = $null
    buyingArea   = (U "\u0110\u1ed3ng b\u1eb1ng s\u00f4ng C\u1eedu Long")
}
Write-Output "[seed] Farmer ($($farmer.accountId)) & Trader ($($trader.accountId)) ready."

# 3. Farming plots, crop seasons, logs, costs (idempotent)
$existingPlots = (Invoke-Api -Method "GET" -Url "$base/api/v1/plots?page=0&size=50" -Token $farmer.accessToken).items
if ($null -eq $existingPlots) { $existingPlots = @() }

$plotDefs = @(
    @{
        key           = "st25"
        name          = (U "Ru\u1ed9ng ST25 M\u1ef9 Xuy\u00ean (L\u00f4 A1)")
        area          = 25000
        areaHa        = 2.5
        location      = (U "M\u1ef9 Xuy\u00ean, S\u00f3c Tr\u0103ng")
        description   = (U "\u0110\u1ea5t ph\u00f9 sa ven s\u00f4ng, canh t\u00e1c l\u00faa th\u01a1m ST25 h\u1eefu c\u01a1.")
        latitude      = 9.5582
        longitude     = 105.9865
        seasonName    = (U "V\u1ee5 \u0110\u00f4ng Xu\u00e2n 2026 - ST25")
        startDate     = "2026-01-15"
        cropType      = (U "L\u00faa th\u01a1m ST25")
        expectedYield = 18500
        listingPrice  = "148000000.00"
        log1Desc      = (U "C\u00e0y \u1ea3i, san ph\u1eb3ng m\u1eb7t ru\u1ed9ng v\u00e0 x\u1eed l\u00fd v\u00f4i kh\u1eed ph\u00e8n l\u00f4 A1.")
        log2Desc      = (U "B\u00f3n th\u00fac \u0111\u1ee3t 1 ph\u00e2n h\u1eefu c\u01a1 vi sinh & NPK.")
        cost1Cat      = (U "Gi\u1ed1ng l\u00faa ST25 & l\u00e0m \u0111\u1ea5t")
        cost1Amt      = "7500000.00"
        cost2Cat      = (U "Ph\u00e2n b\u00f3n & ch\u0103m s\u00f3c")
        cost2Amt      = "12000000.00"
    },
    @{
        key           = "om18"
        name          = (U "Ru\u1ed9ng OM18 Tho\u1ea1i S\u01a1n (L\u00f4 B2)")
        area          = 32000
        areaHa        = 3.2
        location      = (U "Tho\u1ea1i S\u01a1n, An Giang")
        description   = (U "V\u00f9ng chuy\u00ean canh l\u00faa OM18 ch\u1ea5t l\u01b0\u1ee3ng cao, thu\u1eadn ti\u1ec7n ghe t\u1ea3i.")
        latitude      = 10.2584
        longitude     = 105.2638
        seasonName    = (U "V\u1ee5 \u0110\u00f4ng Xu\u00e2n 2026 - OM18")
        startDate     = "2026-01-20"
        cropType      = (U "L\u00faa OM18")
        expectedYield = 24000
        listingPrice  = "168000000.00"
        log1Desc      = (U "Gieo s\u1ea1 h\u00e0ng gi\u1ed1ng x\u00e1c nh\u1eadn OM18.")
        log2Desc      = (U "\u0110i\u1ec1u ti\u1ebft n\u01b0\u1edbc theo quy tr\u00ecnh ng\u1eadp kh\u00f4 xen k\u1ebd.")
        cost1Cat      = (U "Gi\u1ed1ng l\u00faa OM18 & s\u1ea1 h\u00e0ng")
        cost1Amt      = "9200000.00"
        cost2Cat      = (U "B\u01a1m t\u01b0\u1edbi & v\u1eadt t\u01b0")
        cost2Amt      = "14500000.00"
    }
)

$seededPlots = @{}
foreach ($def in $plotDefs) {
    $plot = $existingPlots | Where-Object { $_.name -eq $def.name } | Select-Object -First 1
    if (!$plot) {
        $plot = Invoke-Api -Method "POST" -Url "$base/api/v1/plots" -Token $farmer.accessToken -Body @{
            name        = $def.name
            area        = $def.area
            location    = $def.location
            description = $def.description
            latitude    = $def.latitude
            longitude   = $def.longitude
        }
    } elseif ([double]$plot.area -lt 100) {
        $plot = Invoke-Api -Method "PUT" -Url "$base/api/v1/plots/$($plot.plotId)" -Token $farmer.accessToken -Body @{
            name        = $def.name
            area        = $def.area
            location    = $def.location
            description = $def.description
            latitude    = $def.latitude
            longitude   = $def.longitude
        }
        Write-Output "[seed] Upgraded plot '$($def.name)' area to $($plot.area) m2"
    }

    $seasonsResp = Invoke-Api -Method "GET" -Url "$base/api/v1/plots/$($plot.plotId)/crop-seasons" -Token $farmer.accessToken
    $seasons = if ($seasonsResp.items) { $seasonsResp.items } else { @() }
    $season = $seasons | Where-Object { $_.seasonName -eq $def.seasonName } | Select-Object -First 1
    if (!$season) {
        $season = Invoke-Api -Method "POST" -Url "$base/api/v1/plots/$($plot.plotId)/crop-seasons" -Token $farmer.accessToken -Body @{
            seasonName    = $def.seasonName
            startDate     = $def.startDate
            expectedYield = $def.expectedYield
            cropType      = $def.cropType
        }
    }

    $report = Invoke-Api -Method "GET" -Url "$base/api/v1/crop-seasons/$($season.cropSeasonId)/report" -Token $farmer.accessToken
    if (!$report.farmingLogs -or $report.farmingLogs.Count -eq 0) {
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/crop-seasons/$($season.cropSeasonId)/logs" -Token $farmer.accessToken -Body @{
            workType    = "LAND_PREPARATION"
            workDate    = "2026-01-16"
            description = $def.log1Desc
            quantity    = $def.areaHa
            unit        = "ha"
        }
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/crop-seasons/$($season.cropSeasonId)/logs" -Token $farmer.accessToken -Body @{
            workType    = "FERTILIZING"
            workDate    = "2026-02-05"
            description = $def.log2Desc
            quantity    = 150
            unit        = "kg"
        }
    }
    if (!$report.costs -or $report.costs.Count -eq 0) {
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/crop-seasons/$($season.cropSeasonId)/costs" -Token $farmer.accessToken -Body @{
            category     = $def.cost1Cat
            amount       = $def.cost1Amt
            incurredDate = "2026-01-16"
            description  = $def.log1Desc
        }
        $null = Invoke-Api -Method "POST" -Url "$base/api/v1/crop-seasons/$($season.cropSeasonId)/costs" -Token $farmer.accessToken -Body @{
            category     = $def.cost2Cat
            amount       = $def.cost2Amt
            incurredDate = "2026-02-05"
            description  = $def.log2Desc
        }
    }

    $seededPlots[$def.key] = @{
        plotId       = [string]$plot.plotId
        cropSeasonId = [string]$season.cropSeasonId
        expectedPrice = $def.listingPrice
    }
}

# 4. Trading listings + sample uploaded images (idempotent by cropSeasonId)
$existingListings = (Invoke-Api -Method "GET" -Url "$base/api/v1/listings?farmerId=$($farmer.accountId)&page=0&size=50" -Token $farmer.accessToken).items
if ($null -eq $existingListings) { $existingListings = @() }

$listings = @{}
foreach ($key in @("st25", "om18")) {
    $info = $seededPlots[$key]
    $found = $existingListings | Where-Object { $_.cropSeasonId -eq $info.cropSeasonId } | Select-Object -First 1
    if (!$found) {
        $imgUrl = Upload-SampleListingImage -Token $farmer.accessToken
        $found = Invoke-Api -Method "POST" -Url "$base/api/v1/listings" -Token $farmer.accessToken -Body @{
            plotId        = $info.plotId
            cropSeasonId  = $info.cropSeasonId
            expectedPrice = $info.expectedPrice
            images        = @($imgUrl)
        }
    }
    $listings[$key] = $found
}
Write-Output "[seed] Listings ready: ST25=$($listings['st25'].listingId), OM18=$($listings['om18'].listingId)"

# 5. Offers -> Accepted offer -> Chat conversation & messages -> Contract sample (idempotent)
$st25Listing = $listings["st25"]
$om18Listing = $listings["om18"]

$st25Offers = (Invoke-Api -Method "GET" -Url "$base/api/v1/offers?listingId=$($st25Listing.listingId)&traderId=$($trader.accountId)&page=0&size=20" -Token $trader.accessToken).items
$st25Offer = $st25Offers | Select-Object -First 1
if (!$st25Offer) {
    $st25Offer = Invoke-Api -Method "POST" -Url "$base/api/v1/offers" -Token $trader.accessToken -Body @{
        listingId    = $st25Listing.listingId
        offeredPrice = "142000000.00"
    }
}

$om18Offers = (Invoke-Api -Method "GET" -Url "$base/api/v1/offers?listingId=$($om18Listing.listingId)&traderId=$($trader.accountId)&page=0&size=20" -Token $trader.accessToken).items
$om18Offer = $om18Offers | Where-Object { $_.status -eq "ACCEPTED" } | Select-Object -First 1
if (!$om18Offer) {
    $pendingOm18 = $om18Offers | Where-Object { $_.status -eq "PENDING" } | Select-Object -First 1
    if (!$pendingOm18) {
        $pendingOm18 = Invoke-Api -Method "POST" -Url "$base/api/v1/offers" -Token $trader.accessToken -Body @{
            listingId    = $om18Listing.listingId
            offeredPrice = "165000000.00"
        }
    }
    $om18Offer = (Invoke-Api -Method "POST" -Url "$base/api/v1/offers/$($pendingOm18.offerId)/accept" -Token $farmer.accessToken -Body @{}).data
}

# Wait briefly for OFFER_ACCEPTED -> Chat conversation auto-creation
$conv = $null
for ($attempt = 0; $attempt -lt 30 -and !$conv; $attempt++) {
    $convPage = Invoke-Api -Method "GET" -Url "$base/api/v1/conversations?limit=50" -Token $trader.accessToken
    $conv = $convPage.data | Where-Object { $_.offerId -eq $om18Offer.offerId } | Select-Object -First 1
    if (!$conv) { Start-Sleep -Milliseconds 500 }
}
if (!$conv) {
    throw "Auto-created chat conversation was not found for accepted offer $($om18Offer.offerId)"
}

$msgHistory = Invoke-Api -Method "GET" -Url "$base/api/v1/conversations/$($conv.conversationId)/messages?limit=20" -Token $trader.accessToken
$userMsgs = @($msgHistory.data | Where-Object { $_.messageType -eq "TEXT" -or $_.messageType -eq "IMAGE" })
if ($userMsgs.Count -eq 0) {
    $null = Invoke-Api -Method "POST" -Url "$base/api/v1/conversations/$($conv.conversationId)/messages" -Token $trader.accessToken -Body @{
        messageType = "TEXT"
        content     = (U "Ch\u00e0o anh An, b\u00ean HTX ch\u1ed1t mua l\u00f4 OM18 gi\u00e1 165 tri\u1ec7u, nh\u1edd anh x\u00e1c nh\u1eadn \u0111\u1ed9 \u1ea9m v\u00e0 ng\u00e0y c\u1eaft l\u00faa.")
    }
    $null = Invoke-Api -Method "POST" -Url "$base/api/v1/conversations/$($conv.conversationId)/messages" -Token $farmer.accessToken -Body @{
        messageType = "TEXT"
        content     = (U "Ch\u00e0o anh Khoa, l\u00faa \u0111\u1ea1t \u0111\u1ed9 \u1ea9m kho\u1ea3ng 14%, d\u1ef1 ki\u1ebfn thu ho\u1ea1ch sau 2 tu\u1ea7n t\u1ea1i b\u1ebfn ghe Tho\u1ea1i S\u01a1n \u1ea1.")
    }
}

$convDetail = Invoke-Api -Method "GET" -Url "$base/api/v1/conversations/$($conv.conversationId)" -Token $trader.accessToken
$contractId = $convDetail.contractId
if (!$contractId) {
    $deliveryIso = (Get-Date).ToUniversalTime().AddDays(14).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $contractRes = Invoke-Api -Method "POST" -Url "$base/api/v1/payments/contracts" -Token $trader.accessToken -Body @{
        offerId        = $om18Offer.offerId
        conversationId = $conv.conversationId
        farmerId       = $farmer.accountId
        totalAmount    = "165000000.00"
        deliveryDate   = $deliveryIso
        terms          = (U "Giao l\u00faa OM18 t\u1ea1i b\u1ebfn ghe Tho\u1ea1i S\u01a1n, \u0111\u1ed9 \u1ea9m <= 14.5%, \u0111\u1eb7t c\u1ecdc 5% qua h\u1ec7 th\u1ed1ng.")
    } -AllowedStatusCodes @(409)
    if ($contractRes.__status -eq 409) {
        # Conversation already linked to an existing contract (e.g. Kafka lag on check)
        for ($i = 0; $i -lt 10 -and !$contractId; $i++) {
            Start-Sleep -Milliseconds 300
            $convDetail = Invoke-Api -Method "GET" -Url "$base/api/v1/conversations/$($conv.conversationId)" -Token $trader.accessToken
            $contractId = $convDetail.contractId
        }
    } else {
        $contractId = [string]$contractRes.contractId
        for ($i = 0; $i -lt 10; $i++) {
            $convDetail = Invoke-Api -Method "GET" -Url "$base/api/v1/conversations/$($conv.conversationId)" -Token $trader.accessToken
            if ($convDetail.contractId) { break }
            Start-Sleep -Milliseconds 300
        }
    }
}

Write-Output "[seed] Summary:"
[pscustomobject]@{
    adminUsername   = $admin1User
    farmerUsername  = "nongdan.v5"
    farmerId        = $farmer.accountId
    traderUsername  = "thuonglai.v5"
    traderId        = $trader.accountId
    st25ListingId   = $st25Listing.listingId
    st25OfferId     = $st25Offer.offerId
    om18ListingId   = $om18Listing.listingId
    om18OfferId     = $om18Offer.offerId
    conversationId  = $conv.conversationId
    contractId      = $contractId
} | ConvertTo-Json -Depth 4
