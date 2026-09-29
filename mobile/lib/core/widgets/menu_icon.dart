import 'package:flutter/material.dart';

/// Pemetaan nama ikon dari backend (kolom `icon` di tabel menus) -> IconData.
/// Dipakai dashboard untuk baris "Layanan".
IconData menuIcon(String name) {
  switch (name) {
    case 'dashboard':
      return Icons.dashboard_rounded;
    case 'store':
      return Icons.store_rounded;
    case 'storefront':
      return Icons.storefront_rounded;
    case 'verified':
    case 'verified_user':
      return Icons.verified_user_rounded;
    case 'settings':
      return Icons.settings_rounded;
    case 'clock':
      return Icons.access_time_rounded;
    case 'qr-code':
      return Icons.qr_code_scanner_rounded;
    case 'clipboard-list':
      return Icons.assignment_rounded;
    case 'check-circle':
      return Icons.check_circle_rounded;
    case 'users':
      return Icons.people_alt_rounded;
    case 'home':
      return Icons.home_rounded;
    case 'person':
      return Icons.person_rounded;
    default:
      return Icons.apps_rounded;
  }
}