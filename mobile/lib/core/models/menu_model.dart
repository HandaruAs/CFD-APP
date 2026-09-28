class MenuModel {
  final String label;
  final String? path;
  final String iconName;

  /// Isi kolom `menus.flags` dari backend (GET /api/menus). Default kosong
  /// buat menu yang dibuat client-side (mis. tab "Profil").
  final Map<String, dynamic> flags;

  const MenuModel({
    required this.label,
    this.path,
    required this.iconName,
    this.flags = const {},
  });

  /// Menu ditampilkan di app mobile kecuali flag `mobile` di-set false
  /// secara eksplisit di DB. Key gak ada = tampil (kompatibel dengan
  /// semua menu lama).
  bool get showOnMobile => flags['mobile'] != false;

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    final rawFlags = json['flags'];
    final flags =
        rawFlags is Map ? Map<String, dynamic>.from(rawFlags) : const <String, dynamic>{};

    // `flags.mobile_route` = route khusus mobile. Dipakai buat menu
    // induk (mis. "Manajemen User") yang `route`-nya sengaja dikosongkan
    // di DB supaya sidebar web tetap cuma buka-tutup submenu. Kalau gak
    // ada, pakai `route` biasa.
    final mobileRoute = flags['mobile_route'];

    return MenuModel(
      label: json['name'] as String,
      path: mobileRoute is String && mobileRoute.isNotEmpty
          ? mobileRoute
          : json['route'] as String?,
      iconName: json['icon'] as String? ?? 'circle',
      flags: flags,
    );
  }
}