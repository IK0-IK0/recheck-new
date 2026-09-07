<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\StorageServiceProvider;
use App\Providers\TenantDatabaseServiceProvider;
use App\Providers\TenantStorageServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    StorageServiceProvider::class,
    TenantDatabaseServiceProvider::class,
    TenantStorageServiceProvider::class,
];
