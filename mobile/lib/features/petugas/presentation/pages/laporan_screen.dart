import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_state.dart';

const _brandColor = Color(0xFF1C3F7C);

class LaporanScreen extends ConsumerStatefulWidget {
  const LaporanScreen({super.key});

  @override
  ConsumerState<LaporanScreen> createState() => _LaporanScreenState();
}

class _LaporanScreenState extends ConsumerState<LaporanScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

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
  }

  @override
  void dispose() {
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
                  ),
                ),
              ),
            ],
          ),
        ],
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
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            _summaryItem('Terdaftar', '${laporan.totalTerdaftar}'),
            _divider(),
            _summaryItem('Check-in', '${laporan.totalCheckin}'),
            _divider(),
            _summaryItem('Check-out', '${laporan.totalCheckout}'),
            _divider(),
            _summaryItem('Hadir', '${laporan.persenHadir.round()}%'),
          ],
        ),
      ),
    );
  }

  Widget _summaryItem(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
        ],
      ),
    );
  }

  Widget _divider() => Container(width: 1, height: 32, color: const Color(0xFFE5E7EB));

  Color _statusColor(String status) {
    switch (status) {
      case 'check-out':
        return Colors.blueGrey;
      case 'check-in':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'check-out':
        return 'Sudah Pulang';
      case 'check-in':
        return 'Sedang Berjualan';
      default:
        return 'Belum Hadir';
    }
  }

  Widget _buildKehadiranTile(KehadiranItem item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _brandColor,
          child: Text(item.inisial, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ),
        title: Text(item.namaUsaha, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${item.pemilik} • ${item.lokasiLapak}'),
            Text(
              item.waktuCheckout == null
                  ? 'Check-in ${item.waktuCheckin}'
                  : 'Check-in ${item.waktuCheckin} - Check-out ${item.waktuCheckout}',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
          ],
        ),
        isThreeLine: true,
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _statusColor(item.status).withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            _statusLabel(item.status),
            style: TextStyle(fontSize: 10, color: _statusColor(item.status), fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}