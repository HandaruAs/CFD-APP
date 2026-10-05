import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/laporan_datasource.dart';
import 'package:mobile/features/petugas/data/laporan_export.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_state.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';

// ---------------------------------------------------------------- warna
const _primary = Color(0xFF1C3F7C);
const _ink = Color(0xFF0F172A);
const _muted = Color(0xFF64748B);
const _border = Color(0xFFE2E8F0);
const _surfaceLow = Color(0xFFF1F5F9);

// ------------------------------------------------------- gaya & helper
// Disamakan dengan STATUS_STYLE & KATEGORI_STYLE di web.

class _GayaStatus {
  final String label;
  final Color bg;
  final Color fg;
  final IconData icon;
  const _GayaStatus(this.label, this.bg, this.fg, this.icon);
}

_GayaStatus _gayaStatus(String status) {
  switch (status) {
    case 'check-in':
      return const _GayaStatus(
          'Check-in', Color(0xFFD1FAE5), Color(0xFF065F46), Icons.how_to_reg_rounded);
    case 'check-out':
      return const _GayaStatus(
          'Check-out', Color(0xFFDBEAFE), Color(0xFF1E3A8A), Icons.logout_rounded);
    default:
      return const _GayaStatus(
          'Belum Hadir', Color(0xFFFEE2E2), Color(0xFF991B1B), Icons.cancel_outlined);
  }
}

(Color, Color) _gayaKategori(String? kategori) {
  switch ((kategori ?? '').toLowerCase()) {
    case 'makanan_minuman':
      return (const Color(0xFFFFEDD5), const Color(0xFF9A3412));
    case 'bukan_makanan_minuman':
      return (const Color(0xFFDBEAFE), const Color(0xFF1E3A8A));
    case 'kuliner':
      return (const Color(0xFFFEF3C7), const Color(0xFF92400E));
    case 'kerajinan':
      return (const Color(0xFFEDE9FE), const Color(0xFF5B21B6));
    default:
      return (_surfaceLow, const Color(0xFF475569));
  }
}

Widget _badgeStatus(String status) {
  final g = _gayaStatus(status);
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(color: g.bg, borderRadius: BorderRadius.circular(20)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(g.icon, size: 12, color: g.fg),
        const SizedBox(width: 4),
        Text(g.label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: g.fg)),
      ],
    ),
  );
}

Widget _pill(String teks, Color bg, Color fg) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
    child: Text(teks,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
  );
}

Widget _kartu({required Widget child, EdgeInsets padding = const EdgeInsets.all(14)}) {
  return Container(
    width: double.infinity,
    padding: padding,
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: _border),
      borderRadius: BorderRadius.circular(14),
    ),
    child: child,
  );
}

String _tgl(DateTime d) =>
    '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

String _jam(DateTime d) =>
    '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}:${d.second.toString().padLeft(2, '0')}';

// =============================================================== LAYAR

/// TAB "Laporan" petugas -- mirror web/app/petugas/laporan:
///   header + Refresh + Unduh Laporan, filter (dari, sampai, event,
///   lihat hari ini, Live), 5 kartu ringkasan, pencarian, daftar
///   kehadiran + pagination, dan detail pedagang (tap baris).
class LaporanScreen extends ConsumerStatefulWidget {
  const LaporanScreen({super.key});

  @override
  ConsumerState<LaporanScreen> createState() => _LaporanScreenState();
}

