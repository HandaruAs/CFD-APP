import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_state.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';

const _brandColor = Color(0xFF1C3F7C);

enum _SesiTone { live, upcoming, ended, none }

/// Sama persis kayak turunkanStatusSesi() di web/app/petugas/page.tsx.
({String label, _SesiTone tone}) _turunkanStatusSesi(SesiAktif? sesi) {
  if (sesi == null) return (label: 'Belum Ada Sesi', tone: _SesiTone.none);
  if (sesi.aktif) return (label: 'Sedang Berlangsung', tone: _SesiTone.live);
  if (sesi.status == 'ditutup') return (label: 'Diakhiri Lebih Awal', tone: _SesiTone.ended);
  if (sesi.status == 'selesai') return (label: 'Sudah Selesai', tone: _SesiTone.ended);

  final now = TimeOfDay.now();
  final bagian = sesi.jamMulai.split(':');
  final mulaiMenit = (int.tryParse(bagian[0]) ?? 0) * 60 +
      (bagian.length > 1 ? int.tryParse(bagian[1]) ?? 0 : 0);
  if (now.hour * 60 + now.minute < mulaiMenit) {
    return (label: 'Menunggu Mulai', tone: _SesiTone.upcoming);
  }
  return (label: 'Sudah Berakhir', tone: _SesiTone.ended);
}

String _formatJam(String jam) => jam.length >= 5 ? jam.substring(0, 5) : jam;

String _formatSisaWaktu(int totalMenit) {
  final jam = (totalMenit ~/ 60).toString().padLeft(2, '0');
  final menit = (totalMenit % 60).toString().padLeft(2, '0');
  return '$jam:$menit';
}

