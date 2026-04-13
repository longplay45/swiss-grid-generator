<?php
declare(strict_types=1);

const FEEDBACK_DB_PATH = __DIR__ . '/survey.db';
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 250;

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function format_cell_value(mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }
    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }
    if (is_scalar($value)) {
        return (string) $value;
    }

    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $encoded === false ? '[unserializable]' : $encoded;
}

function shorten_text(string $text, int $limit = 120): string
{
    $normalized = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);
    if (mb_strlen($normalized) <= $limit) {
        return $normalized;
    }

    return mb_substr($normalized, 0, max(0, $limit - 1)) . '…';
}

function quote_identifier(string $identifier): string
{
    return '"' . str_replace('"', '""', $identifier) . '"';
}

function build_page_url(array $params): string
{
    $next = array_merge($_GET, $params);
    foreach ($next as $key => $value) {
        if ($value === null || $value === '') {
            unset($next[$key]);
        }
    }

    $query = http_build_query($next);
    return $query === '' ? 'browser.php' : 'browser.php?' . $query;
}

$dbError = null;
$tables = [];
$selectedTable = null;
$schemaRows = [];
$dataRows = [];
$totalRows = 0;
$selectedRow = null;
$selectedRowId = isset($_GET['rowid']) ? max(0, (int) $_GET['rowid']) : null;
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = (int) ($_GET['per_page'] ?? DEFAULT_PER_PAGE);
$perPage = max(10, min(MAX_PER_PAGE, $perPage));
$offset = ($page - 1) * $perPage;

if (!is_file(FEEDBACK_DB_PATH)) {
    $dbError = 'Database file not found at ' . FEEDBACK_DB_PATH;
} else {
    try {
        $db = new SQLite3(FEEDBACK_DB_PATH, SQLITE3_OPEN_READONLY);
        $db->busyTimeout(3000);

        $tableResult = $db->query(
            "SELECT name, type
             FROM sqlite_master
             WHERE type IN ('table', 'view')
             ORDER BY
               CASE WHEN name LIKE 'sqlite_%' THEN 1 ELSE 0 END,
               name ASC"
        );

        if ($tableResult === false) {
            throw new RuntimeException('Could not list database tables: ' . $db->lastErrorMsg());
        }

        while ($row = $tableResult->fetchArray(SQLITE3_ASSOC)) {
            if (!isset($row['name'], $row['type'])) {
                continue;
            }
            $tables[] = [
                'name' => (string) $row['name'],
                'type' => (string) $row['type'],
            ];
        }

        if (count($tables) > 0) {
            $requestedTable = isset($_GET['table']) ? (string) $_GET['table'] : $tables[0]['name'];
            foreach ($tables as $table) {
                if ($table['name'] === $requestedTable) {
                    $selectedTable = $table['name'];
                    break;
                }
            }
            if ($selectedTable === null) {
                $selectedTable = $tables[0]['name'];
            }
        }

        if ($selectedTable !== null) {
            $quotedTable = quote_identifier($selectedTable);

            $schemaResult = $db->query(sprintf('PRAGMA table_info(%s)', $quotedTable));
            if ($schemaResult === false) {
                throw new RuntimeException('Could not read schema for ' . $selectedTable . ': ' . $db->lastErrorMsg());
            }
            while ($row = $schemaResult->fetchArray(SQLITE3_ASSOC)) {
                $schemaRows[] = $row;
            }

            $countResult = $db->query(sprintf('SELECT COUNT(*) AS count_rows FROM %s', $quotedTable));
            if ($countResult === false) {
                throw new RuntimeException('Could not count rows for ' . $selectedTable . ': ' . $db->lastErrorMsg());
            }
            $countRow = $countResult->fetchArray(SQLITE3_ASSOC);
            $totalRows = (int) ($countRow['count_rows'] ?? 0);

            $dataQuery = sprintf(
                'SELECT rowid AS __browser_rowid, * FROM %s ORDER BY rowid DESC LIMIT :limit OFFSET :offset',
                $quotedTable
            );
            $dataStmt = $db->prepare($dataQuery);
            if ($dataStmt === false) {
                throw new RuntimeException('Could not prepare row query for ' . $selectedTable . ': ' . $db->lastErrorMsg());
            }
            $dataStmt->bindValue(':limit', $perPage, SQLITE3_INTEGER);
            $dataStmt->bindValue(':offset', $offset, SQLITE3_INTEGER);
            $dataResult = $dataStmt->execute();
            if ($dataResult === false) {
                throw new RuntimeException('Could not load rows for ' . $selectedTable . ': ' . $db->lastErrorMsg());
            }

            while ($row = $dataResult->fetchArray(SQLITE3_ASSOC)) {
                if ($row === false) {
                    continue;
                }
                $dataRows[] = $row;
            }

            if ($selectedRowId !== null) {
                $detailStmt = $db->prepare(sprintf('SELECT rowid AS __browser_rowid, * FROM %s WHERE rowid = :rowid LIMIT 1', $quotedTable));
                if ($detailStmt === false) {
                    throw new RuntimeException('Could not prepare row detail query for ' . $selectedTable . ': ' . $db->lastErrorMsg());
                }
                $detailStmt->bindValue(':rowid', $selectedRowId, SQLITE3_INTEGER);
                $detailResult = $detailStmt->execute();
                if ($detailResult === false) {
                    throw new RuntimeException('Could not load row detail for ' . $selectedTable . ': ' . $db->lastErrorMsg());
                }
                $selectedRow = $detailResult->fetchArray(SQLITE3_ASSOC) ?: null;
            }
        }
    } catch (Throwable $error) {
        $dbError = $error->getMessage();
    }
}

