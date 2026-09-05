import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/domain/entities/stats_kehadiran.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_state.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_provider.dart';
import 'package:mobile/features/petugas/presentation/pages/jam_operasional_screen.dart';
import 'package:mobile/features/petugas/presentation/pages/scan_qr_screen.dart';

const _brandColor = Color(0xFF1C3F7C);

class _MenuShortcut {
  final String title;
  final String description;
  final IconData icon;
  final Color color;

  const _MenuShortcut({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
  });
}

// 4 menu utama petugas (di luar Dashboard & Logout yang udah ada di
// drawer). "Jam Operasional" & "Scan QR Pedagang" udah nyambung ke
// halaman asli -- 2 sisanya masih nunggu tahap 50-90% di progress plan,
// jadi tap-nya masih nunjukin snackbar.
const _shortcuts = [
  _MenuShortcut(
    title: 'Jam Operasional',
    description: 'Atur jadwal CFD dan kelola pendaftaran pedagang',
    icon: Icons.access_time,
    color: _brandColor,
  ),
  _MenuShortcut(
    title: 'Scan QR Pedagang',
    description: 'Verifikasi kehadiran pedagang dengan scan QR code',
    icon: Icons.qr_code_scanner,
    color: Color(0xFF0F766E),
  ),
  _MenuShortcut(
    title: 'Laporan Kehadiran',
    description: 'Lihat rekap pedagang yang sudah check-in hari ini',
    icon: Icons.description_outlined,
    color: Color(0xFFB45309),
  ),
  _MenuShortcut(
    title: 'Sisa Lapak',
    description: 'Cek sisa lapak yang masih tersedia per kecamatan & jalan',
    icon: Icons.storefront_outlined,
    color: Color(0xFF7C3AED),
  ),
];

class PetugasHomeScreen extends ConsumerStatefulWidget {
  const PetugasHomeScreen({super.key});

  @override
  ConsumerState<PetugasHomeScreen> createState() => _PetugasHomeScreenState();
}

class _PetugasHomeScreenState extends ConsumerState<PetugasHomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(petugasDashboardProvider.notifier).loadDashboard(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(petugasDashboardProvider);

    return MainLayout(
      title: 'Dashboard Petugas CFD',
      body: RefreshIndicator(
        onRefresh: () => ref.read(petugasDashboardProvider.notifier).loadDashboard(),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(PetugasDashboardState state) {
    if (state.isLoading && state.statusOperasional == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.statusOperasional == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 12),
          Text(state.error!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton(
              onPressed: () =>
                  ref.read(petugasDashboardProvider.notifier).loadDashboard(),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
              child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      );
    }

    final status = state.statusOperasional;
    final stats = state.stats;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Selamat Bertugas! 👋',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        if (status != null) ...[
          _buildSesiCard(status),
          const SizedBox(height: 12),
        ],
        if (stats != null) ...[
          _buildKehadiranCard(stats),
          const SizedBox(height: 12),
        ],
        if (status != null) ...[
          _buildPendaftaranCard(status.pendaftaran),
          const SizedBox(height: 24),
        ],
        const Text(
          'Menu Utama',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ..._shortcuts.map(_buildShortcutCard),
      ],
    );
  }

  String _formatJam(String jam) => jam.length >= 5 ? jam.substring(0, 5) : jam;

  String _sesiLabel(SesiAktif sesi) {
    if (sesi.aktif) return 'Sedang Berlangsung';
    switch (sesi.status) {
      case 'ditutup':
        return 'Diakhiri Lebih Awal';
      case 'selesai':
        return 'Sudah Selesai';
      case 'dibatalkan':
        return 'Dibatalkan';
      default:
        return 'Belum Mulai';
    }
  }

  Widget _buildSesiCard(StatusOperasional status) {
    final sesi = status.sesi;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.access_time, color: _brandColor),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Status Sesi', style: TextStyle(color: Colors.black54)),
                  const SizedBox(height: 4),
                  Text(
                    sesi == null ? 'Belum Ada Sesi Hari Ini' : _sesiLabel(sesi),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  if (sesi != null)
                    Text(
                      '${_formatJam(sesi.jamMulai)} - ${_formatJam(sesi.jamSelesaiRencana)} WIB',
                      style: const TextStyle(color: Colors.black54),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKehadiranCard(StatsKehadiran stats) {
    final persen = stats.persenHadir.clamp(0, 100).round();
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Kehadiran Hari Ini', style: TextStyle(color: Colors.black54)),
            const SizedBox(height: 4),
            Text.rich(
              TextSpan(
                text: '${stats.totalCheckin}',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                children: [
                  TextSpan(
                    text: ' / ${stats.totalTerdaftar} pedagang',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.normal,
                      color: Colors.black54,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: stats.totalTerdaftar == 0 ? 0 : stats.persenHadir / 100,
                minHeight: 6,
                backgroundColor: const Color(0xFFE5E7EB),
                color: _brandColor,
              ),
            ),
            const SizedBox(height: 4),
            Text('$persen% sudah check-in', style: const TextStyle(color: Colors.black54)),
          ],
        ),
      ),
    );
  }

  Widget _buildPendaftaranCard(PendaftaranStatus pendaftaran) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.how_to_reg_outlined, color: _brandColor),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Pendaftaran', style: TextStyle(color: Colors.black54)),
                  const SizedBox(height: 4),
                  Text(
                    pendaftaran.isOpen ? 'Dibuka' : 'Ditutup',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShortcutCard(_MenuShortcut item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          if (item.title == 'Jam Operasional') {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JamOperasionalScreen()),
            );
            return;
          }
          if (item.title == 'Scan QR Pedagang') {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ScanQrScreen()),
            );
            return;
          }
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Halaman ${item.title} belum dibuat.')),
          );
        },
        child: Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: item.color,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(item.icon, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(
                        item.description,
                        style: const TextStyle(color: Colors.black54, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Colors.black38),
              ],
            ),
          ),
        ),
      ),
    );
  }
}