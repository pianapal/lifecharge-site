<?php
declare(strict_types=1);
require __DIR__ . '/../api/booking-conversion/core.php';
function check(bool $value, string $message): void {
    if (!$value) throw new RuntimeException($message);
    echo 'PASS: ' . $message . PHP_EOL;
}
$input = ['appointment_id' => 'fixture_booking_001', 'calendar_id' => 'uiad6ZBD9FlTcCf5M9ed',
    'location_id' => '7gE4vBVcRffrJnXyvGmu', 'status' => 'confirmed',
    'attribution_url' => 'https://lifechargechiropractic.com/book-new-patient/?lc_ads_measurement=allowed&oppref=' . rawurlencode('opaque+/= Mixed ' . str_repeat('x', 600))];
$event = lc_booking_event($input, 1794168000000);
check($event['oppref'] === 'opaque+/= Mixed ' . str_repeat('x', 600), 'opaque attribution preserved without truncation');
check(lc_booking_event(array_replace($input, ['status' => 'new']), 1) === null, 'unconfirmed booking not counted');
check(lc_booking_event(array_replace($input, ['status' => 'cancelled']), 1) === null, 'cancelled booking not counted');
check(lc_booking_event(array_replace($input, ['attribution_url' => 'https://lifechargechiropractic.com/']), 1) === null, 'missing privacy context fails closed');
check(lc_booking_event(array_replace($input, ['attribution_url' => 'https://lifechargechiropractic.com/?lc_ads_measurement=denied']), 1) === null, 'opt-out not counted');
foreach (['appointment_id' => '', 'calendar_id' => 'wrong', 'notes' => 'never send'] as $key => $value) {
    $rejected = false;
    try { lc_booking_event(array_replace($input, [$key => $value]), 1); } catch (InvalidArgumentException $e) { $rejected = true; }
    check($rejected, 'reject invalid or unexpected field: ' . $key);
}
$dir = sys_get_temp_dir() . '/lc-booking-test-' . bin2hex(random_bytes(8));
$calls = [];
$send = function($e) use (&$calls) { $calls[] = $e; return count($calls) === 1 ? 503 : 200; };
check(lc_deliver_once($event, $dir, $send)['status'] === 'pending', 'failed delivery remains retryable');
$retry = $event; $retry['timestamp_ms'] += 10000;
check(lc_deliver_once($retry, $dir, $send)['status'] === 'accepted', 'retry accepted');
check($calls[0] === $calls[1], 'retry preserves exact event ID and original timestamp');
check(lc_deliver_once($retry, $dir, $send)['status'] === 'duplicate', 'duplicate webhook delivery suppressed');
check(count($calls) === 2, 'duplicates do not reach external sender');
check($event['id'] === lc_booking_event($input, 99)['id'], 'reload and repeat use stable booking ID');
foreach (glob($dir . '/*') as $file) unlink($file);
rmdir($dir);
echo 'All tests used a mock sender. No live conversion was sent.' . PHP_EOL;
