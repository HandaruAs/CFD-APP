import 'package:flutter/material.dart';
import 'package:mobile/features/petugas/presentation/pages/petugas_home_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/jam_operasional_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/scan_qr_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/sisa_lapak_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/laporan_screen.dart';
import 'package:mobile/features/superadmin/presentation/pages/superadmin_home_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/pendaftaran_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/status_verifikasi_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/lapak_screen.dart';

/// Pemetaan route (kolom `route` di tabel `menus` backend) -> widget
/// BODY-nya doang (bukan halaman penuh -- Scaffold/AppBar udah dipegang
/// shell di MainLayout). Kalau path gak ketemu di sini, shell nampilin
/// placeholder "belum dibuat" otomatis -- jadi aman ditambah dikit-dikit
/// seiring fitur baru selesai, gak perlu semua didaftarin sekaligus.
///
/// CATATAN: khusus pedagang, path Dashboard/Pendaftaran/Status
/// Verifikasi belum aku daftarin di sini karena beberapa migrasi lama
/// sempet gonta-ganti route-nya (lihat riwayat 000014 & 000016) dan aku
/// belum 100% yakin mana yang route aktif sekarang. Tambahin manual
/// entry-nya di sini kalau udah dicek dari drawer/menu backend.
final Map<String, WidgetBuilder> screenRegistry = {
  '/petugas': (_) => const PetugasHomeScreen(),
  '/petugas/jam-operasional': (_) => const JamOperasionalScreen(),
  '/petugas/scan-qr': (_) => const ScanQrScreen(),
  '/petugas/sisa-lapak': (_) => const SisaLapakScreen(),
  '/petugas/laporan': (_) => const LaporanScreen(),
  '/admin': (_) => const SuperadminHomeScreen(),
  '/pedagang/pendaftaran': (_) => const PendaftaranScreen(),
  '/pedagang/status-verifikasi': (_) => const StatusVerifikasiScreen(),
  '/pedagang/nomer-stand': (_) => const LapakScreen(),
};