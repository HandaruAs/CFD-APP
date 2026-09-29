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

/// Tinggi AppBar gradasi -- lebih tinggi dari default (56) karena
/// nampung 2 baris teks (sapaan + judul menu).
const _kAppBarHeight = 92.0;

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
// Alias label KHUSUS buat bottom nav (NavigationBar Material 3 gak bisa
// dipaksa 1 baris / auto-shrink font per label kayak Tab), supaya gak
// wrap ke 2 baris dan bikin tinggi antar tab beda-beda kayak yang kejadian
// di menu "Scan QR Pedagang". AppBar title & item drawer TETAP pakai nama
// asli dari database (_buildDrawer & currentItem.label di AppBar) --
// yang diringkas cuma teks di kartu nav bar bawah.
//
// Di-key pakai `route`, bukan teks label, biar gak "diam-diam basi" kalau
// besok nama menunya diedit dari halaman Manajemen Menu (web) -- kalau
// route-nya gak ketemu di sini, fallback ke label asli apa adanya.
const Map<String, String> _kNavLabelOverride = {
  '/petugas/scan-qr': 'Scan QR',
};

String _navLabel(MenuModel m) => _kNavLabelOverride[m.path] ?? m.label;

/// Sapaan berdasarkan jam device -- niru pola umum app konsumer
/// (Sapawarga, dsb): "Selamat Pagi/Siang/Sore/Malam".
String _sapaanWaktu() {
  final jam = DateTime.now().hour;
  if (jam < 10) return 'Selamat Pagi';
  if (jam < 15) return 'Selamat Siang';
  if (jam < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

/// Nama depan aja, biar gak kepanjangan di AppBar (nama lengkap ada di
/// drawer/Profil).
String _namaDepan(String? nama) {
  if (nama == null || nama.trim().isEmpty) return 'Pengguna';
  return nama.trim().split(RegExp(r'\s+')).first;
}

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
    // "Pendaftaran" udah digabung ke "Nomor Stand" (LapakScreen), sama
    // kayak web. Kalau dua-duanya masih ada di tabel menus, sembunyiin
    // Pendaftaran biar gak ada 2 tab yang isinya sama. Kalau ternyata
    // cuma Pendaftaran yang ada, dia tetap tampil (di-mapping ke
    // LapakScreen juga di screenRegistry).
    final adaNomerStand = backendMenus.any((m) => m.path == '/pedagang/nomer-stand');
    // Menu web-only ditandai lewat menus.flags {"mobile": false} di DB
    // (lihat migrasi 000027), bukan lagi daftar path hardcoded di sini.
    // Cuma aturan "Pendaftaran digabung ke Nomor Stand" yang masih
    // dihitung di klien, karena itu soal dua menu yang isinya sama,
    // bukan soal menu web-only.
    final visibleBackendMenus = backendMenus
        .where((m) => m.showOnMobile)
        .where((m) => !(adaNomerStand && m.path == '/pedagang/pendaftaran'))
        .toList();

    if (visibleBackendMenus.isEmpty) {
      return const Center(child: Text('Tidak ada menu untuk role Anda.'));
    }

    // Tab "Profil" selalu ditambahin di akhir -- klien-only, gak perlu
    // nunggu row di tabel `menus` backend.
    final items = [
      ...visibleBackendMenus,
      MenuModel(label: 'Profil', path: '__profile__', iconName: 'person'),
    ];
    final useSidebar = items.length > _kMaxBottomNavItems;

    // Set tab awal cuma sekali (pas pertama kali data menu kebaca),
    // biar gak ke-reset tiap rebuild.
    if (!_initialIndexApplied) {
      _initialIndexApplied = true;
      if (widget.initialPath != null) {
        final idx = visibleBackendMenus.indexWhere((m) => m.path == widget.initialPath);
        if (idx != -1) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            ref.read(bottomNavIndexProvider.notifier).state = idx;
          });
        }
      }
    }

    final selectedIndex = ref.watch(bottomNavIndexProvider).clamp(0, items.length - 1);
    final currentItem = items[selectedIndex];
    final user = ref.watch(userProvider);

    void onSelect(int index) {
      ref.read(bottomNavIndexProvider.notifier).state = index;
      if (useSidebar) Navigator.of(context).pop(); // tutup drawer
    }

    return Scaffold(
      key: _drawerKey,
      appBar: _buildAppBar(currentItem, user?.name, useSidebar),
      drawer: useSidebar ? _buildDrawer(items, selectedIndex, onSelect) : null,
      body: IndexedStack(
        index: selectedIndex,
        children: items.map((m) => _buildTabBody(m)).toList(),
      ),
      bottomNavigationBar:
          useSidebar ? null : _buildBottomNav(items, selectedIndex, onSelect),
    );
  }

  /// AppBar gradasi brand color, sudut bawah melengkung, isi sapaan +
  /// judul menu aktif -- ganti AppBar polos lama yang cuma judul doang.
  PreferredSizeWidget _buildAppBar(
    MenuModel currentItem,
    String? userName,
    bool useSidebar,
  ) {
    return AppBar(
      toolbarHeight: _kAppBarHeight,
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [kBrandColor, kBrandColorLight],
          ),
        ),
      ),
      leading: useSidebar
          ? IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => _drawerKey.currentState?.openDrawer(),
            )
          : Padding(
              padding: const EdgeInsets.all(16),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: Colors.white,
                child: ClipOval(
                  child: Padding(
                    padding: const EdgeInsets.all(5),
                    child: Image.asset(
                      'assets/images/logo.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) =>
                          const Icon(Icons.storefront, color: kBrandColor, size: 18),
                    ),
                  ),
                ),
              ),
            ),
      title: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${_sapaanWaktu()}, ${_namaDepan(userName)}',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            currentItem.label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 19,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
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
              label: _navLabel(m),
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