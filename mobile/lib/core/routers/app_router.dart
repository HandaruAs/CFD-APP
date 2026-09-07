// core/routers/app_router.dart
//
// Cuma nyisa login & register di sini. Rute pedagang/petugas (jam
// operasional, pendaftaran, dst) DULU didaftarin di sini juga, tapi
// sejak MainLayout dirombak jadi shell bottom-nav + screenRegistry
// (lihat core/widgets/screen_registry.dart), screen-screen itu cuma
// widget "body" -- gak punya Scaffold/AppBar sendiri lagi. Nge-push
// mereka lewat Navigator.pushNamed() bakal nongol tanpa AppBar/back
// button. Kalau butuh buka salah satu tab itu, pindah tab lewat
// bottomNavIndexProvider (lihat contoh di petugas_home_screen.dart),
// bukan lewat sini.

import 'package:flutter/material.dart';

import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/presentation/pages/register_screen.dart';

class AppRoutes {
  static const login = '/login';
  static const register = '/register';
}

class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case AppRoutes.register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());

      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('Halaman ${settings.name} tidak ditemukan.'),
            ),
          ),
        );
    }
  }
}