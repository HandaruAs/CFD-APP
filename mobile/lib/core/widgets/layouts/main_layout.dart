import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/menu/data/datasources/menu_remote_datasource.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';

class MainLayout extends ConsumerStatefulWidget {
  final Widget body; // Halaman yang dibungkus (misal: HomeScreen)
  final String title; // Judul AppBar

  const MainLayout({
    super.key,
    required this.body,
    this.title = 'CFD App',
  });

  @override
  ConsumerState<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends ConsumerState<MainLayout> {
  late Future<List<MenuModel>> _menuFuture;

  @override
  void initState() {
    super.initState();
    // Panggil MenuRemoteDatasource untuk ambil menu dinamis dari backend
    _menuFuture = MenuRemoteDatasource.fetchUserMenus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: const Color(0xFF1C3F7C),
        foregroundColor: Colors.white,
      ),
      drawer: Drawer(
        child: Column(
          children: [
            Expanded(
              child: FutureBuilder<List<MenuModel>>(
                future: _menuFuture,
                builder: (context, snapshot) {
                  // State Loading
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  // State Error
                  if (snapshot.hasError) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 40),
                          const SizedBox(height: 10),
                          Text('Error: ${snapshot.error}'),
                          const SizedBox(height: 10),
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                _menuFuture = MenuRemoteDatasource.fetchUserMenus();
                              });
                            },
                            child: const Text('Coba Lagi'),
                          )
                        ],
                      ),
                    );
                  }

                  // State Sukses
                  final menus = snapshot.data!;
                  if (menus.isEmpty) {
                    return const Center(child: Text('Tidak ada menu untuk role Anda.'));
                  }

                  return ListView.builder(
                    padding: EdgeInsets.zero,
                    itemCount: menus.length,
                    itemBuilder: (context, index) {
                      final menu = menus[index];
                      return ListTile(
                        leading: Icon(_getIcon(menu.iconName)),
                        title: Text(menu.label),
                        onTap: () {
                          Navigator.pop(context); // Tutup drawer terlebih dahulu
                          if (menu.path == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Menu ini belum punya halaman.')),
                            );
                            return;
                          }
                          _navigateTo(context, menu.path!);
                        },
                      );
                    },
                  );
                },
              ),
            ),
            // Logout SENGAJA statis di luar list dinamis dari backend --
            // gak semua role (mis. superadmin) punya row menu "Logout"
            // di tabel menus, jadi ini fallback yang selalu tampil di
            // drawer apapun isi menu dinamis dari backend.
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context); // Tutup drawer dulu
                _logout(context);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
      body: widget.body,
    );
  }

  // --- Logout ---
  Future<void> _logout(BuildContext context) async {
    await ref.read(authProvider.notifier).logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  // --- Fungsi Konversi Icon ---
  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'dashboard':
        return Icons.dashboard;
      case 'store':
        return Icons.store;
      case 'storefront':
        return Icons.storefront;
      case 'verified':
        return Icons.verified_user;
      case 'verified_user':
        return Icons.verified_user;
      case 'settings':
        return Icons.settings;
      case 'logout':
        return Icons.logout;
      case 'home':
        return Icons.home;
      default:
        return Icons.circle;
    }
  }

  // --- Fungsi Navigasi ---
  //
  // CATATAN PATH: harus persis sama kolom `route` di tabel `menus`
  // backend. Yang udah dikonfirmasi dari migrasi seed:
  //   - Pedagang - Pendaftaran        -> /pedagang/pendaftaran
  //   - Pedagang - Status Verifikasi  -> /pedagang/status-verifikasi
  //   - Pedagang - Nomor Stand        -> /pedagang/nomer-stand
  //   - Petugas  - Jam Operasional    -> /petugas/jam-operasional
  //     (dari migrasi 000016_restructure_menus.up.sql)
  // Path -> halaman apa udah bukan urusan widget ini. Semua keputusan
  // routing (termasuk fallback "halaman belum dibuat") ada di satu
  // tempat: AppRouter.generateRoute (lihat core/routers/app_router.dart).
  void _navigateTo(BuildContext context, String path) {
    Navigator.pushNamed(context, path);
  }
}