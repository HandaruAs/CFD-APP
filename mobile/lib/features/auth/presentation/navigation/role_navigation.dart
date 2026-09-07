import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/domain/entities/user.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/superadmin/presentation/pages/superadmin_home_screen.dart';

/// Titik tunggal buat nentuin halaman awal (home) tiap role setelah
/// login/auto-login berhasil. Semua percabangan logic-per-role hidup
/// di sini -- login_screen dan splash_screen tinggal panggil
/// [resolveHomeScreen], gak perlu tau detail tiap role.
class RoleNavigation {
  RoleNavigation._();

  static Future<Widget> resolveHomeScreen(WidgetRef ref, AuthUser user) async {
    switch (user.role) {
      case 'pedagang':
        return _resolvePedagangHome(ref);
      case 'petugas':
        // Gak perlu initialPath -- tab index 0 (Dashboard) udah pas
        // buat kondisi awal petugas, gak ada percabangan kayak pedagang.
        return const MainLayout();
      case 'superadmin':
        // Superadmin BUKAN MainLayout -- menunya masih halaman
        // manajemen (bukan tab dashboard), lihat komentar di
        // SuperadminHomeScreen.
        return const SuperadminHomeScreen();
      default:
        // Role tak dikenal -- tetap kasih halaman (bukan crash), biar
        // gampang ketauan kalau ada role baru dari backend yang belum
        // di-handle di app.
        return _UnknownRolePlaceholder(roleLabel: user.role);
    }
  }

  /// Pedagang: cek dulu udah pernah ngirim pengajuan usaha apa belum,
  /// biar tab awal yang kebuka MainLayout bukan Pendaftaran kalau
  /// ternyata udah pernah ngajuin.
  static Future<Widget> _resolvePedagangHome(WidgetRef ref) async {
    await ref.read(pedagangProvider.notifier).loadStatusPengajuan();
    final sudahAdaPengajuan = ref.read(pedagangProvider).pengajuan != null;

    return MainLayout(
      initialPath: sudahAdaPengajuan
          ? '/pedagang/status-verifikasi'
          : '/pedagang/pendaftaran',
    );
  }
}

/// Fallback kalau backend suatu saat ngasih role yang gak dikenal app
/// ini. Bukan bug/crash -- cuma sinyal "ada role baru, perlu di-handle
/// di resolveHomeScreen di atas".
class _UnknownRolePlaceholder extends StatelessWidget {
  final String roleLabel;

  const _UnknownRolePlaceholder({required this.roleLabel});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Dashboard $roleLabel'),
        backgroundColor: const Color(0xFF1C3F7C),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Text('Role "$roleLabel" belum di-handle di app.'),
      ),
    );
  }
}