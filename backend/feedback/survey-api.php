<?php
/**
 * Swiss Grid Generator — Beta Survey API
 * 
 * Speichert Umfrage-Daten in einer SQLite-Datenbank.
 * 
 * Endpunkt:  POST /survey-api.php
 * Payload:   JSON (Content-Type: application/json)
 * Antwort:   JSON { success: bool, id?: int, error?: string }
 * 
 * Datenbank: survey.db (wird automatisch erstellt)
 * 
 * Setup:
 *   1. Datei auf PHP-Server ablegen (PHP 7.4+ mit SQLite3-Extension)
 *   2. Schreibrechte für das Verzeichnis sicherstellen (chmod 755)
 *   3. Im Survey-HTML die submitSurvey()-Funktion anpassen (siehe unten)
 */

// ──────────────────────────────────────────────
// Konfiguration
// ──────────────────────────────────────────────

define('DB_PATH',        __DIR__ . '/survey.db');
define('ALLOWED_ORIGIN', '*');  // Für Produktion: 'https://preview.swissgridgenerator.com'
define('RATE_LIMIT_SEC', 10);  // Min. Sekunden zwischen Einträgen pro IP
define('MAX_PAYLOAD_KB', 64);  // Max. Payload-Größe in KB

// ──────────────────────────────────────────────
// CORS & Headers
// ──────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('X-Content-Type-Options: nosniff');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Nur POST erlauben
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, 'Method not allowed');
}

// ──────────────────────────────────────────────
// Payload lesen & validieren
// ──────────────────────────────────────────────

$raw = file_get_contents('php://input');

if (strlen($raw) > MAX_PAYLOAD_KB * 1024) {
    respond(413, 'Payload too large');
}

$data = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($data) || empty($data)) {
    respond(400, 'Invalid JSON payload');
}

// ──────────────────────────────────────────────
// Datenbank initialisieren
// ──────────────────────────────────────────────

