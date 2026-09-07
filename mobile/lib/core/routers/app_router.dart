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
import 'package:mobile/features/petugas/presentation/pages/jam_operasional_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/scan_qr_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/sisa_lapak_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/laporan_screen.dart';

class AppRoutes {
  // Auth
  static const login = '/login';
  static const register = '/register';

  // Pedagang 
  static const pedagangDashboard = '/pedagang'; // belum ada halamannya
  static const pedagangPendaftaran = '/pedagang/pendaftaran';
  static const pedagangStatusVerifikasi = '/pedagang/status-verifikasi';
  static const pedagangNomerStand = '/pedagang/nomer-stand';
  static const pedagangProfil = '/pedagang/profil'; // belum dikerjain

  // Petugas 
  static const petugasJamOperasional = '/petugas/jam-operasional';
  static const petugasScanQr = '/petugas/scan-qr';
  static const petugasLaporan = '/petugas/laporan';
  static const petugasSisaLapak = '/petugas/sisa-lapak';
}

class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      // Auth
      case AppRoutes.login:
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case AppRoutes.register:
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
      // Pedagang
      case AppRoutes.pedagangPendaftaran:
        return MaterialPageRoute(builder: (_) => const PendaftaranScreen());
      case AppRoutes.pedagangStatusVerifikasi:
        return MaterialPageRoute(builder: (_) => const StatusVerifikasiScreen());
      case AppRoutes.pedagangNomerStand:
        return MaterialPageRoute(builder: (_) => const LapakScreen());
      // Petugas
      case AppRoutes.petugasJamOperasional:
        return MaterialPageRoute(builder: (_) => const JamOperasionalScreen());
      case AppRoutes.petugasScanQr:
        return MaterialPageRoute(builder: (_) => const ScanQrScreen());
      case AppRoutes.petugasSisaLapak:
        return MaterialPageRoute(builder: (_) => const SisaLapakScreen());
      case AppRoutes.petugasLaporan:
        return MaterialPageRoute(builder: (_) => const LaporanScreen());

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