<?php
declare(strict_types=1);
require __DIR__ . '/core.php';
header('Content-Type: application/json');
header('Cache-Control: no-store');
function reply(int $code, string $status): void {
    http_response_code($code);
    echo json_encode(['status' => $status]);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, 'method_not_allowed');
$private = '/home/drpaidtv/.config/lifecharge';
// Provision separately, outside both Git and the public web root.
$secretPath = $private . '/ghl-booking-webhook.key';
if (!is_file($secretPath)) reply(503, 'not_configured');
$secret = trim(file_get_contents($secretPath));
$provided = $_SERVER['HTTP_X_LC_WEBHOOK_KEY'] ?? '';
if (strlen($secret) < 32 || !hash_equals($secret, $provided)) reply(401, 'unauthorized');
$raw = file_get_contents('php://input', false, null, 0, 32769);
if ($raw === false || strlen($raw) > 32768) reply(413, 'payload_too_large');
try {
    $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($input)) reply(400, 'invalid_payload');
    $event = lc_booking_event($input, (int) round(microtime(true) * 1000));
    if ($event === null) reply(200, 'not_eligible');
    // An explicit private enable flag prevents accidental live events during setup.
    $modePath = $private . '/booking-conversions.mode';
    $mode = is_file($modePath) ? trim(file_get_contents($modePath)) : '';
    if (!in_array($mode, ['validate', 'live'], true)) reply(503, 'not_enabled');
    $key = trim(file_get_contents($private . '/openai-conversions.key'));
    if ($key === '') reply(503, 'not_configured');
    $result = lc_deliver_once($event, $private . '/booking-ledger-' . $mode, function(array $saved) use ($key, $mode): int {
        if ($saved['timestamp_ms'] < (int) round(microtime(true) * 1000) - 604800000) return 422;
        $curl = curl_init('https://bzr.openai.com/v1/events?pid=4jGoU3ZqHRPhPmKs7JG5xJ');
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode(['validate_only' => $mode === 'validate', 'events' => [$saved]], JSON_THROW_ON_ERROR)]);
        curl_exec($curl);
        $code = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        return $code;
    });
    reply($result['status'] === 'pending' ? 503 : 200, $mode . '_' . $result['status']);
} catch (InvalidArgumentException | JsonException $error) {
    reply(400, 'invalid_payload');
} catch (Throwable $error) {
    // Never echo payloads, secrets, exception text, or upstream responses.
    reply(503, 'temporarily_unavailable');
}
