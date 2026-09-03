import 'package:flutter/material.dart';
import 'package:mobile/features/menu/data/datasources/menu_remote_datasource.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/features/pedagang/presentation/pages/pendaftaran_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/status_verifikasi_screen.dart';
import 'package:mobile/features/pedagang/presentation/pages/lapak_screen.dart';

class MainLayout extends StatefulWidget {
  final Widget body; // Halaman yang dibungkus (misal: HomeScreen)
  final String title; // Judul AppBar

  const MainLayout({
    super.key,
    required this.body,
    this.title = 'CFD App',
  });

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
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
      body: widget.body,
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
  // CATATAN PATH: ini harus persis sama kayak kolom `route` di tabel
  // `menus` backend, yang sekarang kamu atur sendiri lewat Manajemen
  // Menu (bukan migrasi). Yang udah dikonfirmasi dari seed migrasi lama:
  //   - Dashboard            -> /pedagang                (belum ada halamannya)
  //   - Pendaftaran          -> /pedagang/pendaftaran
  //   - Status Verifikasi    -> /pedagang/status-verifikasi
  //   - Jadwal & Lokasi      -> /pedagang/jadwal-lokasi   (masih dummy, ganti
  //     route-nya lewat Manajemen Menu jadi '/pedagang/nomor-stand' biar
  //     kepencet ke LapakScreen di bawah)
  //   - Profil Usaha         -> /pedagang/profil          (belum dikerjain)
  //
  // CheckoutScreen SENGAJA gak punya case di sini -- gak ada menu yang
  // nunjuk ke situ, sama kayak CekOut di web. Halaman ini cuma dicapai
  // lewat auto-redirect dari LapakScreen setelah polling check-in
  // berhasil (lihat _maybeStartPolling di lapak_screen.dart).
  void _navigateTo(BuildContext context, String path) {
    switch (path) {
      case '/pedagang/pendaftaran':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const PendaftaranScreen()),
        );
        break;

      case '/pedagang/status-verifikasi':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const StatusVerifikasiScreen()),
        );
        break;

      case '/pedagang/nomer-stand':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const LapakScreen()),
        );
        break;

      default:
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Halaman $path belum dibuat')),
        );
        break;
    }
  }
}