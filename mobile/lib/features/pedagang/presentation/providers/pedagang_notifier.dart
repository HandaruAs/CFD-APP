import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/pedagang/data/datasources/pedagang_remote_datasource.dart';
import 'pedagang_state.dart';

class PedagangNotifier extends StateNotifier<PedagangState> {
  PedagangNotifier() : super(PedagangState.initial());

  Future<void> loadStatusPengajuan() async {
    state = state.copyWith(isLoadingPengajuan: true, error: null);
    try {
      final pengajuan = await PedagangRemoteDatasource.getStatusPengajuan();
      state = state.copyWith(isLoadingPengajuan: false, pengajuan: pengajuan);
    } catch (e) {
      state = state.copyWith(isLoadingPengajuan: false, error: e.toString());
    }
  }

  /// Submit form pengajuan usaha (AjukanUsaha). Balikin `true` kalau
  /// berhasil, biar halaman form tau kapan boleh pindah/nampilin sukses.
  /// Setelah sukses, langsung refetch status biar `state.pengajuan`
  /// ke-update (dan menu sidebar ikut ke-refresh pas fetch /api/menus
  /// berikutnya, karena stage-nya masih "unverified" sampai di-approve).
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
      return true;
    } catch (e) {
      state = state.copyWith(isSubmittingPengajuan: false, error: e.toString());
      return false;
    }
  }

  Future<void> loadCheckoutData() async {
    state = state.copyWith(isLoadingCheckout: true, error: null);
    try {
      final checkout = await PedagangRemoteDatasource.getCheckoutData();
      state = state.copyWith(isLoadingCheckout: false, checkout: checkout);
    } catch (e) {
      state = state.copyWith(isLoadingCheckout: false, error: e.toString());
    }
  }

  Future<bool> submitCheckout(int omset) async {
    state = state.copyWith(isLoadingCheckout: true, error: null);
    try {
      await PedagangRemoteDatasource.submitCheckout(omset);
      await loadCheckoutData();
      return true;
    } catch (e) {
      state = state.copyWith(isLoadingCheckout: false, error: e.toString());
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}