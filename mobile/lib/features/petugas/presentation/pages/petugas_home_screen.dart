import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/providers/nav_provider.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/widgets/menu_icon.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_state.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';

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

/// TAB "Dashboard" petugas -- susunan sama kayak dashboard superadmin:
/// hero (salam + status sesi) -> Layanan (horizontal) -> ringkasan hari ini
/// (kehadiran, ambil nomor stan, omset, daftar pedagang).
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
    final nama = ref.watch(userProvider)?.name ?? 'Petugas';
    final status = state.statusOperasional;
    final laporan = state.laporan;
    final adaData = status != null;

    return RefreshIndicator(
      onRefresh: () => ref.read(petugasDashboardProvider.notifier).loadDashboard(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          _Hero(nama: nama, sesi: status?.sesi, adaData: adaData),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
            child: _SectionTitle('Layanan'),
          ),
          const _LayananRow(),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
            child: _SectionTitle('Ringkasan Hari Ini'),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _buildRingkasan(state, status, laporan),
          ),
        ],
      ),
    );
  }

  Widget _buildRingkasan(
      PetugasDashboardState state, StatusOperasional? status, LaporanResponse? laporan) {
    if (state.isLoading && status == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (state.error != null && status == null) {
      return Column(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 40),
          const SizedBox(height: 8),
          Text(state.error!, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => ref.read(petugasDashboardProvider.notifier).loadDashboard(),
            child: const Text('Coba Lagi'),
          ),
        ],
      );
    }

    final pedagangHariIni = laporan?.data ?? const <KehadiranItem>[];

    return Column(
      children: [
        if (state.error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('Gagal mengambil data terbaru: ${state.error}',
                style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12.5)),
          ),
        _KehadiranCard(laporan: laporan),
        const SizedBox(height: 12),
        _AmbilStanCard(pendaftaran: status?.pendaftaran),
        const SizedBox(height: 12),
        _OmsetCard(laporan: laporan, data: pedagangHariIni),
        const SizedBox(height: 12),
        _PedagangCard(data: pedagangHariIni),
      ],
    );
  }
}

// ───────────────────────── Hero + status sesi ─────────────────────────

class _Hero extends StatelessWidget {
  final String nama;
  final SesiAktif? sesi;
  final bool adaData;
  const _Hero({required this.nama, required this.sesi, required this.adaData});

  @override
  Widget build(BuildContext context) {
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
          Text('${_sapaan()},',
              style: const TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 2),
          Text(nama,
              style: const TextStyle(
                  color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(formatHariTanggal(DateTime.now()),
              style: const TextStyle(color: Colors.white70, fontSize: 13)),
          if (adaData) ...[
            const SizedBox(height: 18),
            _SesiPanel(sesi: sesi),
          ],
        ],
      ),
    );
  }
}

class _SesiPanel extends StatelessWidget {
  final SesiAktif? sesi;
  const _SesiPanel({required this.sesi});

