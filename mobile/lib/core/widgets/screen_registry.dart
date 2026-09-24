import 'package:flutter/material.dart';
import 'package:mobile/features/petugas/presentation/pages/petugas_home_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/jam_operasional_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/scan_qr_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/laporan_screen.dart';
import 'package:mobile/features/superadmin/presentation/pages/superadmin_home_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/lapak_screen.dart';

/// Pemetaan route (kolom `route` di tabel `menus` backend) -> widget
/// BODY-nya doang (bukan halaman penuh -- Scaffold/AppBar udah dipegang
/// shell di MainLayout). Kalau path gak ketemu di sini, shell nampilin
/// placeholder "belum dibuat" otomatis -- jadi aman ditambah dikit-dikit
/// seiring fitur baru selesai, gak perlu semua didaftarin sekaligus.
///
/// CATATAN: "Status Verifikasi" (dulu di sini) udah dihapus total --
/// fitur nunggu-approval-petugas itu di-scrap, sama kayak di web. Alur
/// pedagang sekarang: Pendaftaran -> langsung Nomor Stan/klaim lapak,
/// gak ada tahap nunggu di antaranya.
///
/// Pendaftaran & klaim lapak sekarang SATU halaman (LapakScreen), sama
/// kayak web /pedagang/nomer-stand. '/pedagang/pendaftaran' tetap
/// di-mapping ke LapakScreen sebagai cadangan (di web route itu juga
/// cuma redirect) -- MainLayout nyembunyiin menunya kalau menu
/// nomer-stand ada, biar gak dobel tab.
final Map<String, WidgetBuilder> screenRegistry = {
  '/petugas': (_) => const PetugasHomeScreen(),
  '/petugas/jam-operasional': (_) => const JamOperasionalScreen(),
  '/petugas/scan-qr': (_) => const ScanQrScreen(),
  '/petugas/laporan': (_) => const LaporanScreen(),
  '/admin': (_) => const SuperadminHomeScreen(),
  '/pedagang/pendaftaran': (_) => const LapakScreen(),
  '/pedagang/nomer-stand': (_) => const LapakScreen(),
};