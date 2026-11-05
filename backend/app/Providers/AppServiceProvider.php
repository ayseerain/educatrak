<?php

namespace App\Providers;

use App\Contracts\BusinessDateProvider;
use App\Services\SessionBusinessDateProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(BusinessDateProvider::class, SessionBusinessDateProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            return Limit::perMinute(5)->by($request->string('username')->lower()->value().'|'.$request->ip());
        });
    }
}
