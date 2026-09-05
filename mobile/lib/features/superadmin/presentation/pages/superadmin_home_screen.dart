import 'package:flutter/material.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';

/// Placeholder dashboard superadmin. Ganti body-nya kalau fitur
/// superadmin udah mulai digarap -- drawer, menu, dan logout udah
/// otomatis kepegang MainLayout.
class SuperadminHomeScreen extends StatelessWidget {
  const SuperadminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const MainLayout(
      title: 'Dashboard Super Admin',
      body: Center(
        child: Text('Halaman dashboard superadmin belum dibuat.'),
      ),
    );
  }
}