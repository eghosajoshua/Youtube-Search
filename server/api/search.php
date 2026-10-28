<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/settings.php';

if (empty($_SESSION['authed'])) json_err('Not authenticated', 401);

$q         = trim($_GET['q']         ?? '');
$order     = $_GET['order']          ?? 'relevance';   // relevance|date|viewCount
$published = $_GET['publishedAfter'] ?? '';             // ISO 8601 e.g. 2024-01-01T00:00:00Z
$pubBefore = $_GET['publishedBefore'] ?? '';
$maxRes    = min((int)($_GET['maxResults'] ?? 20), 50);
$pageToken = $_GET['pageToken']      ?? '';
$type      = 'video';

if ($q === '') json_err('Query is required');

$allowed_order = ['relevance','date','viewCount','rating'];
if (!in_array($order, $allowed_order, true)) $order = 'relevance';

$pdo = db();
$userId = null;
$keys = [];
$baseKeyIndex = 0;
if (!empty($_SESSION['user_id'])) {
    $userId = (int)$_SESSION['user_id'];
    $keys = get_user_key_order($pdo, $userId);
    $baseKeyIndex = get_user_key_index($pdo, $userId);
}

if (empty($keys)) {
    json_err('No working YouTube API key available for your account. Add keys in Settings.', 503);
}

$searchResult = null;
$lastError = null;
foreach ($keys as $idx => $key) {
    $params = [
        'part'       => 'snippet',
        'q'          => $q,
        'type'       => $type,
        'order'      => $order,
        'maxResults' => $maxRes,
        'key'        => $key,
    ];
    if ($published) $params['publishedAfter']  = $published;
    if ($pubBefore) $params['publishedBefore'] = $pubBefore;
    if ($pageToken) $params['pageToken']       = $pageToken;

    $url = YT_API_BASE . '/search?' . http_build_query($params);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) {
        $lastError = "cURL error: $err";
        continue;
    }

    $yt = json_decode($body, true);
    if (isset($yt['error'])) {
        if (is_yt_error_retryable($yt['error'])) {
            $lastError = $yt['error']['message'] ?? 'YouTube API error';
            continue;
        }
        json_err($yt['error']['message'] ?? 'YouTube API error', 502);
    }

    $videoIds = array_map(fn($i) => $i['id']['videoId'], $yt['items'] ?? []);
    $details = ['items' => []];
    if (!empty($videoIds)) {
        $detailParams = [
            'part' => 'snippet,statistics',
            'id'   => implode(',', $videoIds),
            'key'  => $key,
        ];
        $detailUrl = YT_API_BASE . '/videos?' . http_build_query($detailParams);

        $ch2 = curl_init($detailUrl);
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $detailBody = curl_exec($ch2);
        $detailErr  = curl_error($ch2);
        curl_close($ch2);

        if ($detailErr) {
            $lastError = "cURL error: $detailErr";
            continue;
        }

        $details = json_decode($detailBody, true);
        if (isset($details['error'])) {
            if (is_yt_error_retryable($details['error'])) {
                $lastError = $details['error']['message'] ?? 'YouTube API error';
                continue;
            }
            json_err($details['error']['message'] ?? 'YouTube API error', 502);
        }
    }

    if ($userId !== null && count($keys) > 1) {
        set_user_key_index($pdo, $userId, ($baseKeyIndex + $idx + 1) % count($keys));
    }

    $searchResult = ['yt' => $yt, 'details' => $details, 'apiKey' => $key];
    break;
}

if ($searchResult === null) {
    json_err($lastError ?? 'No working YouTube API key available for your account. Add keys in Settings.', 503);
}

$yt = $searchResult['yt'];
$details = $searchResult['details'];
$detailMap = [];
foreach ($details['items'] ?? [] as $d) {
    $detailMap[$d['id']] = $d;
}

$videos = [];
foreach ($yt['items'] ?? [] as $item) {
    $vid = $item['id']['videoId'];
    $sn  = $item['snippet'];
    $det = $detailMap[$vid] ?? null;
    $fullSnippet = $det['snippet']   ?? $sn;
    $stats       = $det['statistics'] ?? [];

    $videos[] = [
        'videoId'     => $vid,
        'title'       => $fullSnippet['title']       ?? '',
        'channel'     => $fullSnippet['channelTitle'] ?? '',
        'publishedAt' => $fullSnippet['publishedAt']  ?? '',
        'thumbnail'   => $fullSnippet['thumbnails']['medium']['url'] ?? '',
        'viewCount'   => $stats['viewCount'] ?? 0,
        'likeCount'   => $stats['likeCount'] ?? 0,
        'url'         => "https://www.youtube.com/watch?v=$vid",
    ];
}

json_ok([
    'videos'        => $videos,
    'nextPageToken' => $yt['nextPageToken'] ?? null,
    'totalResults'  => $yt['pageInfo']['totalResults'] ?? 0,
]);
