import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/laporan_datasource.dart';
import 'package:mobile/features/petugas/data/laporan_export.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_state.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';

const _brandColor = Color(0xFF1C3F7C);

/// TAB "Laporan" petugas -- mirror web/app/petugas/laporan:
///   - filter tanggal + pencarian,
///   - ringkasan (Total Pedagang, Check-in, Check-out, Lapak Terisi,
///     Rata-rata Omset),
///   - refresh otomatis tiap 30 detik (Live / Paused),
///   - tap baris -> detail kehadiran,
///   - Unduh Laporan (PDF / Excel) -> share sheet HP.
class LaporanScreen extends ConsumerStatefulWidget {
  const LaporanScreen({super.key});

  @override
  ConsumerState<LaporanScreen> createState() => _LaporanScreenState();
}

class _LaporanScreenState extends ConsumerState<LaporanScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  Timer? _pollTimer;
  bool _live = true;
  bool _exporting = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(laporanProvider.notifier).load());
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        ref.read(laporanProvider.notifier).loadMore();
      }
    });
    // Sama kayak web: polling tiap 30 detik tanpa spinner.
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_live && mounted) ref.read(laporanProvider.notifier).refreshSilent();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  String _fmtTanggal(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  Future<void> _pickDateRange() async {
    final state = ref.read(laporanProvider);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      initialDateRange: (state.startDate != null && state.endDate != null)
          ? DateTimeRange(start: state.startDate!, end: state.endDate!)
          : null,
    );
    if (picked == null) return;
    ref.read(laporanProvider.notifier).setDateRange(picked.start, picked.end);
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
              title: const Text('PDF'),
              subtitle: const Text('Siap dicetak / dibagikan'),
              onTap: () => Navigator.pop(ctx, FormatExport.pdf),
            ),
            ListTile(
              leading: const Icon(Icons.table_chart_outlined, color: Color(0xFF15803D)),
              title: const Text('Excel'),
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
    final state = ref.read(laporanProvider);
    final start = state.startDate;
    final end = state.endDate;
    final startStr = start == null ? null : formatTanggalApi(start);
    final endStr = end == null ? null : formatTanggalApi(end);

    final hariIni = formatTanggalApi(DateTime.now());
    final s = startStr ?? hariIni;
    final e = endStr ?? s;
    final periode = s == e ? s : '$s s/d $e';
    final namaFile = 'laporan-kehadiran-$s${s == e ? '' : '_$e'}';

    setState(() => _exporting = true);
    try {
      // Ambil SEMUA baris sesuai filter, bukan cuma yang lagi tampil.
      final semua = await LaporanDatasource.getSemuaUntukExport(
        startDate: startStr,
        endDate: endStr,
        search: state.search,
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

  void _snack(String pesan) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(pesan)));
  }

  // ------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(laporanProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(laporanProvider.notifier).load(),
      child: Column(
        children: [
          _buildFilterBar(state),
          Expanded(child: _buildBody(state)),
        ],
      ),
    );
  }

  Widget _buildFilterBar(LaporanState state) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Cari nama usaha / pemilik...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              isDense: true,
            ),
            onSubmitted: (v) => ref.read(laporanProvider.notifier).setSearch(v.trim()),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickDateRange,
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(
                    (state.startDate != null && state.endDate != null)
                        ? '${_fmtTanggal(state.startDate!)} - ${_fmtTanggal(state.endDate!)}'
                        : 'Pilih tanggal',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _liveChip(),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Unduh Laporan',
                onPressed: _exporting ? null : _pilihFormatExport,
                style: IconButton.styleFrom(backgroundColor: _brandColor),
                icon: _exporting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.download_rounded, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _liveChip() {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () {
        setState(() => _live = !_live);
        if (_live) ref.read(laporanProvider.notifier).refreshSilent();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: _live ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.circle,
                size: 8, color: _live ? const Color(0xFF16A34A) : Colors.black26),
            const SizedBox(width: 6),
            Text(
              _live ? 'Live' : 'Paused',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _live ? const Color(0xFF166534) : Colors.black54,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(LaporanState state) {
    if (state.isLoading && state.laporan == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.laporan == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 60),
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 12),
          Text(state.error!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton(
              onPressed: () => ref.read(laporanProvider.notifier).load(),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
              child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      );
    }

    final laporan = state.laporan!;

    return ListView(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      children: [
        _buildSummary(laporan),
        const SizedBox(height: 12),
        if (laporan.data.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: Text('Belum ada data kehadiran di rentang ini.')),
          )
        else
          ...laporan.data.map(_buildKehadiranTile),
        if (state.isLoadingMore)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          ),
      ],
    );
  }

  Widget _buildSummary(LaporanResponse laporan) {
    // "Lapak Terisi" dihitung dari baris yang punya lokasi & udah hadir,
    // sama kayak web.
    final hadir = laporan.data.where((d) => d.status != 'belum-hadir').toList();
    final lapakTerisi =
        hadir.where((d) => d.lokasiLapak.isNotEmpty && d.lokasiLapak != '-').length;

    final items = [
      _SummaryItem(Icons.groups_outlined, 'Total Pedagang', '${laporan.totalTerdaftar}', null),
      _SummaryItem(Icons.how_to_reg_outlined, 'Check-in', '${laporan.totalCheckin}',
          '${laporan.persenHadir.round()}% hadir'),
      _SummaryItem(Icons.logout, 'Check-out', '${laporan.totalCheckout}', null),
      _SummaryItem(Icons.storefront_outlined, 'Lapak Terisi', '$lapakTerisi',
          'dari ${hadir.length} pedagang check-in'),
      _SummaryItem(Icons.payments_outlined, 'Rata-rata Omset',
          formatRupiahRingkas(laporan.rataOmset), 'Dari ${laporan.totalCheckout} pedagang'),
      _SummaryItem(Icons.account_balance_wallet_outlined, 'Total Omset',
          formatRupiahRingkas(laporan.totalOmset), null),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 1.9,
      children: items.map(_summaryCard).toList(),
    );
  }

  Widget _summaryCard(_SummaryItem item) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(item.icon, size: 16, color: _brandColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(item.label.toUpperCase(),
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 10.5, color: Colors.black54, letterSpacing: 0.3)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(item.value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          if (item.sub != null)
            Text(item.sub!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: Colors.black54)),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'check-out':
        return const Color(0xFF3730A3);
      case 'check-in':
        return const Color(0xFF15803D);
      default:
        return const Color(0xFFB91C1C);
    }
  }

  Widget _buildKehadiranTile(KehadiranItem item) {
    final warna = _statusColor(item.status);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        onTap: () => _showDetail(item),
        leading: CircleAvatar(
          backgroundColor: _brandColor,
          child: Text(item.inisial, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ),
        title: Text(item.namaUsaha, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${item.pemilik} • ${item.lokasiLapak.isEmpty ? '-' : item.lokasiLapak}'),
            Text(
              'Check-in ${item.waktuCheckin} · Check-out ${item.waktuCheckout ?? '-'}'
              '${item.omset != null ? ' · ${formatRupiah(item.omset!)}' : ''}',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
          ],
        ),
        isThreeLine: true,
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: warna.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            labelStatusLaporan(item.status),
            style: TextStyle(fontSize: 10, color: warna, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------ detail

  void _showDetail(KehadiranItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        builder: (ctx, scroll) => FutureBuilder<DetailKehadiran>(
          future: LaporanDatasource.getDetail(item.id),
          builder: (ctx, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Gagal memuat detail: ${snap.error}', textAlign: TextAlign.center),
                ),
              );
            }
            return _buildDetail(snap.data!, scroll);
          },
        ),
      ),
    );
  }

  Widget _buildDetail(DetailKehadiran d, ScrollController scroll) {
    final warna = _statusColor(d.status);
    String atauStrip(String v) => v.trim().isEmpty ? '-' : v;

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Center(
          child: Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Text(atauStrip(d.namaUsaha),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: warna.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(labelStatusLaporan(d.status),
                  style: TextStyle(fontSize: 11, color: warna, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _detailSection(Icons.event_note_outlined, 'Kehadiran', [
          ('Tanggal', formatTanggalString(d.tanggal)),
          ('Sesi', atauStrip(d.namaSesi)),
          ('Check-in', atauStrip(d.waktuCheckin)),
          ('Check-out', d.waktuCheckout ?? '-'),
          ('Omset', d.omset != null ? formatRupiah(d.omset!) : '-'),
          ('Dicatat oleh', atauStrip(d.dicatatOleh)),
        ]),
        _detailSection(Icons.place_outlined, 'Lokasi', [
          ('Kecamatan', atauStrip(d.kecamatan)),
          ('Jalan', atauStrip(d.namaJalan)),
          ('Nomor Lapak', atauStrip(d.nomorLapak)),
          ('Lokasi Lengkap', atauStrip(d.lokasiLapak)),
        ]),
        _detailSection(Icons.storefront_outlined, 'Usaha', [
          ('Nama Usaha', atauStrip(d.namaUsaha)),
          ('Jenis Dagangan', labelKategori(d.jenisDagangan)),
          ('Jenis Lapak', atauStrip(d.jenisLapak)),
        ]),
        _detailSection(Icons.person_outline, 'Data Pribadi', [
          ('Nama Lengkap', atauStrip(d.namaLengkap)),
          ('NIK', atauStrip(d.nik)),
          ('Email', atauStrip(d.email)),
          ('Tanggal Lahir', formatTanggalString(d.tanggalLahir)),
          ('Status Pedagang', d.statusPedagang == 'lama' ? 'Pedagang Lama' : 'Pedagang Baru'),
        ]),
      ],
    );
  }

  Widget _detailSection(IconData icon, String judul, List<(String, String)> baris) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE5E7EB)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: _brandColor),
              const SizedBox(width: 8),
              Text(judul, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 10),
          for (final (label, nilai) in baris)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 120,
                    child: Text(label, style: const TextStyle(color: Colors.black54)),
                  ),
                  Expanded(
                    child: Text(nilai, style: const TextStyle(fontWeight: FontWeight.w500)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _SummaryItem {
  final IconData icon;
  final String label;
  final String value;
  final String? sub;
  const _SummaryItem(this.icon, this.label, this.value, this.sub);
}