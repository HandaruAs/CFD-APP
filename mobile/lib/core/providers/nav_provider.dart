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

/// Menu backend yang BENERAN tampil sebagai tab di MainLayout (urutannya
/// sama persis dengan index bottomNavIndexProvider). Dipakai MainLayout
/// sendiri DAN tab lain yang mau lompat ke tab tertentu (mis. tombol
/// "Acak Lapak" di Jam Operasional) -- jadi aturan filternya cukup
/// ditulis di satu tempat, gak bisa beda sendiri-sendiri.
List<MenuModel> visibleTabMenus(List<MenuModel> backendMenus) {
  // "Pendaftaran" udah digabung ke "Nomor Stand" (LapakScreen), sama
  // kayak web -- kalau dua-duanya ada, sembunyiin Pendaftaran.
  final adaNomerStand = backendMenus.any((m) => m.path == '/pedagang/nomer-stand');
  return backendMenus
      .where((m) => m.showOnMobile)
      .where((m) => !(adaNomerStand && m.path == '/pedagang/pendaftaran'))
      .toList();
}

/// Index tab untuk [path], atau -1 kalau menu itu gak ada / gak tampil
/// buat role user ini.
int tabIndexForPath(List<MenuModel> backendMenus, String path) {
  return visibleTabMenus(backendMenus).indexWhere((m) => m.path == path);
}