String _sapaan() {
  final jam = DateTime.now().hour;
  if (jam < 11) return 'Selamat Pagi';
  if (jam < 15) return 'Selamat Siang';
  if (jam < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

/// TAB "Dashboard" petugas -- mirror web/app/petugas/page.tsx: status
/// sesi, kehadiran, jendela ambil nomor stan, grafik Omset Hari Ini, dan
/// daftar Pedagang Hari Ini. Shortcut menu lama (Jam Operasional, Sisa
/// Lapak, dst) dihapus -- sama kayak web, navigasi cukup lewat menu.
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

    return RefreshIndicator(
      onRefresh: () => ref.read(petugasDashboardProvider.notifier).loadDashboard(),
      child: _buildBody(state),
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
              onPressed: () => ref.read(petugasDashboardProvider.notifier).loadDashboard(),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
              child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      );
    }

    final status = state.statusOperasional;
    final laporan = state.laporan;
    final pedagangHariIni = laporan?.data ?? const <KehadiranItem>[];

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        Text('${_sapaan()}, Petugas! 👋',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(formatHariTanggal(DateTime.now()),
            style: const TextStyle(color: Colors.black54, fontSize: 13)),
        if (state.error != null) ...[
          const SizedBox(height: 12),
          Text('Gagal mengambil data terbaru: ${state.error}',
              style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12.5)),
        ],
        const SizedBox(height: 16),
        _buildSesiCard(status?.sesi),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildKehadiranCard(laporan)),
            const SizedBox(width: 12),
            Expanded(child: _buildAmbilStanCard(status?.pendaftaran)),
          ],
        ),
        const SizedBox(height: 20),
        _buildOmsetSection(laporan, pedagangHariIni),
        const SizedBox(height: 20),
        _buildPedagangHariIni(pedagangHariIni),
      ],
    );
  }

  // ---------- Status sesi ----------

  Widget _buildSesiCard(SesiAktif? sesi) {
    final (:label, :tone) = _turunkanStatusSesi(sesi);
    final live = tone == _SesiTone.live;
    final fg = live ? Colors.white : Colors.black87;
    final fgMuted = live ? Colors.white70 : Colors.black54;

    final elapsed = (sesi != null && sesi.aktif && sesi.totalMenit > 0)
        ? ((sesi.totalMenit - sesi.sisaMenit) / sesi.totalMenit).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: live ? _brandColor : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: live ? null : Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                live ? Icons.radio_button_checked : Icons.access_time,
                size: 16,
                color: live ? Colors.white : _brandColor,
              ),
              const SizedBox(width: 6),
              Text('Status Sesi CFD', style: TextStyle(color: fgMuted, fontSize: 12.5)),
            ],
          ),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(color: fg, fontSize: 20, fontWeight: FontWeight.bold)),
          if (sesi != null)
            Text(
              '${_formatJam(sesi.jamMulai)} – ${_formatJam(sesi.jamSelesaiRencana)} WIB',
              style: TextStyle(color: fgMuted, fontSize: 13),
            ),
          if (live && sesi != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Text('Sisa Waktu', style: TextStyle(color: fgMuted, fontSize: 12)),
                const Spacer(),
                Text(
                  _formatSisaWaktu(sesi.sisaMenit),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: elapsed,
                minHeight: 6,
                backgroundColor: Colors.white24,
                color: Colors.white,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ---------- Kartu kecil ----------

  Widget _buildKehadiranCard(LaporanResponse? laporan) {
    final checkin = laporan?.totalCheckin ?? 0;
    final terdaftar = laporan?.totalTerdaftar ?? 0;
    final persen = (laporan?.persenHadir ?? 0).clamp(0, 100).toDouble();

    return _miniCard(
      icon: Icons.fact_check_outlined,
      children: [
        Text.rich(
          TextSpan(
            text: '$checkin',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            children: [
              TextSpan(
                text: ' / $terdaftar',
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.normal, color: Colors.black54),
              ),
            ],
          ),
        ),
        const Text('Kehadiran Hari Ini', style: TextStyle(color: Colors.black54, fontSize: 12.5)),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: persen / 100,
            minHeight: 5,
            backgroundColor: const Color(0xFFE5E7EB),
            color: _brandColor,
          ),
        ),
        const SizedBox(height: 4),
        Text('${persen.round()}% sudah check-in',
            style: const TextStyle(color: Colors.black54, fontSize: 11.5)),
      ],
    );
  }

  /// Field `pendaftaran` di API sekarang ngatur jendela waktu pedagang
  /// AMBIL NOMOR STAN (bukan pendaftaran akun) -- lihat catatan di web
  /// admin/jam-operasional. Label di sini ngikutin fungsi aslinya.
  Widget _buildAmbilStanCard(PendaftaranStatus? pendaftaran) {
    final buka = pendaftaran?.isOpen ?? false;
    return _miniCard(
      icon: Icons.confirmation_number_outlined,
      children: [
        Text(
          buka ? 'Dibuka' : 'Ditutup',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: buka ? const Color(0xFF16A34A) : Colors.black87,
          ),
        ),
        const Text('Ambil Nomor Stan', style: TextStyle(color: Colors.black54, fontSize: 12.5)),
        if (buka && pendaftaran?.jamBuka != null && pendaftaran?.jamTutup != null) ...[
          const SizedBox(height: 8),
          Text(
            '${_formatJam(pendaftaran!.jamBuka!)} – ${_formatJam(pendaftaran!.jamTutup!)} WIB',
            style: const TextStyle(color: Colors.black54, fontSize: 11.5),
          ),
        ],
      ],
    );
  }

  Widget _miniCard({required IconData icon, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: _brandColor, size: 20),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }

  // ---------- Omset Hari Ini ----------

  Widget _buildOmsetSection(LaporanResponse? laporan, List<KehadiranItem> data) {
    // Sama kayak OmsetChart di web: yang punya omset > 0, urut terbesar, maks 8.
    final ranking = data.where((d) => (d.omset ?? 0) > 0).toList()
      ..sort((a, b) => (b.omset ?? 0).compareTo(a.omset ?? 0));
    final top = ranking.take(8).toList();
    final maks = top.isEmpty ? 1 : (top.first.omset ?? 1);
    final totalOmset = laporan?.totalOmset ?? 0;

    return _section(
      icon: Icons.bar_chart_rounded,
      title: 'Omset Hari Ini',
      subtitle: 'Ranking pedagang berdasarkan omset check-out',
      trailing: totalOmset > 0 ? 'Total ${formatRupiah(totalOmset)}' : null,
      child: top.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'Belum ada data omset (omset diisi pedagang saat check-out).',
                style: TextStyle(color: Colors.black54),
              ),
            )
          : Column(
              children: top.map((item) {
                final omset = item.omset ?? 0;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 96,
                        child: Text(item.namaUsaha,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12.5)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: omset / maks,
                            minHeight: 14,
                            backgroundColor: const Color(0xFFF1F5F9),
                            color: _brandColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 70,
                        child: Text(
                          formatRupiahRingkas(omset),
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  // ---------- Pedagang Hari Ini ----------

  Widget _buildPedagangHariIni(List<KehadiranItem> data) {
    return _section(
      icon: Icons.storefront_outlined,
      title: 'Pedagang Hari Ini',
      trailing: '${data.length} lapak terisi',
      child: data.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('Belum ada pedagang yang check-in hari ini.',
                  style: TextStyle(color: Colors.black54)),
            )
          : Column(children: data.map(_buildPedagangTile).toList()),
    );
  }

  Widget _buildPedagangTile(KehadiranItem item) {
    final (bg, fg) = switch (item.status) {
      'check-out' => (const Color(0xFFE0E7FF), const Color(0xFF3730A3)),
      'check-in' => (const Color(0xFFDCFCE7), const Color(0xFF166534)),
      _ => (const Color(0xFFF1F5F9), const Color(0xFF475569)),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFEEF0F4)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: _brandColor,
            child: Text(
              item.inisial.isNotEmpty ? item.inisial : '??',
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.namaUsaha, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(item.pemilik, style: const TextStyle(color: Colors.black54, fontSize: 12)),
                const SizedBox(height: 4),
                Text(
                  item.lokasiLapak.isEmpty || item.lokasiLapak == '-' ? '-' : item.lokasiLapak,
                  style: const TextStyle(fontSize: 12, color: Colors.black87),
                ),
                const SizedBox(height: 2),
                Text(
                  'Masuk ${item.waktuCheckin} · Keluar ${item.waktuCheckout ?? '-'}'
                  '${item.omset != null ? ' · ${formatRupiah(item.omset!)}' : ''}',
                  style: const TextStyle(fontSize: 11.5, color: Colors.black54),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
            child: Text(
              labelStatusDashboard(item.status),
              style: TextStyle(fontSize: 10.5, color: fg, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _section({
    required IconData icon,
    required String title,
    String? subtitle,
    String? trailing,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: _brandColor, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              if (trailing != null)
                Text(trailing, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          ],
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}