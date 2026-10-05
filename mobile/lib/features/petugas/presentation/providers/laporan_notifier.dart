import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/petugas/data/datasources/laporan_datasource.dart';
import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';
import 'laporan_state.dart';

class LaporanNotifier extends StateNotifier<LaporanState> {
  LaporanNotifier() : super(LaporanState.initial());

  // Penanda permintaan terbaru: respons lama yang telat datang diabaikan.
  int _seq = 0;

  String _pesan(Object e) => e.toString().replaceFirst('Exception: ', '');

  /// Dipanggil saat layar Laporan dibuka: muat pilihan event, lalu datanya.
  Future<void> init() async {
    await _muatEvent();
    await load();
  }

  /// Pilihan event mengikuti rentang tanggal. Kalau event yang dipilih tidak
  /// ada di rentang baru, filter kembali ke "Semua event".
  Future<void> _muatEvent() async {
    final s = state;
    try {
      final list = await LaporanDatasource.getEvents(
        startDate: formatTanggalApi(s.startDate),
        endDate: formatTanggalApi(s.endDate),
      );
      final masihAda = state.eventId == null || list.any((e) => e.id == state.eventId);
      state = state.copyWith(
        pilihanEvent: list,
        eventId: masihAda ? state.eventId : null,
      );
    } catch (_) {
      state = state.copyWith(pilihanEvent: const [], eventId: null);
    }
  }

  /// Ambil laporan halaman [state.page] + ringkasan (stats).
  /// [silent] = tanpa spinner dan error diabaikan (dipakai polling "Live").
  Future<void> load({bool silent = false}) async {
    final seq = silent ? _seq : ++_seq;
    final s = state;
    if (!silent) state = s.copyWith(isLoading: true, error: null);

    try {
      final start = formatTanggalApi(s.startDate);
      final end = formatTanggalApi(s.endDate);

      final hasil = await Future.wait<Object>([
        LaporanDatasource.getLaporan(
          startDate: start,
          endDate: end,
          eventId: s.eventId,
          search: s.search,
          page: s.page,
          limit: LaporanState.limit,
        ),
        LaporanDatasource.getStats(
          startDate: start,
          endDate: end,
          eventId: s.eventId,
        ),
      ]);

      if (seq != _seq) return;
      state = state.copyWith(
        isLoading: false,
        error: null,
        laporan: hasil[0] as LaporanResponse,
        stats: hasil[1] as StatsLaporan,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      if (seq != _seq || silent) return;
      state = state.copyWith(isLoading: false, error: _pesan(e));
    }
  }

  Future<void> refresh() async {
    await _muatEvent();
    await load();
  }

  /// Refresh diam-diam tiap 30 detik (polling "Live" kayak web).
  Future<void> refreshSilent() async {
    if (state.isLoading) return;
    await load(silent: true);
  }

  Future<void> _gantiTanggal(DateTime start, DateTime end) async {
    state = state.copyWith(startDate: start, endDate: end, page: 1);
    await _muatEvent();
    await load();
  }

  Future<void> setStartDate(DateTime d) =>
      _gantiTanggal(d, state.endDate.isBefore(d) ? d : state.endDate);

  Future<void> setEndDate(DateTime d) =>
      _gantiTanggal(state.startDate.isAfter(d) ? d : state.startDate, d);

  Future<void> keHariIni() {
    final now = DateTime.now();
    final hariIni = DateTime(now.year, now.month, now.day);
    return _gantiTanggal(hariIni, hariIni);
  }

  Future<void> setEvent(String? id) async {
    state = state.copyWith(eventId: id, page: 1);
    await load();
  }

  Future<void> setSearch(String value) async {
    state = state.copyWith(search: value, page: 1);
    await load();
  }

  Future<void> setPage(int page) async {
    if (page < 1 || page > state.totalPages) return;
    state = state.copyWith(page: page);
    await load();
  }
}