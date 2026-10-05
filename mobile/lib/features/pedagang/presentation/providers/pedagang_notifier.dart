import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/features/pedagang/data/datasources/pedagang_remote_datasource.dart';
import 'package:mobile/features/pedagang/domain/entities/checkout_data.dart';
import 'package:mobile/features/pedagang/domain/entities/event_pedagang.dart';
import 'pedagang_state.dart';

/// Hasil aksi ikut / batal event: [hasil] terisi kalau berhasil; kalau
/// gagal, [pesan] + [kode] (field `code` backend, mis. "BELUM_CHECKOUT").
typedef HasilAksiEvent = ({Keikutsertaan? hasil, String? pesan, String? kode});

class PedagangNotifier extends StateNotifier<PedagangState> {
  PedagangNotifier() : super(PedagangState.initial());

  // ───────────────────────── data usaha ─────────────────────────

  Future<void> loadStatusPengajuan() async {
    state = state.copyWith(isLoadingPengajuan: true, error: null);
    try {
      final pengajuan = await PedagangRemoteDatasource.getStatusPengajuan();
      state = state.copyWith(isLoadingPengajuan: false, pengajuan: pengajuan);
    } catch (e) {
      state = state.copyWith(isLoadingPengajuan: false, error: e.toString());
    }
  }

  /// Simpan data usaha. Setelah berhasil, status dimuat ulang lalu daftar
  /// event diambil (pedagang langsung bisa memilih event).
  Future<bool> submitPengajuan({
    required String nik,
    required String namaLengkap,
    required String tanggalLahir,
    required String namaUsaha,
    required String jenisDagangan,
    required String jenisLapak,
  }) async {
    state = state.copyWith(isSubmittingPengajuan: true, error: null);
    try {
      await PedagangRemoteDatasource.submitPengajuan(
        nik: nik,
        namaLengkap: namaLengkap,
        tanggalLahir: tanggalLahir,
        namaUsaha: namaUsaha,
        jenisDagangan: jenisDagangan,
        jenisLapak: jenisLapak,
      );
      state = state.copyWith(isSubmittingPengajuan: false);
      await loadStatusPengajuan();
      await loadEvents();
      return true;
    } catch (e) {
      state = state.copyWith(isSubmittingPengajuan: false, error: e.toString());
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null, errorEvent: null);
  }

  // ───────────────────────── event ─────────────────────────

  /// Ambil daftar event + event yang diikuti sekaligus.
  /// [diam] = true untuk penyegaran berkala (tanpa spinner / pesan error).
  Future<void> loadEvents({bool diam = false}) async {
    if (!diam) state = state.copyWith(isLoadingEvent: true, errorEvent: null);
    try {
      final hasil = await Future.wait<Object>([
        PedagangRemoteDatasource.getEvents(),
        PedagangRemoteDatasource.getEventSaya(),
      ]);
      final daftar = hasil[0] as DaftarEventPedagang;
      state = state.copyWith(
        isLoadingEvent: false,
        kategori: daftar.kategori,
        events: daftar.events,
        eventSaya: hasil[1] as List<Keikutsertaan>,
      );
    } catch (e) {
      state = state.copyWith(isLoadingEvent: false, errorEvent: diam ? state.errorEvent : e.toString());
    }
  }

  Future<HasilAksiEvent> ikut(String eventId) async {
    try {
      final k = await PedagangRemoteDatasource.ikut(eventId);
      await loadEvents(diam: true);
      return (hasil: k, pesan: null, kode: null);
    } catch (e) {
      await loadEvents(diam: true); // sisa kuota mungkin sudah berubah
      return (hasil: null, pesan: e.toString(), kode: e is ApiException ? e.code : null);
    }
  }

  Future<String?> batal(String eventId) async {
    try {
      await PedagangRemoteDatasource.batal(eventId);
      await loadEvents(diam: true);
      return null;
    } catch (e) {
      return e.toString();
    }
  }

  // ───────────────────────── checkout ─────────────────────────

  Future<void> loadCheckoutData() async {
    state = state.copyWith(isLoadingCheckout: true, error: null);
    try {
      final checkout = await PedagangRemoteDatasource.getCheckoutData();
      state = state.copyWith(isLoadingCheckout: false, checkout: checkout);
    } catch (e) {
      state = state.copyWith(isLoadingCheckout: false, error: e.toString());
    }
  }

  /// Ambil data checkout TANPA mengubah tampilan -- dipakai halaman event
  /// untuk memutuskan perlu pindah ke Cek-out atau tidak. Gagal -> null.
  Future<CheckoutData?> cekCheckout() async {
    try {
      return await PedagangRemoteDatasource.getCheckoutData();
    } catch (_) {
      return null;
    }
  }

  Future<bool> submitCheckout(String eventId, int omset) async {
    state = state.copyWith(isLoadingCheckout: true, error: null);
    try {
      await PedagangRemoteDatasource.submitCheckout(eventId, omset);
      await loadCheckoutData();
      return true;
    } catch (e) {
      state = state.copyWith(isLoadingCheckout: false, error: e.toString());
      return false;
    }
  }
}