$totalPages = max(1, (int) ceil($totalRows / max(1, $perPage)));
if ($page > $totalPages) {
    $page = $totalPages;
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Feedback DB Browser</title>
    <style>
      :root {
        --bg: #f5f3ef;
        --panel: #fbfaf7;
        --line: #d7d1c7;
        --line-strong: #b7aea0;
        --text: #161514;
        --muted: #5f5a53;
        --accent: #f97316;
        --accent-soft: rgba(249, 115, 22, 0.14);
        --code: #efe9df;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font: 13px/1.45 "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .shell {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        min-height: 100vh;
      }

      .sidebar,
      .content {
        padding: 24px;
      }

      .sidebar {
        border-right: 1px solid var(--line);
        background: linear-gradient(180deg, #f8f5f0 0%, #f3efe8 100%);
      }

      .content {
        display: grid;
        gap: 18px;
      }

      .eyebrow {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1,
      h2,
      h3 {
        margin: 0;
        font-weight: 600;
      }

      h1 {
        font-size: 22px;
        line-height: 1.1;
      }

      h2 {
        font-size: 15px;
      }

      .stack {
        display: grid;
        gap: 12px;
      }

      .panel {
        border: 1px solid var(--line);
        background: var(--panel);
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--line);
      }

      .panel-body {
        padding: 14px;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .metric {
        border: 1px solid var(--line);
        background: #fffdf9;
        padding: 10px 12px;
      }

      .metric-label {
        margin: 0 0 4px;
        color: var(--muted);
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .metric-value {
        font-size: 22px;
        line-height: 1;
      }

      .muted {
        color: var(--muted);
      }

      .notice {
        border-left: 3px solid var(--accent);
        background: var(--accent-soft);
        padding: 12px 14px;
      }

      .nav-list {
        display: grid;
        gap: 6px;
      }

      .nav-link {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: baseline;
        padding: 8px 10px;
        border: 1px solid transparent;
      }

      .nav-link.active {
        border-color: var(--line-strong);
        background: #fffdf9;
      }

      .nav-link:hover {
        border-color: var(--line);
        background: rgba(255, 255, 255, 0.55);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        height: 18px;
        padding: 0 7px;
        border: 1px solid var(--line);
        color: var(--muted);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 18px;
        align-items: center;
      }

      .toolbar label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      select {
        height: 32px;
        border: 1px solid var(--line-strong);
        background: #fffdf9;
        padding: 0 10px;
        color: var(--text);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
        text-align: left;
      }

      th {
        color: var(--muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      tbody tr:hover {
        background: rgba(249, 115, 22, 0.06);
      }

      td code,
      pre {
        font: 12px/1.5 "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
      }

      code.inline {
        display: inline-block;
        padding: 1px 5px;
        background: var(--code);
      }

      pre {
        margin: 0;
        padding: 12px;
        overflow: auto;
        border: 1px solid var(--line);
        background: #fffdf9;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .table-wrap {
        overflow: auto;
      }

      .table-note {
        margin-top: 8px;
        color: var(--muted);
        font-size: 11px;
      }

      .actions {
        display: inline-flex;
        gap: 8px;
      }

      .action-link {
        color: var(--accent);
      }

      .schema-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .detail-grid {
        display: grid;
        gap: 10px;
      }

      .detail-row {
        display: grid;
        grid-template-columns: 180px minmax(0, 1fr);
        gap: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--line);
      }

      .detail-row:first-child {
        padding-top: 0;
        border-top: 0;
      }

      .detail-key {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .pager {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .pager a,
      .pager span {
        display: inline-flex;
        align-items: center;
        height: 30px;
        padding: 0 10px;
        border: 1px solid var(--line);
        background: #fffdf9;
      }

      .pager .current {
        border-color: var(--line-strong);
        background: var(--accent-soft);
      }

      .empty {
        padding: 16px 0;
        color: var(--muted);
      }

      @media (max-width: 1100px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          border-right: 0;
          border-bottom: 1px solid var(--line);
        }

        .metric-grid,
        .schema-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 720px) {
        .sidebar,
        .content {
          padding: 16px;
        }

        .metric-grid,
        .schema-grid,
        .detail-row {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <aside class="sidebar stack">
        <div>
          <p class="eyebrow">Swiss Grid Generator</p>
          <h1>Feedback DB Browser</h1>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Database</h2>
            <span class="pill">Read only</span>
          </div>
          <div class="panel-body stack">
            <div>
              <div class="eyebrow">Path</div>
              <code class="inline"><?= h(FEEDBACK_DB_PATH) ?></code>
            </div>
            <div>
              <div class="eyebrow">Tables</div>
              <?php if (count($tables) === 0): ?>
                <div class="empty">No tables found.</div>
              <?php else: ?>
                <nav class="nav-list">
                  <?php foreach ($tables as $table): ?>
                    <?php
                      $isActive = $table['name'] === $selectedTable;
                      $tableUrl = build_page_url([
                          'table' => $table['name'],
                          'page' => 1,
                          'rowid' => null,
                      ]);
                    ?>
                    <a class="nav-link<?= $isActive ? ' active' : '' ?>" href="<?= h($tableUrl) ?>">
                      <span><?= h($table['name']) ?></span>
                      <span class="pill"><?= h($table['type']) ?></span>
                    </a>
                  <?php endforeach; ?>
                </nav>
              <?php endif; ?>
            </div>
          </div>
        </div>
      </aside>

      <main class="content">
        <?php if ($dbError !== null): ?>
          <div class="notice">
            <strong>Database error.</strong><br>
            <span class="muted"><?= h($dbError) ?></span>
          </div>
        <?php else: ?>
          <section class="metric-grid">
            <div class="metric">
              <div class="metric-label">Selected Table</div>
              <div class="metric-value"><?= h($selectedTable ?? '—') ?></div>
            </div>
            <div class="metric">
              <div class="metric-label">Rows</div>
              <div class="metric-value"><?= number_format($totalRows) ?></div>
            </div>
            <div class="metric">
              <div class="metric-label">Per Page</div>
              <div class="metric-value"><?= number_format($perPage) ?></div>
            </div>
            <div class="metric">
              <div class="metric-label">Page</div>
              <div class="metric-value"><?= number_format($page) ?> / <?= number_format($totalPages) ?></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Rows</h2>
              <form method="get" class="toolbar">
                <?php if ($selectedTable !== null): ?>
                  <input type="hidden" name="table" value="<?= h($selectedTable) ?>">
                <?php endif; ?>
                <label>
                  <span class="muted">Per page</span>
                  <select name="per_page" onchange="this.form.submit()">
                    <?php foreach ([25, 50, 100, 250] as $option): ?>
                      <option value="<?= $option ?>"<?= $option === $perPage ? ' selected' : '' ?>><?= $option ?></option>
                    <?php endforeach; ?>
                  </select>
                </label>
                <input type="hidden" name="page" value="1">
              </form>
            </div>
            <div class="panel-body stack">
              <?php if (count($dataRows) === 0): ?>
                <div class="empty">No rows in this table.</div>
              <?php else: ?>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <?php foreach (array_keys($dataRows[0]) as $column): ?>
                          <th><?= h($column) ?></th>
                        <?php endforeach; ?>
                        <th>Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php foreach ($dataRows as $row): ?>
                        <tr>
                          <?php foreach ($row as $column => $value): ?>
                            <?php
                              $formatted = format_cell_value($value);
                              $display = $formatted;
                              if ($column !== '__browser_rowid') {
                                  $display = shorten_text($formatted);
                              }
                            ?>
                            <td title="<?= h($formatted) ?>">
                              <code><?= h($display) ?></code>
                            </td>
                          <?php endforeach; ?>
                          <td>
                            <div class="actions">
                              <a
                                class="action-link"
                                href="<?= h(build_page_url([
                                    'table' => $selectedTable,
                                    'page' => $page,
                                    'per_page' => $perPage,
                                    'rowid' => $row['__browser_rowid'] ?? null,
                                ])) ?>"
                              >
                                detail
                              </a>
                            </div>
                          </td>
                        </tr>
                      <?php endforeach; ?>
                    </tbody>
                  </table>
                </div>
                <div class="table-note">Cells are truncated in the grid. Use <span class="muted">detail</span> for full row content.</div>
              <?php endif; ?>

              <div class="pager">
                <?php if ($page > 1): ?>
                  <a href="<?= h(build_page_url(['table' => $selectedTable, 'page' => 1, 'per_page' => $perPage, 'rowid' => null])) ?>">First</a>
                  <a href="<?= h(build_page_url(['table' => $selectedTable, 'page' => $page - 1, 'per_page' => $perPage, 'rowid' => null])) ?>">Prev</a>
                <?php endif; ?>
                <span class="current">Page <?= number_format($page) ?> of <?= number_format($totalPages) ?></span>
                <?php if ($page < $totalPages): ?>
                  <a href="<?= h(build_page_url(['table' => $selectedTable, 'page' => $page + 1, 'per_page' => $perPage, 'rowid' => null])) ?>">Next</a>
                  <a href="<?= h(build_page_url(['table' => $selectedTable, 'page' => $totalPages, 'per_page' => $perPage, 'rowid' => null])) ?>">Last</a>
                <?php endif; ?>
              </div>
            </div>
          </section>

          <section class="schema-grid">
            <div class="panel">
              <div class="panel-head">
                <h2>Schema</h2>
                <span class="pill"><?= number_format(count($schemaRows)) ?> cols</span>
              </div>
              <div class="panel-body">
                <?php if (count($schemaRows) === 0): ?>
                  <div class="empty">No schema information available.</div>
                <?php else: ?>
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>PK</th>
                          <th>Not Null</th>
                          <th>Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php foreach ($schemaRows as $column): ?>
                          <tr>
                            <td><code><?= h((string) ($column['name'] ?? '')) ?></code></td>
                            <td><code><?= h((string) ($column['type'] ?? '')) ?></code></td>
                            <td><code><?= h((string) ($column['pk'] ?? '0')) ?></code></td>
                            <td><code><?= h((string) ($column['notnull'] ?? '0')) ?></code></td>
                            <td><code><?= h(format_cell_value($column['dflt_value'] ?? null)) ?></code></td>
                          </tr>
                        <?php endforeach; ?>
                      </tbody>
                    </table>
                  </div>
                <?php endif; ?>
              </div>
            </div>

            <div class="panel">
              <div class="panel-head">
                <h2>Row Detail</h2>
                <?php if ($selectedRow !== null): ?>
                  <span class="pill">rowid <?= h((string) ($selectedRow['__browser_rowid'] ?? '')) ?></span>
                <?php endif; ?>
              </div>
              <div class="panel-body">
                <?php if ($selectedRow === null): ?>
                  <div class="empty">Select a row from the grid to inspect all fields.</div>
                <?php else: ?>
                  <div class="detail-grid">
                    <?php foreach ($selectedRow as $key => $value): ?>
                      <?php
                        $formatted = format_cell_value($value);
                        $decodedJson = null;
                        if (is_string($value) && $value !== '') {
                            $candidate = json_decode($value, true);
                            if (json_last_error() === JSON_ERROR_NONE && (is_array($candidate) || is_object($candidate))) {
                                $decodedJson = json_encode($candidate, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                            }
                        }
                      ?>
                      <div class="detail-row">
                        <div class="detail-key"><?= h((string) $key) ?></div>
                        <div>
                          <?php if ($decodedJson !== null): ?>
                            <pre><?= h($decodedJson) ?></pre>
                          <?php else: ?>
                            <pre><?= h($formatted) ?></pre>
                          <?php endif; ?>
                        </div>
                      </div>
                    <?php endforeach; ?>
                  </div>
                <?php endif; ?>
              </div>
            </div>
          </section>
        <?php endif; ?>
      </main>
    </div>
  </body>
</html>
