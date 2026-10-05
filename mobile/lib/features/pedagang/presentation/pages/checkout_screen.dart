import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/pedagang/domain/entities/event_pedagang.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';

const _brandColor = Color(0xFF1C3F7C);

const Map<String, String> _kategoriLabel = {
  'makanan_minuman': 'Makanan dan Minuman',
  'bukan_makanan_minuman': 'Bukan Makanan dan Minuman',
};

const Map<String, String> _lapakLabel = {
  'rombong': 'Rombong',
  'meja': 'Meja',
};

/// Format input jadi "500.000" ala Indonesia sambil ngetik. Digit-only,
/// selebihnya dibuang -- konversi ke int murni dilakukan lagi pas submit.
class _RupiahFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digitsOnly = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (digitsOnly.isEmpty) return const TextEditingValue(text: '');
    final formatted = _formatRibuan(int.parse(digitsOnly));
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

String _formatRibuan(int n) {
  final s = n.toString();
  final buffer = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buffer.write('.');
    buffer.write(s[i]);
  }
  return buffer.toString();
}

/// Cek-out PER EVENT (sama dengan web /pedagang/CekOut). Data dari
/// GET /api/pedagang/events/checkout -- backend memilih event yang WAJIB
/// di-checkout dulu (event sudah selesai), lalu yang sedang berjalan.
///
/// CATATAN ARSITEKTUR: screen ini BUKAN tab bottom nav -- dibuka dari
/// LapakScreen (otomatis kalau wajib checkout, atau lewat banner "Ke
/// halaman Cek-out"). Karena itu punya Scaffold+AppBar sendiri.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _omsetController = TextEditingController();
  bool _submitted = false;
  String? _submitError;
  Timer? _tickTimer;
  DateTime _now = DateTime.now();

  // Spinner sampai data checkout pertama selesai dimuat, supaya data lama
  // (kunjungan sebelumnya) tidak sempat tampil.
  bool _dimuat = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(pedagangProvider.notifier).loadCheckoutData();
      if (mounted) setState(() => _dimuat = true);
    });
  }

  @override
  void dispose() {
    _tickTimer?.cancel();
    _omsetController.dispose();
    super.dispose();
  }

  // Sama kayak web: timer ini CUMA buat nampilin teks hitung mundur.
  // Begitu waktunya lewat, refetch ke backend supaya `sesiSudahSelesai`
  // ke-update dari sumber yang bener (bukan diasumsikan dari jam HP
  // pedagang), lalu interval berhenti sendiri.
  void _ensureTicking(String? jamSelesaiSesi, bool sudahCheckIn, bool sesiSudahSelesai) {
    if (_tickTimer != null) return;
    if (jamSelesaiSesi == null || !sudahCheckIn || sesiSudahSelesai || _submitted) return;

    final target = DateTime.tryParse(jamSelesaiSesi);
    if (target == null) return;

    _tickTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _now = DateTime.now());
      if (!_now.isBefore(target)) {
        timer.cancel();
        _tickTimer = null;
        ref.read(pedagangProvider.notifier).loadCheckoutData();
      }
    });
  }

  // Teks hitung mundur doang -- boleh dikit meleset dari jam server, gak
  // masalah karena cuma dekorasi. Yang nentuin boleh/gaknya submit tetap
  // `sesiSudahSelesai` dari backend (lihat `canCheckout` di build()).
  String _countdownText(String? jamSelesaiSesi, bool sudahCheckIn, bool sesiSudahSelesai) {
    if (sesiSudahSelesai || _submitted) return '';
    if (jamSelesaiSesi == null || !sudahCheckIn) return '';

    final target = DateTime.tryParse(jamSelesaiSesi);
    if (target == null) return '';

    final diff = target.difference(_now);
    if (diff.isNegative) return 'Menunggu konfirmasi dari server...';

    final mins = diff.inMinutes;
    final secs = diff.inSeconds % 60;
    return 'Check-out dapat dilakukan dalam ${mins}m ${secs}d';
  }

  Future<void> _handleSubmit(bool canCheckout) async {
    setState(() => _submitError = null);

    if (!canCheckout) {
      setState(() =>
          _submitError = 'Check-out belum dapat dilakukan. Tunggu hingga event berakhir.');
      return;
    }

    final digits = _omsetController.text.replaceAll('.', '');
    final omset = int.tryParse(digits) ?? 0;
    if (omset <= 0) {
      setState(() => _submitError = 'Isi total omset event ini terlebih dahulu.');
      return;
    }

    final eventId = ref.read(pedagangProvider).checkout?.eventId ?? '';
    final success = await ref.read(pedagangProvider.notifier).submitCheckout(eventId, omset);
    if (!mounted) return;

    if (success) {
      setState(() => _submitted = true);
    } else {
      // Backend tetap jadi penjaga terakhir (mis. race pas sesi baru aja
      // ditutup) -- kalau ditolak, tampilkan alasannya apa adanya.
      final err = ref.read(pedagangProvider).error;
      setState(() => _submitError = err ?? 'Gagal menyimpan cek-out.');
    }
  }

  Widget _scaffold({required String title, required Widget body}) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        backgroundColor: _brandColor,
        foregroundColor: Colors.white,
      ),
      body: body,
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pedagangProvider);

    if (!_dimuat || (state.isLoadingCheckout && state.checkout == null)) {
      return _scaffold(
        title: 'Cek-out Pedagang',
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final data = state.checkout;

    // Tidak ada event yang perlu di-checkout (belum check-in di mana pun).
    if (data == null && state.error == null) {
      return _scaffold(
        title: 'Cek-out Pedagang',
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Kamu belum check-in di event mana pun. Minta petugas memindai QR di kartu event kamu '
              'terlebih dahulu sebelum bisa cek-out.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    if (data == null) {
      return _scaffold(
        title: 'Cek-out Pedagang',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Colors.amber, size: 48),
                const SizedBox(height: 12),
                Text(state.error ?? 'Gagal mengambil data checkout.', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.read(pedagangProvider.notifier).loadCheckoutData(),
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!data.sudahCheckIn) {
      return _scaffold(
        title: 'Cek-out Pedagang',
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 48),
                SizedBox(height: 12),
                Text(
                  'Kamu belum check-in di event ini. Minta petugas memindai QR di kartu event kamu '
                  'terlebih dahulu sebelum bisa cek-out.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (data.sudahCheckOut || _submitted) {
      return _scaffold(
        title: 'Cek-out Pedagang',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 48),
                const SizedBox(height: 12),
                const Text('Cek-out Berhasil',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  'Terima kasih sudah berjualan di '
                  '${data.namaEvent.isNotEmpty ? data.namaEvent : "event ini"}'
                  '${data.namaJalan.isNotEmpty ? " (${data.namaJalan})" : ""}.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.black54),
                ),
                if (data.omset != null) ...[
                  const SizedBox(height: 8),
                  Text('Omset tercatat: Rp ${_formatRibuan(data.omset!)}',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Kembali ke Event Saya', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    _ensureTicking(data.jamSelesaiSesi, data.sudahCheckIn, data.sesiSudahSelesai);
    final canCheckout = data.sesiSudahSelesai && !data.sudahCheckOut;
    final countdown = _countdownText(data.jamSelesaiSesi, data.sudahCheckIn, data.sesiSudahSelesai);

    return _scaffold(
      title: 'Cek-out Pedagang',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(data.namaEvent,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _brandColor)),
            Text(
              '${tanggalEvent(data.tanggal)} · ${jamEvent(data.jamMulai)} – ${jamEvent(data.jamSelesai)} WIB',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 12),
            if (data.wajibCheckout) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Color(0xFFB45309)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Event ini sudah selesai tapi kamu belum cek-out. Isi omset dulu supaya kamu bisa '
                        'ikut dan check-in di event berikutnya.',
                        style: TextStyle(color: Color(0xFF92400E)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Detail Lokasi',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    _infoRow('Kecamatan', data.kecamatan.isEmpty ? '-' : data.kecamatan),
                    _infoRow('Nama Jalan', data.namaJalan.isEmpty ? '-' : data.namaJalan),
                    if (data.namaRuas.isNotEmpty) _infoRow('Ruas', data.namaRuas),
                    _infoRow('Nomor Stan', data.nomorStan.isEmpty ? '-' : data.nomorStan),
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
                    const Text('Data Pedagang',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    _infoRow('NIK', data.nik.isEmpty ? '-' : data.nik),
                    _infoRow('Nama Lengkap', data.namaLengkap.isEmpty ? '-' : data.namaLengkap),
                    _infoRow('Tanggal Lahir', data.tanggalLahir.isEmpty ? '-' : data.tanggalLahir),
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
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    _infoRow('Nama Usaha', data.namaUsaha.isEmpty ? '-' : data.namaUsaha),
                    _infoRow(
                        'Kategori Usaha', _kategoriLabel[data.kategoriUsaha] ?? data.kategoriUsaha),
                    _infoRow('Jenis Lapak', _lapakLabel[data.jenisLapak] ?? data.jenisLapak),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF),
                border: Border.all(color: const Color(0xFFDBE4FF)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Laporan Akhir Event',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  const Text('Total Omset Event Ini (Rp)',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _omsetController,
                    enabled: canCheckout,
                    keyboardType: TextInputType.number,
                    inputFormatters: [_RupiahFormatter()],
                    decoration: const InputDecoration(
                      prefixText: 'Rp ',
                      hintText: 'Contoh: 500.000',
                      border: OutlineInputBorder(),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.access_time,
                          size: 16, color: canCheckout ? const Color(0xFF059669) : Colors.amber),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          canCheckout
                              ? 'Check-out sudah dapat dilakukan!'
                              : (countdown.isEmpty ? 'Menunggu waktu check-out...' : countdown),
                          style: TextStyle(
                            fontSize: 12,
                            color: canCheckout ? const Color(0xFF059669) : const Color(0xFFB45309),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_submitError != null) ...[
                    const SizedBox(height: 6),
                    Text(_submitError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: state.isLoadingCheckout || !canCheckout
                  ? null
                  : () => _handleSubmit(canCheckout),
              style: ElevatedButton.styleFrom(
                backgroundColor: _brandColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: state.isLoadingCheckout
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(canCheckout ? 'Cek-out' : 'Tunggu Waktu'),
            ),
          ],
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
              width: 120,
              child: Text(label, style: const TextStyle(color: Colors.black54, fontSize: 12.5))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
        ],
      ),
    );
  }
}