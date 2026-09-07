import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/core/providers/nav_provider.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/widgets/profile_tab.dart';
import 'package:mobile/core/widgets/screen_registry.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

/// Batas jumlah tab yang masih nyaman ditaruh di bottom nav. Di atas
/// ini, label mulai kepotong/kepepet (kasus lama: "Jam Operasional"
/// kepotong separo) -- jadi otomatis pindah ke sidebar (drawer)
/// daripada maksain muat di bawah.
const _kMaxBottomNavItems = 5;

/// Shell utama tiap role: satu Scaffold yang isi tab-nya (IndexedStack)
/// dirakit dari menu dinamis backend lewat [screenRegistry], PLUS satu
/// tab tambahan "Profil" (klien-only, bukan dari backend) yang isinya
/// info akun + tombol Logout -- logout gak lagi nempel di AppBar.
///
/// Navigasinya adaptif:
///  - <= 5 tab total (termasuk Profil)  -> NavigationBar modern di bawah
///  - >  5 tab total                    -> NavigationDrawer (sidebar),
///    dibuka lewat ikon hamburger di AppBar, biar label tetap kebaca
///    penuh tanpa dipotong.
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
  final _drawerKey = GlobalKey<ScaffoldState>();

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

  Widget _buildShell(List<MenuModel> backendMenus) {
    if (backendMenus.isEmpty) {
      return const Center(child: Text('Tidak ada menu untuk role Anda.'));
    }

    // Tab "Profil" selalu ditambahin di akhir -- klien-only, gak perlu
    // nunggu row di tabel `menus` backend.
    final items = [
      ...backendMenus,
      MenuModel(label: 'Profil', path: '__profile__', iconName: 'person'),
    ];
    final useSidebar = items.length > _kMaxBottomNavItems;

    // Set tab awal cuma sekali (pas pertama kali data menu kebaca),
    // biar gak ke-reset tiap rebuild.
    if (!_initialIndexApplied) {
      _initialIndexApplied = true;
      if (widget.initialPath != null) {
        final idx = backendMenus.indexWhere((m) => m.path == widget.initialPath);
        if (idx != -1) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            ref.read(bottomNavIndexProvider.notifier).state = idx;
          });
        }
      }
    }

    final selectedIndex = ref.watch(bottomNavIndexProvider).clamp(0, items.length - 1);
    final currentItem = items[selectedIndex];

    void onSelect(int index) {
      ref.read(bottomNavIndexProvider.notifier).state = index;
      if (useSidebar) Navigator.of(context).pop(); // tutup drawer
    }

    return Scaffold(
      key: _drawerKey,
      appBar: AppBar(
        title: Text(currentItem.label),
        leading: useSidebar
            ? IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => _drawerKey.currentState?.openDrawer(),
              )
            : null,
      ),
      drawer: useSidebar ? _buildDrawer(items, selectedIndex, onSelect) : null,
      body: IndexedStack(
        index: selectedIndex,
        children: items.map((m) => _buildTabBody(m)).toList(),
      ),
      bottomNavigationBar:
          useSidebar ? null : _buildBottomNav(items, selectedIndex, onSelect),
    );
  }

  Widget _buildBottomNav(
    List<MenuModel> items,
    int selectedIndex,
    ValueChanged<int> onSelect,
  ) {
    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: onSelect,
      destinations: items
          .map(
            (m) => NavigationDestination(
              icon: Icon(_getIcon(m.iconName)),
              selectedIcon: Icon(_getIcon(m.iconName), color: kBrandColor),
              label: m.label,
              tooltip: m.label,
            ),
          )
          .toList(),
    );
  }

  Widget _buildDrawer(
    List<MenuModel> items,
    int selectedIndex,
    ValueChanged<int> onSelect,
  ) {
    final user = ref.watch(userProvider);

    return NavigationDrawer(
      selectedIndex: selectedIndex,
      onDestinationSelected: onSelect,
      children: [
        DrawerHeader(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [kBrandColor, kBrandColorLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Align(
            alignment: Alignment.bottomLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircleAvatar(
                  radius: 22,
                  backgroundColor: Colors.white,
                  child: Icon(Icons.person, color: kBrandColor),
                ),
                const SizedBox(height: 10),
                Text(
                  user?.name ?? 'Pengguna',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
        ...items.map(
          (m) => NavigationDrawerDestination(
            icon: Icon(_getIcon(m.iconName)),
            label: Text(m.label),
          ),
        ),
      ],
    );
  }

  Widget _buildTabBody(MenuModel menu) {
    if (menu.path == '__profile__') {
      return const ProfileTab();
    }
    final builder = screenRegistry[menu.path];
    if (builder == null) {
      return Center(child: Text('Halaman "${menu.label}" belum dibuat.'));
    }
    return Builder(builder: builder);
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
      case 'person':
        return Icons.person_outline;
      default:
        return Icons.circle;
    }
  }
}