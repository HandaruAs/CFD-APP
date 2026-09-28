import 'package:flutter/material.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/user/domain/entities/managed_user.dart';
import 'package:mobile/features/user/presentation/pages/user_management_screen.dart';

/// Menu induk "Manajemen User" di mobile: satu tab bar Pedagang /
/// Petugas / Superadmin, tiap tab = UserManagementScreen buat role itu.
/// (Di web ini tiga submenu terpisah; di HP digabung biar sidebar gak
/// penuh.)
class ManajemenUserScreen extends StatelessWidget {
  const ManajemenUserScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          Material(
            color: Colors.white,
            child: TabBar(
              labelColor: kBrandColor,
              unselectedLabelColor: Colors.black54,
              indicatorColor: kBrandColor,
              tabs: [
                for (final r in UserRole.values) Tab(text: r.label),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                for (final r in UserRole.values) UserManagementScreen(role: r),
              ],
            ),
          ),
        ],
      ),
    );
  }
}