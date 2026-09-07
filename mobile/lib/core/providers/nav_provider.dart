import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/features/menu/data/datasources/menu_remote_datasource.dart';

/// Daftar menu dari backend, di-share ke seluruh shell (bottom nav) dan
/// siapa pun yang perlu tau "menu apa aja yang ada" -- misalnya dashboard
/// yang mau pindah tab lewat shortcut card, bukan cuma bottom nav-nya
/// sendiri.
final menuListProvider = FutureProvider<List<MenuModel>>((ref) {
  return MenuRemoteDatasource.fetchUserMenus();
});

/// Index tab yang lagi aktif di bottom nav. Diubah dari 2 tempat: tap
/// langsung di BottomNavigationBar, atau dari dalam salah satu tab (mis.
/// shortcut card Dashboard) yang mau mindahin ke tab lain.
final bottomNavIndexProvider = StateProvider<int>((ref) => 0);