<?php

return [
    /*
     * Opening-balance ledger import (SRS v3.0). Rows dated after this cutover date are rejected.
     * Unset means no batch can pass validation until the approved cutover date is configured.
     */
    'ledger_cutover_date' => env('LEDGER_CUTOVER_DATE'),

    'ledger_import' => [
        'max_file_kilobytes' => 1024,
        'max_rows' => 2000,
    ],

    /*
     * Local MySQL/MariaDB backups (SRS v3.0). The destination must be outside the web root and must already
     * exist; it is never created or exposed by the API. Time is Asia/Manila.
     */
    'backup' => [
        'connection' => env('BACKUP_DB_CONNECTION', env('DB_CONNECTION', 'mysql')),
        'destination' => env('BACKUP_DESTINATION'),
        'rotation_enabled' => (bool) env('BACKUP_ROTATION_ENABLED', false),
        'daily_at' => env('BACKUP_DAILY_AT', '21:00'),
        'mysqldump_path' => env('BACKUP_MYSQLDUMP_PATH', 'mysqldump'),
        'timeout_seconds' => (int) env('BACKUP_TIMEOUT_SECONDS', 900),
        'keep_daily' => 30,
        'keep_monthly' => 12,
    ],
];
