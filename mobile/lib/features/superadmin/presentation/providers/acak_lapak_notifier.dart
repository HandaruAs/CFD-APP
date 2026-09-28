import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/superadmin/data/datasources/acak_lapak_datasource.dart';
import 'package:mobile/features/superadmin/domain/entities/acak_lapak.dart';
import 'acak_lapak_state.dart';

class AcakLapakNotifier extends StateNotifier<AcakLapakState> {
  AcakLapakNotifier() : super(const AcakLapakState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // Dua request dimulai barengan, baru ditunggu satu-satu.
      final fSaya = AcakLapakDatasource.getWilayahSaya();
      final fWilayah = AcakLapakDatasource.getWilayah();
      final saya = await fSaya;
      final wilayah = await fWilayah;
      if (!mounted) return;

      // Wilayah penugasan otomatis kepilih & terkunci.
      String? kecId = saya.bebas ? null : saya.kecamatanId;
      final jlnId = (!saya.bebas && saya.kecamatanId == null) ? saya.jalanId : null;
      if (kecId == null && jlnId != null) {
        for (final k in wilayah) {
          if (k.id != null && k.jalan.any((j) => j.id == jlnId)) {
            kecId = k.id;
            break;
          }
        }
      }

      final boleh = saya.scopeBoleh;
      state = state.copyWith(
        isLoading: false,
        saya: saya,
        wilayah: wilayah,
        scope: boleh.isEmpty ? null : boleh.first,
        kecamatanId: kecId,
        jalanId: jlnId,
        ruasId: null,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setScope(AcakScope scope) {
    state = state.copyWith(scope: scope, submitError: null, result: null);
  }

  void setKecamatan(String? id) {
    if (state.kecamatanTerkunci) return;
    state = state.copyWith(
      kecamatanId: id,
      jalanId: null,
      ruasId: null,
      submitError: null,
      result: null,
    );
  }

  void setJalan(String? id) {
    if (state.jalanTerkunci) return;
    state = state.copyWith(jalanId: id, ruasId: null, submitError: null, result: null);
  }

  void setRuas(String? id) {
    state = state.copyWith(ruasId: id, submitError: null, result: null);
  }

  void setGantiPoolLama(bool value) {
    state = state.copyWith(gantiPoolLama: value);
  }

  Future<void> submit() async {
    if (!state.canSubmit) return;
    state = state.copyWith(isSubmitting: true, submitError: null, result: null);
    try {
      final hasil = await AcakLapakDatasource.generateSlot(
        scope: state.scope!,
        kecamatanId: state.kecamatanId,
        jalanId: state.jalanId,
        ruasId: state.ruasId,
        gantiPoolLama: state.gantiPoolLama,
      );
      if (!mounted) return;
      state = state.copyWith(isSubmitting: false, result: hasil);
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(isSubmitting: false, submitError: e.toString());
    }
  }
}