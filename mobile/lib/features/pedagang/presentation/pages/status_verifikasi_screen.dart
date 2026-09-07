// features/pedagang/presentation/pages/status_verifikasi_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/pedagang/presentation/pages/pendaftaran_screen.dart';

const _brandColor = Color(0xFF1C3F7C);

const Map<String, String> _kategoriLabel = {
  'makanan_minuman': 'Makanan dan Minuman',
  'bukan_makanan_minuman': 'Bukan Makanan dan Minuman',
};

const Map<String, String> _lapakLabel = {
  'rombong': 'Rombong',
  'meja': 'Meja',
};

class _StatusInfo {
  final String label;
  final Color color;
  const _StatusInfo(this.label, this.color);
}

_StatusInfo _statusInfo(String status) {
  switch (status) {
    case 'approved':
      return const _StatusInfo('Diterima', Colors.green);
    case 'rejected':
      return const _StatusInfo('Ditolak', Colors.red);
    default:
      return const _StatusInfo('Menunggu Verifikasi', Colors.orange);
  }
}

class StatusVerifikasiScreen extends ConsumerStatefulWidget {
  const StatusVerifikasiScreen({super.key});

  @override
  ConsumerState<StatusVerifikasiScreen> createState() => _StatusVerifikasiScreenState();
}

class _StatusVerifikasiScreenState extends ConsumerState<StatusVerifikasiScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(pedagangProvider.notifier).loadStatusPengajuan());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pedagangProvider);

    if (state.isLoadingPengajuan) {
      return const MainLayout(
        title: 'Status Verifikasi',
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (state.error != null && state.pengajuan == null) {
      return MainLayout(
        title: 'Status Verifikasi',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 48),
                const SizedBox(height: 12),
                Text(state.error!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.read(pedagangProvider.notifier).loadStatusPengajuan(),
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final pengajuan = state.pengajuan;

    if (pengajuan == null) {
      return MainLayout(
        title: 'Status Verifikasi',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.info_outline, size: 48, color: Colors.black45),
                const SizedBox(height: 12),
                const Text(
                  'Kamu belum mengirim pengajuan usaha.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const PendaftaranScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Ajukan Usaha Sekarang', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final info = _statusInfo(pengajuan.status);

    return MainLayout(
      title: 'Status Verifikasi',
      body: RefreshIndicator(
        onRefresh: () => ref.read(pedagangProvider.notifier).loadStatusPengajuan(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: info.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: info.color),
                ),
                child: Row(
                  children: [
                    Icon(Icons.circle, size: 10, color: info.color),
                    const SizedBox(width: 8),
                    Text(
                      info.label,
                      style: TextStyle(color: info.color, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              if (pengajuan.status == 'rejected' &&
                  pengajuan.catatan != null &&
                  pengajuan.catatan!.trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Text(
                    'Catatan petugas: ${pengajuan.catatan}',
                    style: const TextStyle(color: Color(0xFFB91C1C)),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Data Pedagang',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      _infoRow('NIK', pengajuan.nik),
                      _infoRow('Nama Lengkap', pengajuan.namaLengkap ?? '-'),
                      _infoRow('Tanggal Lahir', pengajuan.tanggalLahir ?? '-'),
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
                      const Text('Data Usaha',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      _infoRow('Nama Usaha', pengajuan.namaUsaha),
                      _infoRow(
                        'Kategori Usaha',
                        _kategoriLabel[pengajuan.jenisDagangan] ?? pengajuan.jenisDagangan,
                      ),
                      _infoRow(
                        'Jenis Lapak',
                        _lapakLabel[pengajuan.jenisLapak] ?? (pengajuan.jenisLapak ?? '-'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(color: Colors.black54)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}