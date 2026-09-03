// features/pedagang/presentation/pages/lapak_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_state.dart';
import 'package:mobile/features/pedagang/domain/entities/lapak_data.dart';
import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';
import 'package:mobile/features/pedagang/presentation/pages/checkout_screen.dart';

const _brandColor = Color(0xFF1C3F7C);

const Map<String, String> _kategoriLabel = {
  'makanan_minuman': 'Makanan dan Minuman',
  'bukan_makanan_minuman': 'Bukan Makanan dan Minuman',
};

const Map<String, String> _lapakLabel = {
  'rombong': 'Rombong',
  'meja': 'Meja',
};

String _qrCodeUrl(String pedagangId) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=$pedagangId';
}

class LapakScreen extends ConsumerStatefulWidget {
  const LapakScreen({super.key});

  @override
  ConsumerState<LapakScreen> createState() => _LapakScreenState();
}

class _LapakScreenState extends ConsumerState<LapakScreen> {
  String? _kecamatanId;
  String? _jalanId;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final notifier = ref.read(pedagangProvider.notifier);
      // Data pendaftar (buat nampilin NIK/nama/dll read-only) dan status
      // lapak (sesi aktif + sudah klaim atau belum) dibutuhin bareng
      // begitu halaman ini dibuka.
      await Future.wait([
        notifier.loadStatusPengajuan(),
        notifier.loadLapakStatus(),
      ]);
      await notifier.loadKecamatan();
      _maybeStartPolling();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  // Kalau ternyata pedagang udah punya hasil klaim (baru klaim barusan
  // ATAU emang udah klaim dari sebelumnya, ke-detect lewat
  // loadLapakStatus), mulai polling status check-in -- persis kayak
  // useEffect([hasil]) di web (nomer-stand/page.tsx).
  void _maybeStartPolling() {
    if (_pollTimer != null) return;
    if (ref.read(pedagangProvider).hasilKlaim == null) return;

    Future<void> cekDanPindah() async {
      final sudahCheckIn = await ref.read(pedagangProvider.notifier).checkSudahCheckIn();
      if (!mounted) return;
      if (sudahCheckIn) {
        _pollTimer?.cancel();
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const CheckoutScreen()),
        );
      }
    }

    cekDanPindah(); // cek langsung, jangan nunggu 5 detik pertama
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => cekDanPindah());
  }

  Future<void> _handleKlaim() async {
    final state = ref.read(pedagangProvider);
    if (_jalanId == null) return;

    final namaKecamatan = state.kecamatanList
        .firstWhere((k) => k.id == _kecamatanId, orElse: () => Kecamatan(id: '', nama: '-'))
        .nama;

    final success = await ref.read(pedagangProvider.notifier).klaimLapak(
          jalanId: _jalanId!,
          namaKecamatan: namaKecamatan,
        );

    if (success) {
      _maybeStartPolling();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pedagangProvider);
    final pengajuan = state.pengajuan;
    final sudahDaftar = pengajuan != null;

    final isLoadingAwal = state.isLoadingPengajuan || state.isLoadingLapakStatus;

    if (isLoadingAwal && state.hasilKlaim == null) {
      return const MainLayout(
        title: 'Pilih Lokasi Stan',
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (state.hasilKlaim != null) {
      return MainLayout(
        title: 'Alokasi Stan Dikonfirmasi',
        body: _buildHasilKlaim(state, pengajuan),
      );
    }

    final sesiAktif = state.lapakStatus?.sesiAktif ?? true;
    if (!sesiAktif) {
      return MainLayout(
        title: 'Pilih Lokasi Stan',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 48),
                const SizedBox(height: 12),
                const Text('Sesi Klaim Belum Dibuka',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  state.lapakStatus?.pesanSesi ??
                      'Sesi klaim lapak hari ini belum dibuka oleh petugas.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Kembali', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return MainLayout(
      title: 'Pilih Lokasi Stan',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (state.error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  border: Border.all(color: const Color(0xFFFECACA)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(state.error!, style: const TextStyle(color: Color(0xFFB91C1C))),
              ),
              const SizedBox(height: 16),
            ],
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Lokasi Penempatan',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _kecamatanId,
                      decoration: const InputDecoration(
                        labelText: 'Kecamatan',
                        border: OutlineInputBorder(),
                      ),
                      items: state.kecamatanList
                          .map((k) => DropdownMenuItem(value: k.id, child: Text(k.nama)))
                          .toList(),
                      onChanged: !sudahDaftar || state.isLoadingKecamatan
                          ? null
                          : (v) {
                              setState(() {
                                _kecamatanId = v;
                                _jalanId = null;
                              });
                              if (v != null) {
                                ref.read(pedagangProvider.notifier).loadJalan(v);
                              }
                            },
                    ),
                    if (_kecamatanId != null) ...[
                      const SizedBox(height: 16),
                      const Text('Pilih Jalan', style: TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      if (state.isLoadingJalan)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text('Memuat daftar jalan...',
                              style: TextStyle(color: Colors.black54)),
                        )
                      else if (state.jalanList.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text('Belum ada jalan tersedia di kecamatan ini.',
                              style: TextStyle(color: Colors.black54)),
                        )
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: state.jalanList.map((j) {
                            final selected = _jalanId == j.id;
                            return InkWell(
                              onTap: j.penuh ? null : () => setState(() => _jalanId = j.id),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                width: 160,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: j.penuh
                                        ? const Color(0xFFE2E5F1)
                                        : selected
                                            ? _brandColor
                                            : const Color(0xFFE2E5F1),
                                    width: selected ? 2 : 1,
                                  ),
                                  color: j.penuh
                                      ? const Color(0xFFF6F7FB)
                                      : selected
                                          ? const Color(0xFFEFF4FF)
                                          : Colors.white,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(j.namaJalan,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600, fontSize: 13)),
                                    const SizedBox(height: 2),
                                    Text(
                                      j.penuh ? 'Penuh' : 'Sisa ${j.sisa} dari ${j.kapasitas} slot',
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        color: j.penuh ? Colors.red : Colors.black54,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Data Pendaftar',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    if (!sudahDaftar)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text('Anda belum mendaftar, daftar terlebih dahulu',
                            style: TextStyle(
                                color: Colors.red,
                                fontWeight: FontWeight.w500,
                                fontSize: 12.5)),
                      ),
                    _infoRow('NIK', pengajuan?.nik ?? '-'),
                    _infoRow('Nama Lengkap', pengajuan?.namaLengkap ?? '-'),
                    _infoRow('Tanggal Lahir', pengajuan?.tanggalLahir ?? '-'),
                    _infoRow('Nama Usaha', pengajuan?.namaUsaha ?? '-'),
                    _infoRow(
                      'Kategori',
                      pengajuan != null
                          ? (_kategoriLabel[pengajuan.jenisDagangan] ?? pengajuan.jenisDagangan)
                          : '-',
                    ),
                    _infoRow(
                      'Jenis Lapak',
                      pengajuan?.jenisLapak != null
                          ? (_lapakLabel[pengajuan!.jenisLapak!] ?? pengajuan.jenisLapak!)
                          : '-',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed:
                  state.isClaiming || !sudahDaftar || _jalanId == null ? null : _handleKlaim,
              style: ElevatedButton.styleFrom(
                backgroundColor: _brandColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: state.isClaiming
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Simpan Pilihan Stan'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHasilKlaim(PedagangState state, PengajuanStatus? pengajuan) {
    final hasil = state.hasilKlaim!;
    final pedagangId = pengajuan?.id;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFE3F8EE),
              border: Border.all(color: const Color(0xFFBFEED7)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Alokasi Berhasil. Detail stan telah disimpan ke dalam sistem.',
                      style: TextStyle(
                          color: Color(0xFF0F7A44),
                          fontWeight: FontWeight.w600,
                          fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF9E7),
              border: Border.all(color: const Color(0xFFFCE8B2)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.access_time, color: Colors.amber, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Menunggu Verifikasi Petugas. Tunjukkan QR code ini ke petugas untuk '
                    'check-in. Halaman akan otomatis berpindah setelah check-in berhasil.',
                    style: TextStyle(color: Color(0xFF92400E), fontSize: 12.5),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text('NOMOR STAN',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _brandColor,
                          letterSpacing: 0.5)),
                  const SizedBox(height: 4),
                  Text(hasil.nomorStand,
                      style: const TextStyle(
                          fontSize: 32, fontWeight: FontWeight.bold, color: _brandColor)),
                  const Divider(height: 24),
                  _infoRow('Kecamatan', hasil.kecamatan),
                  _infoRow('Nama Jalan', hasil.namaJalan),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text('Verifikasi Pedagang',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: 180,
                    height: 180,
                    child: pedagangId != null && pedagangId.isNotEmpty
                        ? Image.network(
                            _qrCodeUrl(pedagangId),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                const Icon(Icons.qr_code_2, size: 56, color: Colors.black26),
                          )
                        : const Icon(Icons.qr_code_2, size: 56, color: Colors.black26),
                  ),
                  const SizedBox(height: 12),
                  const Text('Pindai untuk memverifikasi identitas pedagang dan alokasi stan.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Colors.black54)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(color: Colors.black54))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}