try {
    $db = new SQLite3(DB_PATH);
    $db->busyTimeout(3000);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('PRAGMA foreign_keys = ON');

    // Haupttabelle: Responses
    $db->exec('
        CREATE TABLE IF NOT EXISTS responses (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at      TEXT    NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%SZ\', \'now\')),
            ip_hash         TEXT,
            user_agent      TEXT,

            -- Sektion 1: Über dich
            role            TEXT,
            role_other      TEXT,
            experience      TEXT,
            frequency       TEXT,

            -- Sektion 2: Erster Eindruck (1–5)
            understand      INTEGER,
            easystart       INTEGER,
            intuitive       INTEGER,
            firstresult     INTEGER,
            first_confusion TEXT,

            -- Sektion 3: Funktionen & Qualität (1–5)
            calc_accuracy       INTEGER,
            brockmann_fidelity  INTEGER,
            preview_quality     INTEGER,
            controls_ux         INTEGER,
            performance         INTEGER,
            export_quality      INTEGER,
            exports_used        TEXT,
            what_worked         TEXT,

            -- Sektion 4: Probleme
            bugs_found      TEXT,
            bug_description TEXT,
            friction        TEXT,
            almost_stopped  TEXT,

            -- Sektion 5: Wert & Alternativen
            disappointment  TEXT,
            job_to_be_done  TEXT,
            alternatives    TEXT,

            -- Sektion 6: Prioritäten (1–5)
            feat_print_pdf    INTEGER,
            feat_adobe_export INTEGER,
            feat_figma        INTEGER,
            feat_presets      INTEGER,
            feat_save         INTEGER,
            feat_bilingual    INTEGER,
            top_improvement   TEXT,
            missing_features  TEXT,

            -- Sektion 7: Empfehlung
            nps_score       INTEGER,
            nps_reason      TEXT,
            anything_else   TEXT,
            followup        TEXT,
            email           TEXT,

            -- Rohdaten als Backup
            raw_json        TEXT
        )
    ');

    // Rate-Limit-Tabelle
    $db->exec('
        CREATE TABLE IF NOT EXISTS rate_limits (
            ip_hash     TEXT PRIMARY KEY,
            last_submit TEXT NOT NULL
        )
    ');

} catch (Exception $e) {
    respond(500, 'Database error: ' . $e->getMessage());
}

// ──────────────────────────────────────────────
// Rate Limiting (IP-Hash)
// ──────────────────────────────────────────────

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ipHash = hash('sha256', $ip . '_sgg_salt_2025');

$stmt = $db->prepare('SELECT last_submit FROM rate_limits WHERE ip_hash = :hash');
$stmt->bindValue(':hash', $ipHash, SQLITE3_TEXT);
$result = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

if ($result) {
    $lastSubmit = strtotime($result['last_submit']);
    if (time() - $lastSubmit < RATE_LIMIT_SEC) {
        respond(429, 'Too many requests. Please wait a moment.');
    }
}

// ──────────────────────────────────────────────
// Daten sanitisieren & einfügen
// ──────────────────────────────────────────────

// Erlaubte Felder und ihre Typen
$schema = [
    'role'              => 'text',
    'role_other'        => 'text',
    'experience'        => 'text',
    'frequency'         => 'text',
    'understand'        => 'int',
    'easystart'         => 'int',
    'intuitive'         => 'int',
    'firstresult'       => 'int',
    'first_confusion'   => 'text',
    'calc_accuracy'     => 'int',
    'brockmann_fidelity'=> 'int',
    'preview_quality'   => 'int',
    'controls_ux'       => 'int',
    'performance'       => 'int',
    'export_quality'    => 'int',
    'exports_used'      => 'array',
    'what_worked'       => 'text',
    'bugs_found'        => 'text',
    'bug_description'   => 'text',
    'friction'          => 'text',
    'almost_stopped'    => 'text',
    'disappointment'    => 'text',
    'job_to_be_done'    => 'text',
    'alternatives'      => 'text',
    'feat_print_pdf'    => 'int',
    'feat_adobe_export' => 'int',
    'feat_figma'        => 'int',
    'feat_presets'      => 'int',
    'feat_save'         => 'int',
    'feat_bilingual'    => 'int',
    'top_improvement'   => 'text',
    'missing_features'  => 'text',
    'nps_score'         => 'int',
    'nps_reason'        => 'text',
    'anything_else'     => 'text',
    'followup'          => 'text',
    'email'             => 'text',
];

// Werte aufbereiten
$clean = [];
foreach ($schema as $field => $type) {
    if (!isset($data[$field])) {
        $clean[$field] = null;
        continue;
    }

    switch ($type) {
        case 'int':
            $val = filter_var($data[$field], FILTER_VALIDATE_INT);
            // Likert: 1–5, NPS: 0–10
            if ($field === 'nps_score') {
                $clean[$field] = ($val !== false && $val >= 0 && $val <= 10) ? $val : null;
            } else {
                $clean[$field] = ($val !== false && $val >= 1 && $val <= 5) ? $val : null;
            }
            break;

        case 'array':
            $clean[$field] = is_array($data[$field])
                ? implode(', ', array_map('strip_tags', $data[$field]))
                : strip_tags((string)$data[$field]);
            break;

        case 'text':
        default:
            $val = strip_tags((string)$data[$field]);
            $clean[$field] = mb_substr($val, 0, 2000); // Max. 2000 Zeichen pro Feld
            break;
    }
}

// E-Mail validieren
if (!empty($clean['email']) && !filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) {
    $clean['email'] = null;
}

try {
    $columns = array_keys($schema);
    $placeholders = array_map(fn($c) => ':' . $c, $columns);

    $sql = sprintf(
        'INSERT INTO responses (ip_hash, user_agent, raw_json, %s) VALUES (:ip_hash, :user_agent, :raw_json, %s)',
        implode(', ', $columns),
        implode(', ', $placeholders)
    );

    $stmt = $db->prepare($sql);
    $stmt->bindValue(':ip_hash',    $ipHash, SQLITE3_TEXT);
    $stmt->bindValue(':user_agent', mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500), SQLITE3_TEXT);
    $stmt->bindValue(':raw_json',   mb_substr($raw, 0, 10000), SQLITE3_TEXT);

    foreach ($schema as $field => $type) {
        if ($clean[$field] === null) {
            $stmt->bindValue(':' . $field, null, SQLITE3_NULL);
        } elseif ($type === 'int') {
            $stmt->bindValue(':' . $field, $clean[$field], SQLITE3_INTEGER);
        } else {
            $stmt->bindValue(':' . $field, $clean[$field], SQLITE3_TEXT);
        }
    }

    $stmt->execute();
    $insertId = $db->lastInsertRowID();

    // Rate Limit aktualisieren
    $rl = $db->prepare('INSERT OR REPLACE INTO rate_limits (ip_hash, last_submit) VALUES (:hash, datetime(\'now\'))');
    $rl->bindValue(':hash', $ipHash, SQLITE3_TEXT);
    $rl->execute();

    respond(201, null, ['success' => true, 'id' => $insertId]);

} catch (Exception $e) {
    respond(500, 'Insert failed: ' . $e->getMessage());
}

// ──────────────────────────────────────────────
// Hilfsfunktion
// ──────────────────────────────────────────────

function respond(int $code, ?string $error = null, ?array $payload = null): void {
    http_response_code($code);
    if ($error) {
        echo json_encode(['success' => false, 'error' => $error]);
    } else {
        echo json_encode($payload);
    }
    exit;
}
