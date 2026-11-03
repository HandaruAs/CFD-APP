import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/superadmin/domain/entities/manajemen_lapak.dart';
import 'package:mobile/features/superadmin/presentation/pages/manajemen_lapak_screen.dart';
import 'package:mobile/features/superadmin/presentation/providers/manajemen_lapak_notifier.dart';
import 'package:mobile/features/superadmin/presentation/providers/manajemen_lapak_provider.dart';
import 'package:mobile/features/superadmin/presentation/providers/manajemen_lapak_state.dart';

class _FakeManajemenLapakNotifier extends ManajemenLapakNotifier {
  @override
  Future<void> load() async {}
}

void main() {
  testWidgets('menampilkan hierarki lokasi beserta kuota dalam daftar', (
    tester,
  ) async {
    final notifier = _FakeManajemenLapakNotifier();
    notifier.state = ManajemenLapakState(
      wilayah: const [
        KecamatanLengkap(
          id: 'kec-1',
          nama: 'Tegalsari',
          jalan: [
            JalanLengkap(
              id: 'jalan-1',
              kodeJalan: 'A1',
              namaJalan: 'Jalan Tunjungan',
              kapasitas: 100,
              kuotaEvent: 0,
              terisi: 0,
              ruas: [
                RuasLengkap(
                  id: 'ruas-1',
                  namaRuas: 'Ruas Utara',
                  urutan: 1,
                  nomorMulai: 1,
                  nomorSelesai: 20,
                  kuota: 20,
                  terisiLama: 3,
                  terisiBaru: 2,
                ),
              ],
            ),
          ],
        ),
      ],
      kecamatanKey: 'kec-1',
      jalanId: 'jalan-1',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [manajemenLapakProvider.overrideWith((ref) => notifier)],
        child: const MaterialApp(home: Scaffold(body: ManajemenLapakScreen())),
      ),
    );
    await tester.pump();

    expect(find.text('Tegalsari'), findsOneWidget);
    expect(find.byKey(const Key('jalan-jalan-1')), findsOneWidget);
    expect(find.text('A1 · Jalan Tunjungan'), findsOneWidget);
    expect(find.text('Ruas Utara'), findsOneWidget);
    expect(find.text('Kuota 20 · Terisi 5 · Sisa 15'), findsOneWidget);
  });
}
