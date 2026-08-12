import 'package:flutter/material.dart';
import 'package:mobile/services/menu_service.dart';
import 'package:mobile/models/menu_model.dart';
// Import halaman-halaman yang akan dinavigasi di sini
import 'package:mobile/screens/pedagang/pedagang_dashboard.dart'; 

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
    // Panggil MenuService untuk ambil menu dinamis dari backend
    _menuFuture = MenuService.fetchUserMenus();
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
                          _menuFuture = MenuService.fetchUserMenus(); // Coba ulang
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
                  // Gunakan helper _getIcon untuk konversi string ke Icon
                  leading: Icon(_getIcon(menu.iconName)), 
                  title: Text(menu.label),
                  onTap: () {
                    Navigator.pop(context); // Tutup drawer terlebih dahulu
                    _navigateTo(context, menu.path); // Panggil fungsi navigasi
                  },
                );
              },
            );
          },
        ),
      ),
      // Body-nya adalah widget.body yang kita lempar dari parameter
      body: widget.body,
    );
  }

  // --- PERBAIKAN: Fungsi Konversi Icon yang Lebih Lengkap ---
  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'dashboard': return Icons.dashboard;
      case 'store': return Icons.store;
      case 'storefront': return Icons.storefront; // Tambahan untuk nama lain
      case 'verified': return Icons.verified_user;
      case 'verified_user': return Icons.verified_user;
      case 'settings': return Icons.settings;
      case 'logout': return Icons.logout;
      case 'home': return Icons.home;
      default: return Icons.circle; // Icon default jika tidak dikenali
    }
  }

  // --- PERBAIKAN UTAMA: Fungsi Navigasi yang Sesungguhnya ---
  void _navigateTo(BuildContext context, String path) {
    print("Navigasi ke $path");

    // Gunakan switch case untuk menentukan halaman mana yang dibuka
    switch (path) {
      case '/pedagang/dashboard':
        Navigator.push(
          context, 
          MaterialPageRoute(builder: (context) => const PedagangDashboard())
        );
        break;
      
      // Tambahkan case lain di sini seiring kamu membuat halaman baru
      // case '/pedagang/pengajuan':
      //   Navigator.push(context, MaterialPageRoute(builder: (context) => const PedagangPengajuanScreen()));
      //   break;

      // case '/pedagang/settings':
      //   Navigator.push(context, MaterialPageRoute(builder: (context) => const SettingsScreen()));
      //   break;

      default:
        // Jika path tidak dikenal, tampilkan snackbar atau jangan lakukan apa-apa
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Halaman $path belum dibuat'))
        );
        break;
    }
  }
}