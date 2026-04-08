<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Plans
        Plan::updateOrCreate(['name' => 'free'], [
            'display_name' => 'Free',
            'price_monthly' => 0,
            'max_branches' => 1,
            'max_staff' => 5,
            'has_inventory' => false,
            'has_full_reports' => false,
            'has_branding' => false,
            'has_subdomain' => false,
            'is_active' => true,
        ]);

        Plan::updateOrCreate(['name' => 'pro'], [
            'display_name' => 'Pro',
            'price_monthly' => 500000,
            'max_branches' => 5,
            'max_staff' => 20,
            'has_inventory' => true,
            'has_full_reports' => true,
            'has_branding' => false,
            'has_subdomain' => false,
            'is_active' => true,
        ]);

        Plan::updateOrCreate(['name' => 'premium'], [
            'display_name' => 'Premium',
            'price_monthly' => 1500000,
            'max_branches' => -1, // unlimited
            'max_staff' => -1,    // unlimited
            'has_inventory' => true,
            'has_full_reports' => true,
            'has_branding' => true,
            'has_subdomain' => true,
            'is_active' => true,
        ]);

        // Super Admin
        User::updateOrCreate(['phone' => '+998906921469'], [
            'name' => 'Super Admin',
            'email' => 'admin@kitchens.uz',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);
    }
}
