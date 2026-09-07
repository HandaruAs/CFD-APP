import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/core/providers/nav_provider.dart';
import 'package:mobile/core/widgets/screen_registry.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';

/// Shell utama tiap role: satu Scaffold dengan AppBar + BottomNavigationBar,
/// isi tab-nya (IndexedStack) dirakit dari menu dinamis backend lewat
/// [screenRegistry]. Dipanggil SEKALI per role (dari RoleNavigation),
/// bukan lagi dibungkus di tiap screen individual kayak sebelumnya.
///
/// [initialPath] opsional -- buat kasus kayak pedagang yang perlu milih
/// tab awal beda tergantung kondisi (misal udah/belum ngajuin usaha),
/// tanpa nunggu render pertama nunjukin tab index 0 dulu.
class MainLayout extends ConsumerStatefulWidget {
  final String? initialPath;

  const MainLayout({super.key, this.initialPath});

  @override
  ConsumerState<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends ConsumerState<MainLayout> {
  bool _initialIndexApplied = false;

  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(menuListProvider);

    return Scaffold(
      body: menuAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 48),
                const SizedBox(height: 12),
                Text('$err', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(menuListProvider),
                  child: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
        data: (menus) => _buildShell(menus),
      ),
    );
  }

  Widget _buildShell(List<MenuModel> menus) {
    if (menus.isEmpty) {
      return const Center(child: Text('Tidak ada menu untuk role Anda.'));
    }

    // Set tab awal cuma sekali (pas pertama kali data menu kebaca),
    // biar gak ke-reset tiap rebuild.
    if (!_initialIndexApplied) {
      _initialIndexApplied = true;
      if (widget.initialPath != null) {
        final idx = menus.indexWhere((m) => m.path == widget.initialPath);
        if (idx != -1) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            ref.read(bottomNavIndexProvider.notifier).state = idx;
          });
        }
      }
    }

    final selectedIndex = ref.watch(bottomNavIndexProvider).clamp(0, menus.length - 1);
    final currentMenu = menus[selectedIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(currentMenu.label),
        backgroundColor: const Color(0xFF1C3F7C),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: () => _logout(context),
          ),
        ],
      ),
      body: IndexedStack(
        index: selectedIndex,
        children: menus.map((m) => _buildTabBody(m)).toList(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed, // dipaksa muat semua, sesuai keputusan
        currentIndex: selectedIndex,
        selectedItemColor: const Color(0xFF1C3F7C),
        unselectedItemColor: Colors.black45,
        onTap: (index) => ref.read(bottomNavIndexProvider.notifier).state = index,
        items: menus
            .map((m) => BottomNavigationBarItem(
                  icon: Icon(_getIcon(m.iconName)),
                  label: m.label,
                ))
            .toList(),
      ),
    );
  }

  Widget _buildTabBody(MenuModel menu) {
    final builder = screenRegistry[menu.path];
    if (builder == null) {
      return Center(child: Text('Halaman "${menu.label}" belum dibuat.'));
    }
    return Builder(builder: builder);
  }

  Future<void> _logout(BuildContext context) async {
    await ref.read(authProvider.notifier).logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'dashboard':
        return Icons.dashboard;
      case 'store':
        return Icons.store;
      case 'storefront':
        return Icons.storefront;
      case 'verified':
      case 'verified_user':
        return Icons.verified_user;
      case 'settings':
        return Icons.settings;
      case 'clock':
        return Icons.access_time;
      case 'qr-code':
        return Icons.qr_code_scanner;
      case 'clipboard-list':
        return Icons.assignment_outlined;
      case 'check-circle':
        return Icons.check_circle_outline;
      case 'users':
        return Icons.people_outline;
      case 'home':
        return Icons.home;
      default:
        return Icons.circle;
    }
  }
}