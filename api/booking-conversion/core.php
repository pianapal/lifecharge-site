<?php
declare(strict_types=1);

// No contact information or health fields are accepted or persisted here.
function lc_booking_event(array $input, int $now): ?array {
    $allowed = ['appointment_id', 'calendar_id', 'location_id', 'status', 'attribution_url'];
    if (array_diff(array_keys($input), $allowed)) {
        throw new InvalidArgumentException('Unexpected fields');
    }
    if (($input['location_id'] ?? '') !== '7gE4vBVcRffrJnXyvGmu' ||
        ($input['calendar_id'] ?? '') !== 'uiad6ZBD9FlTcCf5M9ed') {
        throw new InvalidArgumentException('Wrong booking source');
    }
    if (($input['status'] ?? '') !== 'confirmed') return null;
    $id = $input['appointment_id'] ?? '';
    if (!is_string($id) || !preg_match('/^[A-Za-z0-9_-]{8,128}$/D', $id)) {
        throw new InvalidArgumentException('Missing booking identifier');
    }
    $url = $input['attribution_url'] ?? '';
    if (!is_string($url) || strlen($url) > 16384) {
        throw new InvalidArgumentException('Invalid attribution');
    }
    $parts = parse_url($url);
    $hosts = ['lifechargechiropractic.com', 'schedule.lifechargechiropractic.com', 'api.leadconnectorhq.com'];
    if (!$parts || ($parts['scheme'] ?? '') !== 'https' || !in_array($parts['host'] ?? '', $hosts, true)) return null;
    parse_str($parts['query'] ?? '', $query);
    // Missing or denied measurement context fails closed, never infer consent.
    if (($query['lc_ads_measurement'] ?? '') !== 'allowed') return null;
    $event = [
        'id' => 'lc_booking_' . hash('sha256', $input['location_id'] . ':' . $input['calendar_id'] . ':' . $id),
        'type' => 'appointment_scheduled', 'timestamp_ms' => $now,
        'action_source' => 'web', 'source_url' => 'https://lifechargechiropractic.com/',
        'data' => ['type' => 'customer_action']
    ];
    if (isset($query['oppref'])) {
        if (!is_string($query['oppref']) || strlen($query['oppref']) > 8192) {
            throw new InvalidArgumentException('Invalid attribution reference');
        }
        if ($query['oppref'] !== '') $event['oppref'] = $query['oppref'];
    }
    return $event;
}

function lc_atomic_json(string $path, array $data): void {
    $temp = $path . '.' . bin2hex(random_bytes(8)) . '.tmp';
    $json = json_encode($data, JSON_THROW_ON_ERROR);
    if (file_put_contents($temp, $json) !== strlen($json)) throw new RuntimeException('Storage failed');
    chmod($temp, 0600);
    if (!rename($temp, $path)) throw new RuntimeException('Storage failed');
}

// Lock spans delivery and durable receipt. Retries keep the original event ID/time.
function lc_deliver_once(array $event, string $directory, callable $send): array {
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Storage unavailable');
    }
    $base = $directory . '/' . hash('sha256', $event['id']);
    $lock = fopen($base . '.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Lock unavailable');
    chmod($base . '.lock', 0600);
    try {
        $path = $base . '.json';
        $record = is_file($path) ? json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR) : null;
        if (($record['state'] ?? '') === 'accepted') return ['status' => 'duplicate'];
        if ($record !== null && !isset($record['event'])) throw new RuntimeException('Invalid ledger');
        if ($record === null) {
            $record = ['state' => 'pending', 'event' => $event];
            lc_atomic_json($path, $record);
        }
        $code = $send($record['event']);
        if ($code >= 200 && $code < 300) {
            // Remove attribution after acceptance; retain only an idempotency receipt.
            lc_atomic_json($path, ['state' => 'accepted', 'accepted_at' => time(), 'http_status' => $code]);
            return ['status' => 'accepted', 'http_status' => $code];
        }
        return ['status' => 'pending', 'http_status' => $code];
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
