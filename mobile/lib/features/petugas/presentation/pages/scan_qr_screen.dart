import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:mobile/features/petugas/domain/entities/scan_result.dart';
import 'package:mobile/features/petugas/presentation/providers/scan_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/scan_state.dart';

const _brandColor = Color(0xFF1C3F7C);
const _warnaPeringatan = Color(0xFFB45309);

/// TAB "Scan QR Pedagang" -- check-in PER EVENT (sama dengan web
/// /petugas/scan-qr). Alur:
///   1. kamera membaca QR di kartu event pedagang;
///   2. bottom sheet menampilkan pedagang, event, lokasi, nomor stan, dan
///      boleh di-check-in atau tidak (beserta alasannya);
///   3. petugas menekan "Konfirmasi Check-in".
class ScanQrScreen extends ConsumerStatefulWidget {
  const ScanQrScreen({super.key});

  @override
  ConsumerState<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends ConsumerState<ScanQrScreen> {
  final MobileScannerController _controller = MobileScannerController();

  // Sekali 1 QR diproses, kamera tidak memanggil verify() berkali-kali
  // untuk frame yang sama sebelum bottom sheet terbuka.
  bool _sheetOpen = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_sheetOpen) return;
    final qrCode = capture.barcodes.firstOrNull?.rawValue;
    if (qrCode == null || qrCode.isEmpty) return;

