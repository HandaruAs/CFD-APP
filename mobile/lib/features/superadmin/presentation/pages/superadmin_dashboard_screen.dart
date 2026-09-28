import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';
import 'package:mobile/features/superadmin/domain/entities/admin_dashboard.dart';
import 'package:mobile/features/superadmin/presentation/providers/admin_dashboard_provider.dart';

/// TAB "Dashboard" superadmin -- body doang (Scaffold/AppBar dipegang
/// MainLayout). Versi awal: ringkasan hari ini (sesi, lapak, kehadiran).
/// Grafik tren (per sesi & per minggu) ada di response backend, belum
/// ditampilkan.
class SuperadminDashboardScreen extends ConsumerWidget {
  const SuperadminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminDashboardProvider);
    final nama = ref.watch(userProvider)?.name;

    return RefreshIndicator(
      onRefresh: () => ref.refresh(adminDashboardProvider.future),
      child: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 80),
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text('$err', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            Center(
              child: ElevatedButton(
                onPressed: () => ref.invalidate(adminDashboardProvider),
                child: const Text('Coba Lagi'),
              ),
            ),
          ],
        ),
        data: (d) => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              nama == null ? 'Ringkasan Hari Ini' : 'Halo, $nama 👋',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              d.tanggal.isEmpty
                  ? formatHariTanggal(DateTime.now())
                  : formatHariTanggal(DateTime.tryParse(d.tanggal) ?? DateTime.now()),
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
            const SizedBox(height: 16),
            _SesiCard(sesi: d.sesi),
            const SizedBox(height: 12),
            _LapakCard(lapak: d.lapak),
            const SizedBox(height: 12),
            _HadirCard(hadir: d.hadir),
          ],
        ),
      ),
    );
  }
}

String _labelSesi(String status) {
  switch (status) {
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

Color _warnaSesi(String status) {
  switch (status) {
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

String _sisaWaktu(int menit) {
  final j = (menit ~/ 60).toString().padLeft(2, '0');
  final m = (menit % 60).toString().padLeft(2, '0');
  return '$j:$m';
}

class _CardShell extends StatelessWidget {
  final String title;
  final Widget child;
  const _CardShell({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    fontSize: 13, color: Colors.black54, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            child,
          ],
        ),
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

    return _CardShell(
      title: 'Sesi CFD Hari Ini',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_labelSesi(sesi.status),
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: warna)),
          if (sesi.namaSesi != null) ...[
            const SizedBox(height: 4),
            Text(sesi.namaSesi!, style: const TextStyle(fontSize: 14)),
          ],
          if (adaJam) ...[
            const SizedBox(height: 4),
            Text('${_jam(sesi.jamMulai)} – ${_jam(sesi.jamSelesai)}',
                style: const TextStyle(color: Colors.black54, fontSize: 13)),
          ],
          if (sesi.status == 'berjalan') ...[
            const SizedBox(height: 8),
            Text('Sisa waktu ${_sisaWaktu(sesi.sisaMenit)}',
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600, color: kBrandColor)),
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

    return _CardShell(
      title: 'Lapak Terisi',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${lapak.terisi}',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
              Text(' / ${lapak.kapasitas}',
                  style: const TextStyle(fontSize: 16, color: Colors.black54)),
              const Spacer(),
              Text('${lapak.persen.toStringAsFixed(0)}%',
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w700, color: kBrandColor)),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: rasio,
              minHeight: 8,
              backgroundColor: kBrandColor.withValues(alpha: 0.12),
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
    return _CardShell(
      title: 'Kehadiran Pedagang',
      child: Row(
        children: [
          _Stat(label: 'Klaim', value: hadir.klaim),
          _Stat(label: 'Check-in', value: hadir.checkIn),
          _Stat(label: 'Check-out', value: hadir.checkOut),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final int value;
  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text('$value',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12.5, color: Colors.black54)),
        ],
      ),
    );
  }
}