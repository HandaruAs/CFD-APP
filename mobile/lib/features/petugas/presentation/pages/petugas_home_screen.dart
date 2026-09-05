import 'package:flutter/material.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';

/// Placeholder dashboard petugas. Ganti body-nya kalau fitur petugas
/// (verifikasi pengajuan pedagang, dsb) udah mulai digarap -- drawer,
/// menu, dan logout udah otomatis kepegang MainLayout.
class PetugasHomeScreen extends StatelessWidget {
  const PetugasHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const MainLayout(
      title: 'Dashboard Petugas CFD',
      body: Center(
        child: Text('Halaman dashboard petugas belum dibuat.'),
      ),
    );
  }
}