    _sheetOpen = true;
    _controller.stop();
    ref.read(scanProvider.notifier).verify(qrCode).then((_) => _showResultSheet());
  }

  Future<void> _showResultSheet() async {
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => const _ScanResultSheet(),
    );
    // Siap scan lagi begitu sheet ditutup, apa pun hasilnya.
    if (!mounted) return;
    ref.read(scanProvider.notifier).resetResult();
    _sheetOpen = false;
    _controller.start();
  }

  Future<void> _lihatRiwayat() async {
    _sheetOpen = true;
    _controller.stop();
    ref.read(scanProvider.notifier).loadRiwayat();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _RiwayatSheet(),
    );
    if (!mounted) return;
    _sheetOpen = false;
    _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(scanProvider);

    return Stack(
      children: [
        MobileScanner(controller: _controller, onDetect: _onDetect),
        Center(
          child: Container(
            width: 240,
            height: 240,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 3),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        Positioned(
          top: 16,
          right: 16,
          child: FilledButton.icon(
            onPressed: _lihatRiwayat,
            style: FilledButton.styleFrom(backgroundColor: Colors.black54),
            icon: const Icon(Icons.history, size: 18),
            label: Text('Riwayat hari ini (${state.riwayat.length})'),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 32,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                state.isVerifying ? 'Memeriksa QR...' : 'Arahkan kamera ke QR di kartu event pedagang',
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ───────────────────────── hasil scan ─────────────────────────

class _ScanResultSheet extends ConsumerWidget {
  const _ScanResultSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(scanProvider);
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: _buildContent(context, ref, state),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, ScanState state) {
    if (state.lastCheckIn != null) {
      return _buildSuccessCard(context, state.lastCheckIn!);
    }
    if (state.errorCode == 'BELUM_CHECKOUT') {
      return _buildPesanCard(
        context,
        ikon: Icons.assignment_late_outlined,
        warna: _warnaPeringatan,
        judul: 'Pedagang Belum Check-out',
        isi: '${state.error ?? ''}\n\nMinta pedagang membuka aplikasi, isi omset di halaman Check-out, '
            'lalu scan ulang QR-nya.',
      );
    }
    if (state.errorCode == 'PILIH_KARTU_EVENT') {
      return _buildPesanCard(
        context,
        ikon: Icons.qr_code_2,
        warna: _warnaPeringatan,
        judul: 'Pakai QR di Kartu Event',
        isi: 'Pedagang ini ikut lebih dari satu event yang sedang buka. Minta pedagang menunjukkan QR '
            'di kartu event yang sesuai (menu Check in / Check Out).',
      );
    }
    if (state.error != null) {
      return _buildPesanCard(
        context,
        ikon: Icons.error_outline,
        warna: Colors.red,
        judul: 'QR Tidak Bisa Diproses',
        isi: state.error!,
      );
    }
    final result = state.result;
    if (result == null) {
      return const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()));
    }
    return _buildPedagangCard(context, ref, state, result);
  }

  Widget _tombol(BuildContext context, String label) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: () => Navigator.pop(context),
        style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white),
        child: Text(label),
      ),
    );
  }

  Widget _buildPesanCard(
    BuildContext context, {
    required IconData ikon,
    required Color warna,
    required String judul,
    required String isi,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(ikon, color: warna, size: 48),
        const SizedBox(height: 12),
        Text(judul, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(isi, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54, height: 1.4)),
        const SizedBox(height: 16),
        _tombol(context, 'Scan Lagi'),
      ],
    );
  }

  Widget _buildSuccessCard(BuildContext context, PesertaScan p) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle, color: Colors.green, size: 56),
        const SizedBox(height: 12),
        Text(
          p.namaUsaha ?? p.namaLengkap ?? '-',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          'Check-in berhasil pukul ${jamLokal(p.checkInAt)}',
          style: const TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 12),
        Text(p.kodeStan, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: _brandColor)),
        Text('${p.namaJalan} · ${p.namaRuas}', style: const TextStyle(color: Colors.black54)),
        const SizedBox(height: 16),
        _tombol(context, 'Scan Berikutnya'),
      ],
    );
  }

  Widget _buildPedagangCard(BuildContext context, WidgetRef ref, ScanState state, PesertaScan p) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: _brandColor,
              child: Text(p.inisial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.namaUsaha ?? '-',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  Text(p.namaLengkap ?? '-', style: const TextStyle(color: Colors.black54)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _infoRow(Icons.category_outlined, '${p.labelDagangan} · pedagang ${p.kategori}'),
        const SizedBox(height: 12),
        // Event & lapak dari QR ini
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.black12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('EVENT', style: TextStyle(fontSize: 11, color: Colors.black54, letterSpacing: 0.5)),
              Text(p.namaEvent, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              Text(
                '${jamTitikScan(p.jamMulai)} – ${jamTitikScan(p.jamSelesai)} WIB',
                style: const TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${p.namaJalan} · ${p.namaRuas}', style: const TextStyle(fontWeight: FontWeight.w500)),
                        if (p.namaKecamatan != null)
                          Text('Kec. ${p.namaKecamatan}', style: const TextStyle(color: Colors.black54, fontSize: 13)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Nomor stan', style: TextStyle(fontSize: 12, color: Colors.black54)),
                      Text(
                        p.kodeStan,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _brandColor),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (p.status == 'check_in')
          _kotakInfo('Pedagang ini sudah check-in pukul ${jamLokal(p.checkInAt)} WIB.', Colors.green)
        else if (!p.bisaCheckIn)
          _kotakInfo(p.alasan ?? 'Pedagang ini belum bisa check-in.', _warnaPeringatan)
        else
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: state.isCheckingIn ? null : () => ref.read(scanProvider.notifier).checkIn(p.pesertaId),
              icon: state.isCheckingIn
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.check),
              label: Text(state.isCheckingIn ? 'Menyimpan...' : 'Konfirmasi Check-in'),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white),
            ),
          ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(p.bisaCheckIn && p.status != 'check_in' ? 'Batal' : 'Scan Lagi'),
          ),
        ),
      ],
    );
  }

  Widget _kotakInfo(String teks, Color warna) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warna.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: warna, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(teks, style: TextStyle(color: warna))),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.black54),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(color: Colors.black54))),
      ],
    );
  }
}

// ───────────────────────── riwayat ─────────────────────────

class _RiwayatSheet extends ConsumerWidget {
  const _RiwayatSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(scanProvider);
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.7,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text(
              'Riwayat Check-in Hari Ini (${state.riwayat.length})',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: state.isLoadingRiwayat && state.riwayat.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : state.riwayat.isEmpty
                    ? const Center(child: Text('Belum ada check-in hari ini.'))
                    : ListView.separated(
                        itemCount: state.riwayat.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) {
                          final r = state.riwayat[i];
                          return ListTile(
                            leading: const Icon(Icons.check_circle, color: Colors.green),
                            title: Text(r.namaUsaha ?? r.namaLengkap ?? '-'),
                            subtitle: Text('${r.namaEvent} · ${r.namaJalan} · ${r.namaRuas} · ${r.kodeStan}'),
                            trailing: Text(jamLokal(r.checkInAt)),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}