class _LaporanScreenState extends ConsumerState<LaporanScreen> with WidgetsBindingObserver {
  final _searchController = TextEditingController();
  Timer? _pollTimer;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _searchController.text = ref.read(laporanProvider).search;
    Future.microtask(() => ref.read(laporanProvider.notifier).init());
    _startPolling();
  }

  // Refresh otomatis tiap 30 detik tanpa spinner (indikator "Live").
  // Berhenti saat app di background, lanjut lagi saat dibuka.
  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) ref.read(laporanProvider.notifier).refreshSilent();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(laporanProvider.notifier).refreshSilent();
      _startPolling();
    } else {
      _pollTimer?.cancel();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _snack(String pesan) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(pesan)));
  }

  // ------------------------------------------------------------ aksi

  Future<void> _refreshManual() async {
    await ref.read(laporanProvider.notifier).refresh();
    _snack('Data diperbarui');
  }

  Future<void> _pilihTanggal(DateTime awal, {required bool mulai}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: awal,
      firstDate: DateTime(2024),
      lastDate: DateTime(DateTime.now().year + 1, 12, 31),
    );
    if (picked == null || !mounted) return;
    final notifier = ref.read(laporanProvider.notifier);
    if (mulai) {
      await notifier.setStartDate(picked);
    } else {
      await notifier.setEndDate(picked);
    }
  }

  void _cari(String value) {
    FocusScope.of(context).unfocus();
    ref.read(laporanProvider.notifier).setSearch(value.trim());
  }

  void _hapusCari() {
    _searchController.clear();
    setState(() {});
    ref.read(laporanProvider.notifier).setSearch('');
  }

  // ------------------------------------------------------------ export

  Future<void> _pilihFormatExport() async {
    final format = await showModalBottomSheet<FormatExport>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Text('Unduh Laporan',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined, color: Color(0xFFB91C1C)),
              title: const Text('Unduh sebagai PDF'),
              subtitle: const Text('Siap dicetak / dibagikan'),
              onTap: () => Navigator.pop(ctx, FormatExport.pdf),
            ),
            ListTile(
              leading: const Icon(Icons.table_chart_outlined, color: Color(0xFF15803D)),
              title: const Text('Unduh sebagai Excel'),
              subtitle: const Text('Bisa diolah lagi di spreadsheet'),
              onTap: () => Navigator.pop(ctx, FormatExport.excel),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (format != null) await _export(format);
  }

  Future<void> _export(FormatExport format) async {
    if (kIsWeb) {
      _snack('Unduh laporan hanya bisa di aplikasi HP (Android/iOS), belum bisa dari Chrome.');
      return;
    }

    final st = ref.read(laporanProvider);
    final s = formatTanggalApi(st.startDate);
    final e = formatTanggalApi(st.endDate);
    final event = st.pilihanEvent.where((x) => x.id == st.eventId).firstOrNull;
    final periode = (s == e ? s : '$s s/d $e') + (event != null ? ' · ${event.nama}' : '');
    final namaFile = 'laporan-kehadiran-$s${s == e ? '' : '_$e'}';

    setState(() => _exporting = true);
    try {
      // Ambil SEMUA baris sesuai filter, bukan cuma halaman yang tampil.
      final semua = await LaporanDatasource.getSemuaUntukExport(
        startDate: s,
        endDate: e,
        eventId: st.eventId,
        search: st.search,
      );
      if (semua.data.isEmpty) {
        _snack('Tidak ada data kehadiran pada periode ini');
        return;
      }
      await LaporanExport.exportDanBagikan(
        format: format,
        laporan: semua,
        periode: periode,
        namaFile: namaFile,
      );
    } catch (err) {
      _snack('Gagal mengunduh laporan: $err');
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  // ------------------------------------------------------------ build

  @override
  Widget build(BuildContext context) {
    final st = ref.watch(laporanProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(laporanProvider.notifier).refresh(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        children: [
          _buildHeader(st),
          const SizedBox(height: 14),
          _buildFilter(st),
          const SizedBox(height: 14),
          _buildRingkasan(st),
          const SizedBox(height: 14),
          _buildSearch(),
          const SizedBox(height: 14),
          _buildDaftar(st),
        ],
      ),
    );
  }

  // ---------------------------------------------------------- header

  Widget _buildHeader(LaporanState st) {
    final t = st.lastUpdated;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Laporan Kehadiran Pedagang',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: _ink)),
        const SizedBox(height: 4),
        const Text('Daftar pedagang yang sudah check-in, check-out, dan omset CFD.',
            style: TextStyle(fontSize: 13, color: _muted)),
        if (t != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text('Terakhir diperbarui: ${_jam(t)}',
                style: const TextStyle(fontSize: 11.5, color: _muted)),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: st.isLoading ? null : _refreshManual,
                icon: st.isLoading
                    ? const SizedBox(
                        width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Refresh'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF475569),
                  side: const BorderSide(color: _border),
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: _exporting ? null : _pilihFormatExport,
                icon: _exporting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.description_outlined, size: 18),
                label: Text(_exporting ? 'Mengunduh...' : 'Unduh Laporan'),
                style: FilledButton.styleFrom(
                  backgroundColor: _primary,
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ---------------------------------------------------------- filter

  Widget _fieldTanggal(String label, DateTime tanggal, VoidCallback onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: _muted)),
        const SizedBox(height: 4),
        InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFCBD5E1)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_month_rounded, size: 17, color: _muted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(_tgl(tanggal),
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _labelEvent(EventPilihan ev, LaporanState st) {
    final tgl = st.startDate != st.endDate ? ' · ${ev.tanggal}' : '';
    final batal = ev.status == 'dibatalkan' ? ' (dibatalkan)' : '';
    return '${ev.nama}$tgl · ${ev.jamMulai}–${ev.jamSelesai}$batal';
  }

  Widget _buildFilter(LaporanState st) {
    final notifier = ref.read(laporanProvider.notifier);
    return _kartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _fieldTanggal(
                    'Dari', st.startDate, () => _pilihTanggal(st.startDate, mulai: true)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _fieldTanggal(
                    'Sampai', st.endDate, () => _pilihTanggal(st.endDate, mulai: false)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Event', style: TextStyle(fontSize: 12, color: _muted)),
          const SizedBox(height: 4),
          DropdownButtonFormField<String>(
            value: st.eventId ?? '',
            isExpanded: true,
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
              ),
            ),
            items: [
              DropdownMenuItem(
                value: '',
                child: Text('Semua event (${st.pilihanEvent.length})',
                    overflow: TextOverflow.ellipsis),
              ),
              for (final ev in st.pilihanEvent)
                DropdownMenuItem(
                  value: ev.id,
                  child: Text(_labelEvent(ev, st), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) => notifier.setEvent(v == null || v.isEmpty ? null : v),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: st.sedangHariIni
                    ? Container(
                        height: 44,
                        decoration: BoxDecoration(
                          color: _primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.event_available_rounded, size: 17, color: _primary),
                            SizedBox(width: 6),
                            Text('Menampilkan hari ini',
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w700, color: _primary)),
                          ],
                        ),
                      )
                    : FilledButton.icon(
                        onPressed: notifier.keHariIni,
                        icon: const Icon(Icons.event_available_rounded, size: 17),
                        label: const Text('Lihat hari ini'),
                        style: FilledButton.styleFrom(
                          backgroundColor: _primary,
                          minimumSize: const Size.fromHeight(44),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: Color(0xFF16A34A), shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              const Text('Live', style: TextStyle(fontSize: 12, color: _muted)),
            ],
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------- ringkasan

  int _lapakDariData(LaporanState st) {
    final data = st.laporan?.data ?? const <KehadiranItem>[];
    return data
        .where((d) => d.status != 'belum-hadir' && d.lokasiLapak.isNotEmpty && d.lokasiLapak != '-')
        .map((d) => d.lokasiLapak)
        .toSet()
        .length;
  }

  Widget _skeleton(double lebar) {
    return Container(
      width: lebar,
      height: 118,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: _border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: _surfaceLow, borderRadius: BorderRadius.circular(8))),
          const SizedBox(height: 14),
          Container(width: 90, height: 10, color: _surfaceLow),
          const SizedBox(height: 8),
          Container(width: 50, height: 18, color: _surfaceLow),
        ],
      ),
    );
  }

  Widget _statCard({
    required double lebar,
    required IconData icon,
    required Color iconBg,
    required Color iconFg,
    required String label,
    required String value,
    String? suffix,
    String? sub,
    double? progress,
  }) {
    return Container(
      width: lebar,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: _border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 18, color: iconFg),
          ),
          const SizedBox(height: 12),
          Text(label.toUpperCase(),
              style: const TextStyle(
                  fontSize: 10.5, letterSpacing: 0.4, fontWeight: FontWeight.w600, color: _muted)),
          const SizedBox(height: 2),
          Text.rich(
            TextSpan(
              text: value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: _ink),
              children: [
                if (suffix != null)
                  TextSpan(
                    text: suffix,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w500, color: _muted),
                  ),
              ],
            ),
          ),
          if (progress != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  backgroundColor: _border,
                  color: const Color(0xFF16A34A),
                ),
              ),
            ),
          if (sub != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(sub, style: const TextStyle(fontSize: 11.5, color: _muted)),
            ),
        ],
      ),
    );
  }

  Widget _buildRingkasan(LaporanState st) {
    final s = st.stats;
    return LayoutBuilder(
      builder: (context, c) {
        const gap = 10.0;
        final setengah = (c.maxWidth - gap) / 2;

        if (s == null) {
          return Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [for (var i = 0; i < 5; i++) _skeleton(i == 4 ? c.maxWidth : setengah)],
          );
        }

        final lapak = s.lapakTerisi ?? _lapakDariData(st);
        final rasio =
            s.totalCheckin > 0 ? (s.totalCheckout / s.totalCheckin).clamp(0.0, 1.0) : 0.0;

        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            _statCard(
              lebar: setengah,
              icon: Icons.how_to_reg_rounded,
              iconBg: _primary,
              iconFg: Colors.white,
              label: 'Terdaftar di Event',
              value: '${s.totalTerdaftar}',
            ),
            _statCard(
              lebar: setengah,
              icon: Icons.how_to_reg_rounded,
              iconBg: const Color(0xFFD1FAE5),
              iconFg: const Color(0xFF047857),
              label: 'Check-in',
              value: '${s.totalCheckin}',
              sub: '${s.persenHadir.round()}% hadir',
            ),
            _statCard(
              lebar: setengah,
              icon: Icons.logout_rounded,
              iconBg: const Color(0xFFDBEAFE),
              iconFg: _primary,
              label: 'Check-out',
              value: '${s.totalCheckout}',
              suffix: ' / ${s.totalCheckin}',
              progress: rasio,
            ),
            _statCard(
              lebar: setengah,
              icon: Icons.storefront_rounded,
              iconBg: const Color(0xFFFEF3C7),
              iconFg: const Color(0xFFB45309),
              label: 'Lapak Terisi',
              value: '$lapak',
              sub: 'dari ${s.totalCheckin} pedagang check-in',
            ),
            _statCard(
              lebar: c.maxWidth,
              icon: Icons.payments_outlined,
              iconBg: const Color(0xFFCCFBF1),
              iconFg: const Color(0xFF0F766E),
              label: 'Rata-rata Omset',
              value: formatRupiahRingkas(s.rataOmset),
              sub: 'Dari ${s.totalCheckout} pedagang',
            ),
          ],
        );
      },
    );
  }

  // ---------------------------------------------------------- search

  Widget _buildSearch() {
    return _kartu(
      padding: const EdgeInsets.all(10),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onChanged: (_) => setState(() {}),
              onSubmitted: _cari,
              decoration: InputDecoration(
                hintText: 'Cari Nama Usaha atau Pemilik...',
                hintStyle: const TextStyle(fontSize: 13.5),
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: _hapusCari,
                      ),
                filled: true,
                fillColor: _surfaceLow,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 13),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => _cari(_searchController.text),
            style: FilledButton.styleFrom(
              backgroundColor: _primary,
              minimumSize: const Size(64, 46),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Cari'),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------------- daftar

  Widget _pesanTengah({required Widget ikon, required String judul, String? sub, Widget? aksi}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 12),
      child: Column(
        children: [
          ikon,
          const SizedBox(height: 8),
          Text(judul, textAlign: TextAlign.center, style: const TextStyle(color: _muted)),
          if (sub != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(sub,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8))),
            ),
          if (aksi != null) ...[const SizedBox(height: 8), aksi],
        ],
      ),
    );
  }

  Widget _buildDaftar(LaporanState st) {
    final Widget isi;
    final data = st.laporan?.data ?? const <KehadiranItem>[];

    if (st.isLoading) {
      isi = _pesanTengah(
        ikon: const SizedBox(
            width: 30, height: 30, child: CircularProgressIndicator(strokeWidth: 3)),
        judul: 'Memuat data...',
      );
    } else if (st.error != null) {
      isi = _pesanTengah(
        ikon: const Icon(Icons.cancel_outlined, size: 32, color: Color(0xFFDC2626)),
        judul: st.error!,
        aksi: TextButton(
          onPressed: () => ref.read(laporanProvider.notifier).load(),
          child: const Text('Coba lagi'),
        ),
      );
    } else if (data.isEmpty) {
      final t = st.lastUpdated;
      isi = _pesanTengah(
        ikon: const Icon(Icons.search_rounded, size: 32, color: Color(0xFFCBD5E1)),
        judul: 'Tidak ada data',
        sub: t != null
            ? 'Data terakhir diperbarui pukul ${_jam(t)}.'
            : 'Belum ada kehadiran pada periode yang dipilih',
      );
    } else {
      isi = Column(children: [for (final k in data) _buildBaris(k)]);
    }

    return Column(
      children: [
        isi,
        _buildPagination(st),
      ],
    );
  }

  Widget _info(String label, String nilai, {bool kanan = false, Color? warna}) {
    return Column(
      crossAxisAlignment: kanan ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: _muted)),
        const SizedBox(height: 2),
        Text(nilai,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, color: warna ?? _ink)),
      ],
    );
  }

  Widget _buildBaris(KehadiranItem k) {
    final kat = _gayaKategori(k.kategori);
    final adaOmset = (k.omset ?? 0) > 0;
    final idPendek = k.id.length > 8 ? k.id.substring(0, 8) : k.id;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: k.status == 'check-out' ? const Color(0xFFF5F8FF) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: _border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _showDetail(k),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(0xFFDBEAFE),
                      child: Text(k.inisial,
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E3A8A))),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(k.namaUsaha,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                  fontSize: 14.5, fontWeight: FontWeight.w700, color: _ink)),
                          Text(k.pemilik,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12.5, color: _muted)),
                          Text('ID $idPendek',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _badgeStatus(k.status),
                  ],
                ),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: _pill(labelKategori(k.kategori), kat.$1, kat.$2),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.place_outlined, size: 16, color: _muted),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(k.lokasiLapak.isEmpty ? '-' : k.lokasiLapak,
                          style: const TextStyle(fontSize: 12.5, color: Color(0xFF475569))),
                    ),
                  ],
                ),
                Container(
                  height: 1,
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  color: _border,
                ),
                Row(
                  children: [
                    Expanded(child: _info('Waktu In', k.waktuCheckin)),
                    Expanded(child: _info('Waktu Out', k.waktuCheckout ?? '-')),
                    Expanded(
                      child: _info(
                        'Omset',
                        adaOmset ? formatRupiah(k.omset!) : '-',
                        kanan: true,
                        warna: adaOmset ? _primary : _muted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPagination(LaporanState st) {
    final total = st.laporan?.total ?? 0;
    final tampil = st.laporan?.data.length ?? 0;
    final notifier = ref.read(laporanProvider.notifier);
    final bisaMundur = st.page > 1 && !st.isLoading;
    final bisaMaju = st.page < st.totalPages && !st.isLoading;

    return _kartu(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Menampilkan $tampil dari $total data'
              '${st.search.isNotEmpty ? ' (hasil filter: "${st.search}")' : ''}',
              style: const TextStyle(fontSize: 12, color: _muted),
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: bisaMundur ? () => notifier.setPage(st.page - 1) : null,
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          Text('${st.page} / ${st.totalPages}',
              style: const TextStyle(fontSize: 12.5, color: _muted)),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: bisaMaju ? () => notifier.setPage(st.page + 1) : null,
            icon: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------ detail

  void _showDetail(KehadiranItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _DetailSheet(kehadiranId: item.id),
    );
  }
}

// ======================================================== DETAIL PEDAGANG

/// Modal detail satu kehadiran -- mirror DetailPedagangModal di web.
class _DetailSheet extends StatefulWidget {
  final String kehadiranId;
  const _DetailSheet({required this.kehadiranId});

  @override
  State<_DetailSheet> createState() => _DetailSheetState();
}

class _DetailSheetState extends State<_DetailSheet> {
  late final Future<DetailKehadiran> _future;

  static const _jenisLapak = {'rombong': 'Rombong', 'meja': 'Meja'};

  @override
  void initState() {
    super.initState();
    _future = LaporanDatasource.getDetail(widget.kehadiranId);
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (ctx, scroll) => FutureBuilder<DetailKehadiran>(
        future: _future,
        builder: (ctx, snap) {
          final d = snap.data;
          return Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration:
                    BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(2)),
              ),
              _header(ctx, d),
              const Divider(height: 1, color: _border),
              Expanded(child: _isi(snap, scroll)),
            ],
          );
        },
      ),
    );
  }

  Widget _header(BuildContext ctx, DetailKehadiran? d) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 8, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  d == null || d.namaUsaha.isEmpty ? 'Detail Pedagang' : d.namaUsaha,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _ink),
                ),
                if (d != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '${d.namaLengkap} · ${d.statusPedagang == 'baru' ? 'Pedagang Baru' : 'Pedagang Lama'}',
                      style: const TextStyle(fontSize: 13, color: _muted),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.pop(ctx),
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Tutup',
          ),
        ],
      ),
    );
  }

  Widget _isi(AsyncSnapshot<DetailKehadiran> snap, ScrollController scroll) {
    if (snap.connectionState != ConnectionState.done) {
      return const Center(child: CircularProgressIndicator());
    }
    if (snap.hasError) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Gagal memuat detail pedagang: ${snap.error}'.replaceFirst('Exception: ', ''),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF991B1B)),
            ),
          ),
        ),
      );
    }

    final d = snap.data!;
    final lokasiUtama = d.namaJalan.isNotEmpty
        ? '${d.namaJalan}${d.nomorLapak.isNotEmpty ? ' - Lapak No. ${d.nomorLapak}' : ''}'
        : d.lokasiLapak;

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: [
        _section(Icons.assignment_outlined, 'Kehadiran', [
          _row('Tanggal', teks: formatTanggalString(d.tanggal)),
          _row('Event', teks: d.namaSesi),
          _row('Status', child: Align(alignment: Alignment.centerLeft, child: _badgeStatus(d.status))),
          _row('Check-in', teks: d.waktuCheckin),
          _row('Check-out', teks: d.waktuCheckout),
          _row('Omset', teks: (d.omset ?? 0) > 0 ? formatRupiah(d.omset!) : null),
          _row('Dicatat oleh', teks: d.dicatatOleh),
        ]),
        _section(Icons.place_outlined, 'Lokasi Lapak', [
          _row('Lokasi', teks: lokasiUtama),
          _row('Kecamatan', teks: d.kecamatan),
        ]),
        _section(Icons.storefront_outlined, 'Usaha', [
          _row('Nama usaha', teks: d.namaUsaha),
          _row('Jenis dagangan', teks: d.jenisDagangan.isEmpty ? null : labelKategori(d.jenisDagangan)),
          _row('Jenis lapak', teks: _jenisLapak[d.jenisLapak] ?? d.jenisLapak),
        ]),
        _section(Icons.person_outline_rounded, 'Data Pribadi', [
          _row('Nama lengkap', teks: d.namaLengkap),
          _row('NIK', teks: d.nik, mono: true),
          _row('Email', teks: d.email),
          _row('Tanggal lahir', teks: formatTanggalString(d.tanggalLahir)),
        ]),
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Text(
            'NIK dan email disensor untuk menjaga privasi pedagang.',
            style: TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8)),
          ),
        ),
      ],
    );
  }

  Widget _section(IconData icon, String judul, List<Widget> baris) {
    final isi = <Widget>[];
    for (var i = 0; i < baris.length; i++) {
      if (i > 0) isi.add(const Divider(height: 1, color: _border));
      isi.add(baris[i]);
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        border: Border.all(color: _border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: _surfaceLow,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Icon(icon, size: 17, color: _primary),
                const SizedBox(width: 8),
                Text(judul,
                    style: const TextStyle(
                        fontSize: 13.5, fontWeight: FontWeight.w700, color: _ink)),
              ],
            ),
          ),
          ...isi,
        ],
      ),
    );
  }

  Widget _row(String label, {String? teks, Widget? child, bool mono = false}) {
    final kosong = teks == null || teks.trim().isEmpty || teks.trim() == '-';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 115,
            child: Text(label, style: const TextStyle(fontSize: 12.5, color: _muted)),
          ),
          Expanded(
            child: child ??
                Text(
                  kosong ? '-' : teks,
                  style: TextStyle(
                    fontSize: 14,
                    color: kosong ? const Color(0xFF94A3B8) : _ink,
                    fontFamily: mono ? 'monospace' : null,
                    letterSpacing: mono ? 0.6 : null,
                  ),
                ),
          ),
        ],
      ),
    );
  }
}