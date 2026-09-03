import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/pedagang/data/datasources/pedagang_remote_datasource.dart';
import 'package:mobile/features/pedagang/domain/entities/lapak_data.dart';
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

  // --- Modul Lapak (klaim nomor stand, step 6) ---

  Future<void> loadKecamatan() async {
    state = state.copyWith(isLoadingKecamatan: true);
    try {
      final list = await PedagangRemoteDatasource.getKecamatanList();
      state = state.copyWith(isLoadingKecamatan: false, kecamatanList: list);
    } catch (e) {
      state = state.copyWith(isLoadingKecamatan: false, error: e.toString());
    }
  }

  /// Kosongin dulu jalanList tiap ganti kecamatan, biar gak ada sisa
  /// pilihan jalan dari kecamatan sebelumnya nyangkut di layar.
  Future<void> loadJalan(String kecamatanId) async {
    state = state.copyWith(isLoadingJalan: true, jalanList: [], error: null);
    try {
      final list = await PedagangRemoteDatasource.getJalanList(kecamatanId);
      state = state.copyWith(isLoadingJalan: false, jalanList: list);
    } catch (e) {
      state = state.copyWith(isLoadingJalan: false, error: e.toString(), jalanList: []);
    }
  }

  /// Dipanggil begitu halaman Lapak dibuka -- ngecek apakah sesi klaim
  /// lagi aktif dan apakah pedagang ini udah pernah klaim sebelumnya.
  /// Kalau udah pernah, langsung isi `hasilKlaim` dari data status ini
  /// biar UI langsung nampilin kartu hasil tanpa nyuruh isi form lagi.
  Future<void> loadLapakStatus() async {
    state = state.copyWith(isLoadingLapakStatus: true);
    try {
      final status = await PedagangRemoteDatasource.getLapakStatus();
      state = state.copyWith(
        isLoadingLapakStatus: false,
        lapakStatus: status,
        hasilKlaim: status.sudahKlaim
            ? HasilKlaim(
                nomorStand: status.nomorLapak ?? '-',
                kecamatan: status.namaKecamatan ?? '-',
                namaJalan: status.namaJalan ?? '-',
              )
            : null,
      );
    } catch (e) {
      state = state.copyWith(isLoadingLapakStatus: false, error: e.toString());
    }
  }

  Future<bool> klaimLapak({required String jalanId, required String namaKecamatan}) async {
    state = state.copyWith(isClaiming: true, error: null);
    try {
      final hasil = await PedagangRemoteDatasource.klaimLapak(
        jalanId: jalanId,
        namaKecamatan: namaKecamatan,
      );
      state = state.copyWith(isClaiming: false, hasilKlaim: hasil);
      return true;
    } catch (e) {
      state = state.copyWith(isClaiming: false, error: e.toString());
      return false;
    }
  }

  /// Dipanggil tiap tick polling di halaman Lapak setelah klaim
  /// berhasil. Return `true` kalau petugas udah scan QR pedagang
  /// (check-in). Sengaja gak nge-throw / nyentuh `state.error` di sini --
  /// kegagalan network pas polling harusnya dicoba lagi diam-diam di
  /// tick berikutnya, bukan nge-flash pesan error ke pedagang yang lagi
  /// nunggu di depan petugas.
  Future<bool> checkSudahCheckIn() async {
    try {
      return await PedagangRemoteDatasource.getCheckInStatus();
    } catch (_) {
      return false;
    }
  }
}