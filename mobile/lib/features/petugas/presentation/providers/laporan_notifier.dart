import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/laporan_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'laporan_state.dart';

class LaporanNotifier extends StateNotifier<LaporanState> {
  LaporanNotifier() : super(LaporanState.initial());

  String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await LaporanDatasource.getLaporan(
        startDate: state.startDate == null ? null : _fmt(state.startDate!),
        endDate: state.endDate == null ? null : _fmt(state.endDate!),
        search: state.search,
        page: 1,
      );
      state = state.copyWith(isLoading: false, laporan: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    final current = state.laporan;
    if (current == null || !current.hasNextPage || state.isLoadingMore) return;

    state = state.copyWith(isLoadingMore: true);
    try {
      final next = await LaporanDatasource.getLaporan(
        startDate: state.startDate == null ? null : _fmt(state.startDate!),
        endDate: state.endDate == null ? null : _fmt(state.endDate!),
        search: state.search,
        page: current.page + 1,
      );
      final merged = LaporanResponse(
        totalTerdaftar: next.totalTerdaftar,
        totalCheckin: next.totalCheckin,
        totalCheckout: next.totalCheckout,
        totalOmset: next.totalOmset,
        rataOmset: next.rataOmset,
        persenHadir: next.persenHadir,
        data: [...current.data, ...next.data],
        page: next.page,
        limit: next.limit,
        total: next.total,
      );
      state = state.copyWith(isLoadingMore: false, laporan: merged);
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }

  void setDateRange(DateTime start, DateTime end) {
    state = state.copyWith(startDate: start, endDate: end);
    load();
  }

  void setSearch(String value) {
    state = state.copyWith(search: value);
    load();
  }

  /// Refresh diam-diam buat polling "Live" tiap 30 detik (kayak web):
  /// gak nyalain spinner, dan ngambil ulang SEMUA halaman yang udah
  /// ke-load (bukan cuma halaman 1) biar posisi scroll gak loncat. Gagal
  /// = abaikan, coba lagi di tick berikutnya.
  Future<void> refreshSilent() async {
    final current = state.laporan;
    if (state.isLoading || state.isLoadingMore || current == null) return;

    try {
      final halaman = <LaporanResponse>[];
      for (var p = 1; p <= current.page; p++) {
        halaman.add(await LaporanDatasource.getLaporan(
          startDate: state.startDate == null ? null : _fmt(state.startDate!),
          endDate: state.endDate == null ? null : _fmt(state.endDate!),
          search: state.search,
          page: p,
        ));
      }
      final last = halaman.last;
      state = state.copyWith(
        error: null,
        laporan: LaporanResponse(
          totalTerdaftar: last.totalTerdaftar,
          totalCheckin: last.totalCheckin,
          totalCheckout: last.totalCheckout,
          totalOmset: last.totalOmset,
          rataOmset: last.rataOmset,
          persenHadir: last.persenHadir,
          data: [for (final h in halaman) ...h.data],
          page: last.page,
          limit: last.limit,
          total: last.total,
        ),
      );
    } catch (_) {
      // sengaja diam
    }
  }
}