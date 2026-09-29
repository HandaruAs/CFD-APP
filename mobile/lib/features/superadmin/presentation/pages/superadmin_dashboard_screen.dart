import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/menu_model.dart';
import 'package:mobile/core/providers/nav_provider.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/widgets/menu_icon.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';
import 'package:mobile/features/superadmin/domain/entities/admin_dashboard.dart';
import 'package:mobile/features/superadmin/presentation/providers/admin_dashboard_provider.dart';

/// TAB "Dashboard" superadmin -- body doang (Scaffold/AppBar dipegang MainLayout).
/// Susunan: hero (salam + info aplikasi) -> Layanan (horizontal) -> ringkasan hari ini.
class SuperadminDashboardScreen extends ConsumerWidget {
  const SuperadminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminDashboardProvider);
    final nama = ref.watch(userProvider)?.name ?? 'Superadmin';

    return RefreshIndicator(
      onRefresh: () => ref.refresh(adminDashboardProvider.future),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          _Hero(nama: nama, tanggal: async.valueOrNull?.tanggal ?? ''),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
            child: _SectionTitle('Layanan'),
          ),
          const _LayananRow(),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
            child: _SectionTitle('Ringkasan Hari Ini'),
          ),
          async.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (err, _) => Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 40),
                  const SizedBox(height: 8),
                  Text('$err', textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => ref.invalidate(adminDashboardProvider),
                    child: const Text('Coba Lagi'),
                  ),
                ],
              ),
            ),
            data: (d) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  _SesiCard(sesi: d.sesi),
                  const SizedBox(height: 12),
                  _LapakCard(lapak: d.lapak),
                  const SizedBox(height: 12),
                  _HadirCard(hadir: d.hadir),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────── Hero + info aplikasi ─────────────────────────

String _salam() {
  final h = DateTime.now().hour;
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

class _Hero extends StatelessWidget {
  final String nama;
  final String tanggal;
  const _Hero({required this.nama, required this.tanggal});

  @override
  Widget build(BuildContext context) {
    final tgl = DateTime.tryParse(tanggal) ?? DateTime.now();
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [kBrandColor, kBrandColorLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${_salam()},',
              style: const TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 2),
          Text(nama,
              style: const TextStyle(
                  color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(formatHariTanggal(tgl),
              style: const TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 18),
          // Info aplikasi
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.directions_walk_rounded,
                      color: kBrandColor),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Car Free Day',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 15)),
                      SizedBox(height: 2),
                      Text(
                        'Kelola sesi, penataan lapak, dan kehadiran pedagang dalam satu aplikasi.',
                        style: TextStyle(
                            color: Colors.white70, fontSize: 12, height: 1.3),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700));
}

// ───────────────────────── Layanan (horizontal) ─────────────────────────

class _LayananRow extends ConsumerWidget {
  const _LayananRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = ref.watch(menuListProvider).valueOrNull ?? const <MenuModel>[];
    final layanan =
        visibleTabMenus(all).where((m) => m.path != '/admin').toList();
    if (layanan.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: layanan.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, i) {
          final m = layanan[i];
          return InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () {
              final idx = tabIndexForPath(all, m.path ?? '');
              if (idx != -1) {
                ref.read(bottomNavIndexProvider.notifier).state = idx;
              }
            },
            child: SizedBox(
              width: 76,
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: kBrandColor.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(menuIcon(m.iconName), color: kBrandColor),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    m.label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11.5, height: 1.2),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ───────────────────────── Ringkasan ─────────────────────────

String _labelSesi(String s) {
  switch (s) {
    case 'berjalan':
      return 'Sedang Berlangsung';
    case 'terjadwal':
      return 'Terjadwal';
    case 'selesai':
      return 'Sudah Selesai';
    case 'dibatalkan':
      return 'Dibatalkan';
    default:
      return 'Belum Ada Sesi';
  }
}

Color _warnaSesi(String s) {
  switch (s) {
    case 'berjalan':
      return const Color(0xFF15803D);
    case 'terjadwal':
      return const Color(0xFFB45309);
    case 'dibatalkan':
      return const Color(0xFFB91C1C);
    default:
      return Colors.black54;
  }
}

String _jam(String? v) => (v == null || v.length < 5) ? '-' : v.substring(0, 5);

String _sisaWaktu(int menit) =>
    '${(menit ~/ 60).toString().padLeft(2, '0')}:${(menit % 60).toString().padLeft(2, '0')}';

class _Card extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;
  const _Card({required this.icon, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: kBrandColor.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: kBrandColor),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 13,
                      color: Colors.black54,
                      fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _SesiCard extends StatelessWidget {
  final SesiHariIni sesi;
  const _SesiCard({required this.sesi});

  @override
  Widget build(BuildContext context) {
    final warna = _warnaSesi(sesi.status);
    final adaJam = sesi.jamMulai != null || sesi.jamSelesai != null;

    return _Card(
      icon: Icons.event_available_rounded,
      title: 'Sesi CFD Hari Ini',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: warna.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(_labelSesi(sesi.status),
                style: TextStyle(
                    color: warna, fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          if (sesi.namaSesi != null) ...[
            const SizedBox(height: 10),
            Text(sesi.namaSesi!,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ],
          if (adaJam) ...[
            const SizedBox(height: 4),
            Text('${_jam(sesi.jamMulai)} – ${_jam(sesi.jamSelesai)}',
                style: const TextStyle(color: Colors.black54, fontSize: 13)),
          ],
          if (sesi.status == 'berjalan') ...[
            const SizedBox(height: 6),
            Text('Sisa waktu ${_sisaWaktu(sesi.sisaMenit)}',
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: kBrandColor)),
          ],
        ],
      ),
    );
  }
}

class _LapakCard extends StatelessWidget {
  final LapakHariIni lapak;
  const _LapakCard({required this.lapak});

  @override
  Widget build(BuildContext context) {
    final rasio = lapak.kapasitas == 0
        ? 0.0
        : (lapak.terisi / lapak.kapasitas).clamp(0.0, 1.0);

    return _Card(
      icon: Icons.storefront_rounded,
      title: 'Lapak Terisi',
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${lapak.terisi}',
                  style: const TextStyle(
                      fontSize: 30, fontWeight: FontWeight.w800, height: 1)),
              Text(' / ${lapak.kapasitas}',
                  style: const TextStyle(fontSize: 15, color: Colors.black54)),
              const Spacer(),
              Text('${lapak.persen.toStringAsFixed(0)}%',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: kBrandColor)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: rasio,
              minHeight: 10,
              backgroundColor: kBrandColor.withValues(alpha: 0.10),
              color: kBrandColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _HadirCard extends StatelessWidget {
  final HadirHariIni hadir;
  const _HadirCard({required this.hadir});

  @override
  Widget build(BuildContext context) {
    return _Card(
      icon: Icons.groups_rounded,
      title: 'Kehadiran Pedagang',
      child: Row(
        children: [
          _Stat('Klaim', hadir.klaim, Icons.bookmark_added_rounded,
              const Color(0xFFB45309)),
          _Stat('Check-in', hadir.checkIn, Icons.login_rounded,
              const Color(0xFF15803D)),
          _Stat('Check-out', hadir.checkOut, Icons.logout_rounded,
              const Color(0xFF64748B)),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;
  const _Stat(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 8),
          Text('$value',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(fontSize: 12, color: Colors.black54)),
        ],
      ),
    );
  }
}