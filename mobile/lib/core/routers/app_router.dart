// core/routers/app_router.dart
//
// Satu-satunya tempat yang tau "path -> halaman apa". main.dart dan
// main_layout.dart sama-sama manggil Navigator.pushNamed()/pushReplacementNamed(),
// gak ada lagi yang bikin MaterialPageRoute manual sendiri-sendiri.

import 'package:flutter/material.dart';

import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/presentation/pages/register_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/pendaftaran_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/status_verifikasi_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/lapak_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/checkout_screen.dart';

class AppRoutes {
  // Auth
  static const login = '/login';
  static const register = '/register';

  // Pedagang -- string-nya HARUS sama persis kayak kolom `route` di
  // tabel `menus` backend, karena ini yang dipencet dari drawer.
  static const pedagangDashboard = '/pedagang'; // belum ada halamannya
  static const pedagangPendaftaran = '/pedagang/pendaftaran';
  static const pedagangStatusVerifikasi = '/pedagang/status-verifikasi';
  static const pedagangNomerStand = '/pedagang/nomer-stand';
  static const pedagangProfil = '/pedagang/profil'; // belum dikerjain

  // CheckoutScreen sengaja gak masuk sini sebagai named route -- dia
  // cuma dicapai lewat auto-redirect polling dari LapakScreen, sama
  // kayak sebelumnya. Kalau nanti mau dipanggil manual, tinggal
  // tambahin case '/pedagang/checkout' di bawah.
}

class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());

      case AppRoutes.register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());

      case AppRoutes.pedagangPendaftaran:
        return MaterialPageRoute(builder: (_) => const PendaftaranScreen());

      case AppRoutes.pedagangStatusVerifikasi:
        return MaterialPageRoute(builder: (_) => const StatusVerifikasiScreen());

      case AppRoutes.pedagangNomerStand:
        return MaterialPageRoute(builder: (_) => const LapakScreen());

      // Belum ada halamannya -- tetep didaftarin biar gak numpuk di
      // default case, tapi munculin state kosong yang jelas dulu.
      case AppRoutes.pedagangDashboard:
      case AppRoutes.pedagangProfil:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(title: Text('Halaman ${settings.name}')),
            body: Center(
              child: Text('Halaman ${settings.name} belum dibuat.'),
            ),
          ),
        );

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