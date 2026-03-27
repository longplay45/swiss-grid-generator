<?php
/**
 * Swiss Grid Generator — Feedback API
 *
 * Accepts JSON feedback submissions and stores them in SQLite.
 */

define('DB_PATH', __DIR__ . '/survey.db');
define('ALLOWED_ORIGIN', '*');
define('RATE_LIMIT_SEC', 10);
define('MAX_PAYLOAD_KB', 64);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Method not allowed']);
}

$raw = file_get_contents('php://input');
if ($raw === false) {
    respond(400, ['success' => false, 'error' => 'Could not read request body']);
}

if (strlen($raw) > MAX_PAYLOAD_KB * 1024) {
    respond(413, ['success' => false, 'error' => 'Payload too large']);
}

$data = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data) || empty($data)) {
    respond(400, ['success' => false, 'error' => 'Invalid JSON payload']);
}

try {
    $db = new SQLite3(DB_PATH);
    $db->busyTimeout(3000);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('PRAGMA foreign_keys = ON');

    $db->exec('
        CREATE TABLE IF NOT EXISTS feedback_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
            ip_hash TEXT,
            user_agent TEXT,
            schema_version INTEGER NOT NULL DEFAULT 1,
            app_version TEXT,
            experience TEXT NOT NULL,
            frequency TEXT,
            understand INTEGER NOT NULL,
            easystart INTEGER NOT NULL,
            intuitive INTEGER NOT NULL,
            firstresult INTEGER NOT NULL,
            first_confusion TEXT,
            what_worked TEXT,
            bugs_found TEXT,
            bug_description TEXT,
            job_to_be_done TEXT,
            alternatives TEXT,
            top_improvement TEXT,
            missing_features TEXT,
            anything_else TEXT,
            nps_score INTEGER NOT NULL,
            raw_json TEXT NOT NULL
        )
    ');

    $db->exec('
        CREATE TABLE IF NOT EXISTS rate_limits (
            ip_hash TEXT PRIMARY KEY,
            last_submit TEXT NOT NULL
        )
    ');
} catch (Exception $e) {
    respond(500, ['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ipHash = hash('sha256', $ip . '_sgg_salt_2025');

$rateLimitStmt = $db->prepare('SELECT last_submit FROM rate_limits WHERE ip_hash = :hash');
if ($rateLimitStmt === false) {
    respond(500, ['success' => false, 'error' => 'Could not prepare rate limit query']);
}
$rateLimitStmt->bindValue(':hash', $ipHash, SQLITE3_TEXT);
$rateLimitResult = $rateLimitStmt->execute();
$previousSubmit = $rateLimitResult ? $rateLimitResult->fetchArray(SQLITE3_ASSOC) : false;

if ($previousSubmit) {
    $lastSubmit = strtotime($previousSubmit['last_submit']);
    if ($lastSubmit !== false && (time() - $lastSubmit) < RATE_LIMIT_SEC) {
        respond(429, ['success' => false, 'error' => 'Too many requests. Please wait a moment.']);
    }
}

$clean = [
    'schema_version' => normalize_exact_int($data['schema_version'] ?? 1, 1) ?? 1,
    'app_version' => sanitize_text($data['app_version'] ?? null, 64),
    'experience' => normalize_choice($data['experience'] ?? null, ['beginner', 'intermediate', 'expert']),
    'frequency' => normalize_choice($data['frequency'] ?? null, ['once', '2-3-times', 'regularly']),
    'understand' => normalize_range_int($data['understand'] ?? null, 1, 5),
    'easystart' => normalize_range_int($data['easystart'] ?? null, 1, 5),
    'intuitive' => normalize_range_int($data['intuitive'] ?? null, 1, 5),
    'firstresult' => normalize_range_int($data['firstresult'] ?? null, 1, 5),
    'first_confusion' => sanitize_text($data['first_confusion'] ?? null),
    'what_worked' => sanitize_text($data['what_worked'] ?? null),
    'bugs_found' => normalize_choice($data['bugs_found'] ?? null, ['no', 'yes']),
    'bug_description' => sanitize_text($data['bug_description'] ?? null),
    'job_to_be_done' => sanitize_text($data['job_to_be_done'] ?? null),
    'alternatives' => sanitize_text($data['alternatives'] ?? null),
    'top_improvement' => sanitize_text($data['top_improvement'] ?? null),
    'missing_features' => sanitize_text($data['missing_features'] ?? null),
    'anything_else' => sanitize_text($data['anything_else'] ?? null),
    'nps_score' => normalize_range_int($data['nps_score'] ?? null, 0, 10),
];

$errors = [];
if ($clean['experience'] === null) {
    $errors['experience'] = 'Select your grid-system experience.';
}
if ($clean['understand'] === null) {
    $errors['understand'] = 'Provide a 1 to 5 rating.';
}
if ($clean['easystart'] === null) {
    $errors['easystart'] = 'Provide a 1 to 5 rating.';
}
if ($clean['intuitive'] === null) {
    $errors['intuitive'] = 'Provide a 1 to 5 rating.';
}
if ($clean['firstresult'] === null) {
    $errors['firstresult'] = 'Provide a 1 to 5 rating.';
}
if ($clean['nps_score'] === null) {
    $errors['nps_score'] = 'Provide a 0 to 10 recommendation score.';
}
if ($clean['bugs_found'] === 'yes' && $clean['bug_description'] === null) {
    $errors['bug_description'] = 'Describe the issue you ran into.';
}

if (!empty($errors)) {
    respond(422, [
        'success' => false,
        'error' => 'Please review the highlighted fields.',
        'fields' => $errors,
    ]);
}

if ($clean['bugs_found'] !== 'yes') {
    $clean['bug_description'] = null;
}

try {
    $columns = array_keys($clean);
    $placeholders = array_map(fn($column) => ':' . $column, $columns);

    $sql = sprintf(
        'INSERT INTO feedback_responses (ip_hash, user_agent, raw_json, %s) VALUES (:ip_hash, :user_agent, :raw_json, %s)',
        implode(', ', $columns),
        implode(', ', $placeholders)
    );

    $stmt = $db->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Could not prepare insert query');
    }

    $stmt->bindValue(':ip_hash', $ipHash, SQLITE3_TEXT);
    $stmt->bindValue(':user_agent', mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500), SQLITE3_TEXT);
    $stmt->bindValue(':raw_json', mb_substr($raw, 0, 10000), SQLITE3_TEXT);

    foreach ($clean as $field => $value) {
        if ($value === null) {
            $stmt->bindValue(':' . $field, null, SQLITE3_NULL);
        } elseif (is_int($value)) {
            $stmt->bindValue(':' . $field, $value, SQLITE3_INTEGER);
        } else {
            $stmt->bindValue(':' . $field, $value, SQLITE3_TEXT);
        }
    }

    $stmt->execute();
    $insertId = $db->lastInsertRowID();

    $rateLimitUpdate = $db->prepare('INSERT OR REPLACE INTO rate_limits (ip_hash, last_submit) VALUES (:hash, datetime(\'now\'))');
    if ($rateLimitUpdate === false) {
        throw new Exception('Could not update rate limit');
    }
    $rateLimitUpdate->bindValue(':hash', $ipHash, SQLITE3_TEXT);
    $rateLimitUpdate->execute();

    respond(201, ['success' => true, 'id' => $insertId]);
} catch (Exception $e) {
    respond(500, ['success' => false, 'error' => 'Insert failed: ' . $e->getMessage()]);
}

function sanitize_text($value, int $maxLength = 2000): ?string {
    if ($value === null) {
        return null;
    }

    $text = trim(strip_tags((string) $value));
    if ($text === '') {
        return null;
    }

    return mb_substr($text, 0, $maxLength);
}

function normalize_choice($value, array $allowed): ?string {
    $text = sanitize_text($value, 64);
    if ($text === null) {
        return null;
    }

    return in_array($text, $allowed, true) ? $text : null;
}

function normalize_range_int($value, int $min, int $max): ?int {
    $intValue = filter_var($value, FILTER_VALIDATE_INT);
    if ($intValue === false) {
        return null;
    }

    if ($intValue < $min || $intValue > $max) {
        return null;
    }

    return $intValue;
}

function normalize_exact_int($value, int $expected): ?int {
    $intValue = filter_var($value, FILTER_VALIDATE_INT);
    if ($intValue === false) {
        return null;
    }

    return $intValue === $expected ? $intValue : null;
}

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}