  @override
  Widget build(BuildContext context) {
    final (:label, :tone) = _turunkanStatusSesi(sesi);
    final live = tone == _SesiTone.live;
    final dot = switch (tone) {
      _SesiTone.live => const Color(0xFF4ADE80),
      _SesiTone.upcoming => const Color(0xFFFBBF24),
      _ => Colors.white54,
    };
    final elapsed = (sesi != null && sesi!.aktif && sesi!.totalMenit > 0)
        ? ((sesi!.totalMenit - sesi!.sisaMenit) / sesi!.totalMenit).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.circle, size: 10, color: dot),
              const SizedBox(width: 8),
              const Text('Status Sesi CFD',
                  style: TextStyle(color: Colors.white70, fontSize: 12.5)),
            ],
          ),
          const SizedBox(height: 6),
          Text(label,
              style: const TextStyle(
                  color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          if (sesi != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                '${_formatJam(sesi!.jamMulai)} – ${_formatJam(sesi!.jamSelesaiRencana)} WIB',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ),
          if (live && sesi != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Text('Sisa waktu',
                    style: TextStyle(color: Colors.white70, fontSize: 12)),
                const Spacer(),
                Text(
                  _formatSisaWaktu(sesi!.sisaMenit),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
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
    final all = ref.watch(menuListProvider).valueOrNull ?? const [];
    final layanan = visibleTabMenus(all).where((m) => m.path != '/petugas').toList();
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
              if (idx != -1) ref.read(bottomNavIndexProvider.notifier).state = idx;
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

// ───────────────────────── Kartu ringkasan ─────────────────────────

class _Card extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? trailing;
  final Widget child;
  const _Card({required this.icon, required this.title, this.trailing, required this.child});

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
              Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontSize: 13, color: Colors.black54, fontWeight: FontWeight.w600)),
              ),
              if (trailing != null)
                Text(trailing!,
                    style: const TextStyle(
                        fontSize: 12, color: kBrandColor, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _KehadiranCard extends StatelessWidget {
  final LaporanResponse? laporan;
  const _KehadiranCard({required this.laporan});

  @override
  Widget build(BuildContext context) {
    final checkin = laporan?.totalCheckin ?? 0;
    final checkout = laporan?.totalCheckout ?? 0;
    final terdaftar = laporan?.totalTerdaftar ?? 0;
    final persen = (laporan?.persenHadir ?? 0).clamp(0, 100).toDouble();

    return _Card(
      icon: Icons.fact_check_rounded,
      title: 'Kehadiran Hari Ini',
      trailing: '${persen.round()}%',
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('$checkin',
                  style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, height: 1)),
              Text(' / $terdaftar pedagang',
                  style: const TextStyle(fontSize: 15, color: Colors.black54)),
              const Spacer(),
              Text('$checkout sudah check-out',
                  style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: persen / 100,
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

/// Field `pendaftaran` di API ngatur jendela waktu pedagang AMBIL NOMOR STAN
/// (bukan pendaftaran akun) -- label ngikutin fungsi aslinya.
class _AmbilStanCard extends StatelessWidget {
  final PendaftaranStatus? pendaftaran;
  const _AmbilStanCard({required this.pendaftaran});

  @override
  Widget build(BuildContext context) {
    final buka = pendaftaran?.isOpen ?? false;
    final warna = buka ? const Color(0xFF15803D) : Colors.black54;
    final adaJam = pendaftaran?.jamBuka != null && pendaftaran?.jamTutup != null;

    return _Card(
      icon: Icons.confirmation_number_rounded,
      title: 'Ambil Nomor Stan',
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: warna.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(buka ? 'Dibuka' : 'Ditutup',
                style: TextStyle(color: warna, fontWeight: FontWeight.w800, fontSize: 14)),
          ),
          const Spacer(),
          if (adaJam)
            Text(
              '${_formatJam(pendaftaran!.jamBuka!)} – ${_formatJam(pendaftaran!.jamTutup!)} WIB',
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
        ],
      ),
    );
  }
}

class _OmsetCard extends StatelessWidget {
  final LaporanResponse? laporan;
  final List<KehadiranItem> data;
  const _OmsetCard({required this.laporan, required this.data});

  @override
  Widget build(BuildContext context) {
    // Sama kayak OmsetChart di web: yang punya omset > 0, urut terbesar, maks 8.
    final ranking = data.where((d) => (d.omset ?? 0) > 0).toList()
      ..sort((a, b) => (b.omset ?? 0).compareTo(a.omset ?? 0));
    final top = ranking.take(8).toList();
    final maks = top.isEmpty ? 1 : (top.first.omset ?? 1);
    final total = laporan?.totalOmset ?? 0;

    return _Card(
      icon: Icons.bar_chart_rounded,
      title: 'Omset Hari Ini',
      trailing: total > 0 ? formatRupiah(total) : null,
      child: top.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'Belum ada data omset (omset diisi pedagang saat check-out).',
                style: TextStyle(color: Colors.black54, fontSize: 13),
              ),
            )
          : Column(
              children: [
                for (var i = 0; i < top.length; i++)
                  Padding(
                    padding: EdgeInsets.only(bottom: i == top.length - 1 ? 0 : 12),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 22,
                              height: 22,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: kBrandColor.withValues(alpha: i == 0 ? 0.9 : 0.10),
                                shape: BoxShape.circle,
                              ),
                              child: Text('${i + 1}',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: i == 0 ? Colors.white : kBrandColor)),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(top[i].namaUsaha,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 13.5, fontWeight: FontWeight.w600)),
                            ),
                            Text(formatRupiahRingkas(top[i].omset ?? 0),
                                style: const TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w800)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: (top[i].omset ?? 0) / maks,
                            minHeight: 8,
                            backgroundColor: kBrandColor.withValues(alpha: 0.08),
                            color: kBrandColor,
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

class _PedagangCard extends StatelessWidget {
  final List<KehadiranItem> data;
  const _PedagangCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return _Card(
      icon: Icons.storefront_rounded,
      title: 'Pedagang Hari Ini',
      trailing: '${data.length} lapak terisi',
      child: data.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text('Belum ada pedagang yang check-in hari ini.',
                  style: TextStyle(color: Colors.black54, fontSize: 13)),
            )
          : Column(
              children: [
                for (var i = 0; i < data.length; i++) ...[
                  if (i > 0) const Divider(height: 20, color: Color(0xFFF1F3F7)),
                  _PedagangTile(item: data[i]),
                ],
              ],
            ),
    );
  }
}

class _PedagangTile extends StatelessWidget {
  final KehadiranItem item;
  const _PedagangTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (item.status) {
      'check-out' => (const Color(0xFFE0E7FF), const Color(0xFF3730A3)),
      'check-in' => (const Color(0xFFDCFCE7), const Color(0xFF166534)),
      _ => (const Color(0xFFF1F5F9), const Color(0xFF475569)),
    };
    final lokasi = item.lokasiLapak.isEmpty || item.lokasiLapak == '-' ? '-' : item.lokasiLapak;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: kBrandColor.withValues(alpha: 0.12),
          child: Text(
            item.inisial.isNotEmpty ? item.inisial : '??',
            style: const TextStyle(
                color: kBrandColor, fontSize: 12, fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.namaUsaha,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              Text('${item.pemilik} · $lokasi',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.black54, fontSize: 12.5)),
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
            style: TextStyle(fontSize: 10.5, color: fg, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}