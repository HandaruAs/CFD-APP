import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/domain/entities/user.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
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
        // Pendaftaran & klaim lapak udah satu halaman (LapakScreen) --
        // halaman itu sendiri yang nentuin nampilin form daftar, form
        // klaim, atau hasil klaim. Jadi gak perlu cek pengajuan di sini.
        return const MainLayout(initialPath: '/pedagang/nomer-stand');
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
