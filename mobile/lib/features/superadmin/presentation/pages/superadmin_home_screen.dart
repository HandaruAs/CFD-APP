import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';

/// Placeholder dashboard superadmin.
///
/// SENGAJA berdiri sendiri, TIDAK dibungkus MainLayout -- menu-menu
/// superadmin di DB (lihat migrasi 000016 & 000021) semuanya halaman
/// manajemen (/admin/verifikasi-pengajuan, /admin/manajemen-user/...,
/// dst), bukan tab dashboard yang cocok buat shell bottom-nav +
/// IndexedStack yang dipakai pedagang/petugas. Begitu fitur superadmin
/// mulai digarap di mobile, halaman ini yang pertama diganti.
class SuperadminHomeScreen extends ConsumerWidget {
  const SuperadminHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Super Admin'),
        backgroundColor: const Color(0xFF1C3F7C),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: () => _logout(context, ref),
          ),
        ],
      ),
      body: const Center(
        child: Text('Halaman dashboard superadmin belum dibuat.'),
      ),
    );
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authProvider.notifier).logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }
}