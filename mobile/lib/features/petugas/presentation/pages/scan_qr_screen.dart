import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/petugas/domain/entities/scan_result.dart';
import 'package:mobile/features/petugas/presentation/providers/scan_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/scan_state.dart';

const _brandColor = Color(0xFF1C3F7C);

class ScanQrScreen extends ConsumerStatefulWidget {
  const ScanQrScreen({super.key});

  @override
  ConsumerState<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends ConsumerState<ScanQrScreen> {
  final MobileScannerController _controller = MobileScannerController();

  // Dipisah dari state.result -- biar sekali 1 barcode udah diproses,
  // kamera gak nembakin verify() berkali-kali buat frame yang sama
  // sebelum bottom sheet-nya kebuka.
  bool _sheetOpen = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_sheetOpen) return;
    final barcode = capture.barcodes.firstOrNull;
    final qrCode = barcode?.rawValue;
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
    // Balik siap scan lagi begitu sheet ditutup, apa pun hasilnya
    // (sukses check-in, batal, atau error).
    if (!mounted) return;
    ref.read(scanProvider.notifier).resetResult();
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
              state.isVerifying ? 'Memverifikasi QR...' : 'Arahkan kamera ke QR pedagang',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ),
      ),
    ],
  );
}
}

class _ScanResultSheet extends ConsumerWidget {
  const _ScanResultSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(scanProvider);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: _buildContent(context, ref, state),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, ScanState state) {
    if (state.lastCheckIn != null) {
      return _buildSuccessCard(context, state.lastCheckIn!);
    }
    if (state.error != null) {
      return _buildErrorCard(context, state.error!);
    }
    final result = state.result;
    if (result == null) {
      return const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()));
    }
    if (!result.valid) {
      return _buildErrorCard(context, result.message);
    }
    return _buildPedagangCard(context, ref, result);
  }

  Widget _buildErrorCard(BuildContext context, String message) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.error_outline, color: Colors.red, size: 48),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
            child: const Text('Scan Lagi', style: TextStyle(color: Colors.white)),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessCard(BuildContext context, CheckInResult checkIn) {
    final jam = TimeOfDay.fromDateTime(checkIn.checkInAt.toLocal());
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.check_circle, color: Colors.green, size: 48),
        const SizedBox(height: 12),
        Text(
          checkIn.namaUsaha,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          'Check-in berhasil pukul ${jam.hour.toString().padLeft(2, '0')}:${jam.minute.toString().padLeft(2, '0')}',
          style: const TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
            child: const Text('Scan Berikutnya', style: TextStyle(color: Colors.white)),
          ),
        ),
      ],
    );
  }

  Widget _buildPedagangCard(BuildContext context, WidgetRef ref, VerifyQRResult result) {
    final pedagang = result.pedagang!;
    final state = ref.watch(scanProvider);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: _brandColor,
              child: Text(
                pedagang.inisial,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    pedagang.namaUsaha,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(pedagang.pemilik, style: const TextStyle(color: Colors.black54)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _infoRow(Icons.category_outlined, pedagang.kategori),
        _infoRow(Icons.place_outlined, pedagang.lokasiLapak),
        const SizedBox(height: 16),
        if (result.sudahCheckIn)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Color(0xFFB45309), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    result.checkInAt == null
                        ? 'Pedagang ini sudah check-in sebelumnya.'
                        : 'Sudah check-in pukul '
                            '${TimeOfDay.fromDateTime(result.checkInAt!.toLocal()).format(context)}.',
                    style: const TextStyle(color: Color(0xFFB45309)),
                  ),
                ),
              ],
            ),
          )
        else
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: state.isCheckingIn
                  ? null
                  : () => ref
                      .read(scanProvider.notifier)
                      .checkIn(pedagangId: pedagang.id),
              icon: state.isCheckingIn
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.check),
              label: Text(state.isCheckingIn ? 'Menyimpan...' : 'Check-in Sekarang'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _brandColor,
                foregroundColor: Colors.white,
              ),
            ),
          ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
        ),
      ],
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.black54),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: const TextStyle(color: Colors.black54))),
        ],
      ),
    );
  }
}