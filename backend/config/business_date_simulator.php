<?php

return [
    // This flag is additionally restricted by SessionBusinessDateProvider to local/testing.
    'enabled' => env('BUSINESS_DATE_SIMULATOR_ENABLED', false),
];
