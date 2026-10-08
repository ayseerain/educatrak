<?php

namespace App;

enum UserRole: string
{
    case Admin = 'admin';
    case Cashier = 'cashier';
    case Accounting = 'accounting';
    case Auditor = 'auditor';
    case Registrar = 'registrar';
}
