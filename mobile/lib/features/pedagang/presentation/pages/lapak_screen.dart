// features/pedagang/presentation/pages/lapak_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_state.dart';
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

const _namaBulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/// "1990-05-12" (atau ISO lengkap) -> "12 Mei 1990". Sama kayak
/// formatTanggalLahir() di web. Balikin string aslinya kalau gagal parse.
String _formatTanggalIndo(String? raw) {
  if (raw == null || raw.isEmpty) return '-';
  final d = DateTime.tryParse(raw);
  if (d == null) return raw;
  return '${d.day} ${_namaBulan[d.month - 1]} ${d.year}';
}

String _formatTanggalApi(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '$y-$m-$day';
}

/// TAB ROOT "Nomor Stand" pedagang -- halaman gabungan "Daftar Usaha" +
/// "Pilih Lokasi Stan", mirror dari web/app/pedagang/nomer-stand:
///   - Belum pernah daftar -> form data usaha (editable), submit sekali
///     langsung bikin pengajuan usaha DAN klaim lapak.
///   - Sudah pernah daftar -> data usaha read-only, tinggal klaim.
///   - Sudah klaim lapak   -> kartu nomor stan + QR, polling check-in.
///
/// Lokasi (jalan/ruas) & nomor stan SELALU diacak backend dari slot yang
/// disiapkan admin -- pedagang gak milih mode/kecamatan lagi.
///
/// build() return body langsung, Scaffold/AppBar dipegang MainLayout.
class LapakScreen extends ConsumerStatefulWidget {
  const LapakScreen({super.key});

  @override
  ConsumerState<LapakScreen> createState() => _LapakScreenState();
}

class _LapakScreenState extends ConsumerState<LapakScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nikController = TextEditingController();
  final _namaLengkapController = TextEditingController();
  final _namaUsahaController = TextEditingController();
  DateTime? _tanggalLahir;
  String? _jenisDagangan;
  String? _jenisLapak;
  String? _formError; // error validasi lokal (bukan dari backend)

  Timer? _pollTimer;

  // Spinner cuma buat muatan PERTAMA. Setelah itu refetch (mis.
  // submitPengajuan yang manggil loadStatusPengajuan lagi) gak boleh
  // ngeganti form jadi spinner di tengah proses submit.
  bool _loadedAwal = false;

  // Lagi di halaman Checkout (hasil push dari sini) -- biar polling gak
  // nge-push Checkout dobel.
  bool _diarahkanKeCheckout = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final notifier = ref.read(pedagangProvider.notifier);
      notifier.clearError();
      await Future.wait([
        notifier.loadStatusPengajuan(),
        notifier.loadLapakStatus(),
      ]);
      if (!mounted) return;
      setState(() => _loadedAwal = true);
      // Cek SEKALI di awal, walau belum klaim: kalau pedagang masih nunggak
      // checkout sesi lama (mis. check-in minggu lalu, gak pernah isi
      // omset) ATAU udah checkout hari ini, langsung ke halaman Checkout.
      final dipindah = await _cekDanPindah();
      if (!dipindah) _maybeStartPolling();
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _nikController.dispose();
    _namaLengkapController.dispose();
    _namaUsahaController.dispose();
    super.dispose();
  }

  /// Tanya backend apakah pedagang ini harus ada di halaman Checkout
  /// (`/api/pedagang/check-in/status` true = udah check-in di sesi hari
  /// ini, ATAU masih punya kehadiran lama yang belum checkout). Kalau iya,
  /// push CheckoutScreen dan balikin true.
  Future<bool> _cekDanPindah() async {
    if (_diarahkanKeCheckout) return true;
    final harusCheckout = await ref.read(pedagangProvider.notifier).checkSudahCheckIn();
    if (!mounted || !harusCheckout) return false;

    _diarahkanKeCheckout = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    // CheckoutScreen BUKAN tab -- halaman beneran di atas shell.
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
    );
    // Balik dari Checkout (mis. habis checkout sesi lama) -- refresh status
    // lapak biar form klaim / hasil klaim yang tampil sesuai kondisi baru.
    _diarahkanKeCheckout = false;
    if (mounted) await ref.read(pedagangProvider.notifier).loadLapakStatus();
    return true;
  }

  // Begitu pedagang punya hasil klaim (baru klaim barusan ATAU udah dari
  // sebelumnya), polling status check-in tiap 5 detik -- persis kayak
  // useEffect([hasil]) di web.
  void _maybeStartPolling() {
    if (_pollTimer != null) return;
    if (ref.read(pedagangProvider).hasilKlaim == null) return;

    _cekDanPindah(); // cek langsung, jangan nunggu 5 detik pertama
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _cekDanPindah());
  }

  Future<void> _pickTanggalLahir() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _tanggalLahir ?? DateTime(now.year - 25, now.month, now.day),
      firstDate: DateTime(1940),
      lastDate: now,
      helpText: 'Pilih Tanggal Lahir',
    );
    if (picked != null) setState(() => _tanggalLahir = picked);
  }

  /// Validasi form pendaftaran -- sama kayak validationError() di web.
  String? _validationError() {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return 'Mohon lengkapi semua data usaha terlebih dahulu.';
    }
    if (_tanggalLahir == null || _jenisDagangan == null || _jenisLapak == null) {
      return 'Mohon lengkapi semua data usaha terlebih dahulu.';
    }
    return null;
  }

  Future<void> _handleSubmit({required bool sudahDaftar}) async {
    final notifier = ref.read(pedagangProvider.notifier);
    notifier.clearError();

    // Sudah pernah daftar -- data usaha gak diubah, langsung klaim.
    if (sudahDaftar) {
      setState(() => _formError = null);
      final ok = await notifier.klaimLapak();
      if (ok) {
        _maybeStartPolling();
      } else {
        // Klaim ditolak karena masih nunggak checkout -> langsung ke Checkout.
        await _cekDanPindah();
      }
      return;
    }

    final err = _validationError();
    setState(() => _formError = err);
    if (err != null) return;

    // Belum pernah daftar -- submit ini sekaligus bikin pengajuan usaha
    // (NIK dkk gak bisa asal diubah lagi), jadi konfirmasi dulu.
    final lanjut = await _showKonfirmasi();
    if (lanjut != true || !mounted) return;

    final ok = await notifier.daftarLaluKlaim(
      nik: _nikController.text.trim(),
      namaLengkap: _namaLengkapController.text.trim(),
      tanggalLahir: _formatTanggalApi(_tanggalLahir!),
      namaUsaha: _namaUsahaController.text.trim(),
      jenisDagangan: _jenisDagangan!,
      jenisLapak: _jenisLapak!,
    );
    if (ok) {
      _maybeStartPolling();
    } else {
      await _cekDanPindah();
    }
  }

  Future<bool?> _showKonfirmasi() {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Periksa Kembali Data Kamu', textAlign: TextAlign.center),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Pastikan semua data di bawah ini sudah benar sebelum dikirim. '
                'Data yang sudah dikirim tidak bisa diubah sembarangan.',
                style: TextStyle(fontSize: 12.5, color: Colors.black54),
              ),
              const SizedBox(height: 12),
              _infoRow('NIK', _nikController.text.trim()),
              _infoRow('Tanggal Lahir', _formatTanggalIndo(_formatTanggalApi(_tanggalLahir!))),
              _infoRow('Nama Lengkap', _namaLengkapController.text.trim()),
              _infoRow('Nama Usaha', _namaUsahaController.text.trim()),
              _infoRow('Kategori Dagangan', _kategoriLabel[_jenisDagangan] ?? '-'),
              _infoRow('Pilihan Lapak', _lapakLabel[_jenisLapak] ?? '-'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Periksa Lagi'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _brandColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('Ya, Kirim'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pedagangProvider);
    final pengajuan = state.pengajuan;
    final sudahDaftar = pengajuan != null;

    if (state.hasilKlaim != null) {
      return _buildHasilKlaim(state, pengajuan);
    }

    if (!_loadedAwal) {
      return const Center(child: CircularProgressIndicator());
    }

    final sesiAktif = state.lapakStatus?.sesiAktif ?? true;
    if (!sesiAktif) return _buildSesiBelumDibuka(state);

    final isBusy = state.isClaiming || state.isSubmittingPengajuan;
    final error = _formError ?? state.error;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            sudahDaftar ? 'Pilih Lokasi Stan' : 'Daftar & Pilih Lokasi Stan',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            sudahDaftar
                ? 'Silakan pilih lokasi stan untuk partisipasi Anda di Car Free Day.'
                : 'Lengkapi data usaha dan pilih lokasi stan Anda untuk berpartisipasi di Car Free Day.',
            style: const TextStyle(color: Colors.black54, fontSize: 13),
          ),
          const SizedBox(height: 16),
          if (pengajuan != null)
            _buildDataTerdaftar(pengajuan)
          else
            _buildFormPendaftaran(enabled: !isBusy),
          const SizedBox(height: 12),
          _card(
            icon: Icons.place_outlined,
            title: 'Lokasi Penempatan',
            children: const [
              Text(
                'Lokasi & nomor stan kamu diambil otomatis dari daftar lokasi yang sudah '
                'disiapkan petugas. Tekan tombol di bawah buat langsung dapat nomor stan.',
                style: TextStyle(fontSize: 12.5, color: Colors.black54, height: 1.4),
              ),
            ],
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            _errorBox(error),
          ],
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: isBusy ? null : () => _handleSubmit(sudahDaftar: sudahDaftar),
            style: ElevatedButton.styleFrom(
              backgroundColor: _brandColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: isBusy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save_outlined, size: 18),
            label: Text(
              isBusy
                  ? 'Menyimpan...'
                  : sudahDaftar
                      ? 'Simpan Pilihan Stan'
                      : 'Daftar & Pilih Lokasi Stan',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSesiBelumDibuka(PedagangState state) {
    return Center(
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
            // Screen ini TAB (IndexedStack) -- gak ada "Kembali", diganti
            // tombol cek ulang status.
            ElevatedButton(
              onPressed: () => ref.read(pedagangProvider.notifier).loadLapakStatus(),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
              child: const Text('Cek Lagi', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDataTerdaftar(PengajuanStatus pengajuan) {
    return _card(
      icon: Icons.storefront_outlined,
      title: 'Data Usaha Terdaftar',
      children: [
        _infoRow('NIK', pengajuan.nik),
        _infoRow('Tanggal Lahir', _formatTanggalIndo(pengajuan.tanggalLahir)),
        _infoRow('Nama Lengkap', pengajuan.namaLengkap ?? '-'),
        _infoRow('Nama Usaha (UMKM)', pengajuan.namaUsaha),
        _infoRow('Kategori', _kategoriLabel[pengajuan.jenisDagangan] ?? pengajuan.jenisDagangan),
        _infoRow(
          'Jenis Lapak',
          pengajuan.jenisLapak != null
              ? (_lapakLabel[pengajuan.jenisLapak!] ?? pengajuan.jenisLapak!)
              : '-',
        ),
      ],
    );
  }

  Widget _buildFormPendaftaran({required bool enabled}) {
    return Form(
      key: _formKey,
      child: _card(
        icon: Icons.storefront_outlined,
        title: 'Data Usaha',
        children: [
          TextFormField(
            controller: _nikController,
            enabled: enabled,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            maxLength: 16,
            decoration: const InputDecoration(
              labelText: 'NIK',
              hintText: 'Masukkan 16 digit NIK',
              border: OutlineInputBorder(),
              counterText: '',
            ),
            validator: (v) {
              final t = v?.trim() ?? '';
              if (t.isEmpty) return 'NIK wajib diisi';
              if (t.length != 16) return 'NIK harus terdiri dari 16 digit';
              return null;
            },
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: enabled ? _pickTanggalLahir : null,
            child: InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Tanggal Lahir',
                border: OutlineInputBorder(),
                suffixIcon: Icon(Icons.calendar_today_outlined),
              ),
              child: Text(
                _tanggalLahir == null
                    ? 'Pilih tanggal'
                    : _formatTanggalIndo(_formatTanggalApi(_tanggalLahir!)),
                style: TextStyle(
                  color: _tanggalLahir == null ? Colors.black45 : Colors.black87,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _namaLengkapController,
            enabled: enabled,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Nama Lengkap',
              hintText: 'Sesuai KTP',
              border: OutlineInputBorder(),
            ),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Nama lengkap wajib diisi' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _namaUsahaController,
            enabled: enabled,
            decoration: const InputDecoration(
              labelText: 'Nama Usaha (UMKM)',
              hintText: 'Contoh: Kedai Kopi Senja',
              border: OutlineInputBorder(),
            ),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Nama usaha wajib diisi' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _jenisDagangan,
            decoration: const InputDecoration(
              labelText: 'Kategori',
              border: OutlineInputBorder(),
            ),
            items: _kategoriLabel.entries
                .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                .toList(),
            onChanged: enabled ? (v) => setState(() => _jenisDagangan = v) : null,
          ),
          const SizedBox(height: 12),
          const Text('Jenis Lapak',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.black87)),
          const SizedBox(height: 8),
          Row(
            children: _lapakLabel.entries.map((e) {
              final selected = _jenisLapak == e.key;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: e.key == 'rombong' ? 8 : 0),
                  child: InkWell(
                    onTap: enabled ? () => setState(() => _jenisLapak = e.key) : null,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: selected ? _brandColor : const Color(0xFFE2E5F1),
                          width: selected ? 2 : 1,
                        ),
                        color: selected ? const Color(0xFFEFF4FF) : Colors.white,
                      ),
                      child: Text(e.value,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: selected ? _brandColor : Colors.black87,
                          )),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
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
          _banner(
            icon: Icons.check_circle,
            iconColor: const Color(0xFF16A34A),
            bg: const Color(0xFFE3F8EE),
            border: const Color(0xFFBFEED7),
            title: 'Alokasi Berhasil',
            titleColor: const Color(0xFF0F7A44),
            body: 'Detail stan telah disimpan ke dalam sistem.',
            bodyColor: const Color(0xFF1A7A52),
          ),
          const SizedBox(height: 12),
          // Label ini SAMA dengan web: maksudnya menunggu petugas scan QR
          // (check-in), bukan verifikasi pendaftaran yang udah dihapus.
          _banner(
            icon: Icons.access_time,
            iconColor: Colors.amber,
            bg: const Color(0xFFFEF9E7),
            border: const Color(0xFFFCE8B2),
            title: 'Menunggu Verifikasi Petugas',
            titleColor: const Color(0xFFB45309),
            body: 'Tunjukkan QR code ini ke petugas untuk melakukan check-in. '
                'Halaman akan otomatis berpindah setelah check-in berhasil.',
            bodyColor: const Color(0xFF92400E),
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
                  // Baris Ruas cuma muncul kalau lapaknya memang punya ruas.
                  if (hasil.namaRuas.isNotEmpty) _infoRow('Ruas', hasil.namaRuas),
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
                  // QR digenerate lokal (qr_flutter), jadi tetap muncul
                  // walau sinyal di lokasi CFD lagi jelek. Isinya ID
                  // pedagang_profiles, sama kayak yang dibaca /api/petugas/scan.
                  if (pedagangId != null && pedagangId.isNotEmpty)
                    QrImageView(
                      data: pedagangId,
                      version: QrVersions.auto,
                      size: 200,
                      backgroundColor: Colors.white,
                    )
                  else
                    const SizedBox(
                      width: 200,
                      height: 200,
                      child: Icon(Icons.qr_code_2, size: 56, color: Colors.black26),
                    ),
                  const SizedBox(height: 12),
                  const Text('Pindai untuk memverifikasi identitas pedagang dan alokasi stan.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Colors.black54)),
                ],
              ),
            ),
          ),
          if (pengajuan != null) ...[
            const SizedBox(height: 12),
            _card(
              icon: Icons.person_outline,
              title: 'Data Pedagang',
              children: [
                _infoRow('NIK', pengajuan.nik),
                _infoRow('Nama Lengkap', pengajuan.namaLengkap ?? '-'),
                _infoRow('Tanggal Lahir', _formatTanggalIndo(pengajuan.tanggalLahir)),
              ],
            ),
            const SizedBox(height: 12),
            _card(
              icon: Icons.storefront_outlined,
              title: 'Data Usaha',
              children: [
                _infoRow('Nama Usaha', pengajuan.namaUsaha),
                _infoRow('Kategori Usaha',
                    _kategoriLabel[pengajuan.jenisDagangan] ?? pengajuan.jenisDagangan),
                _infoRow(
                  'Pilihan Lapak',
                  pengajuan.jenisLapak != null
                      ? (_lapakLabel[pengajuan.jenisLapak!] ?? pengajuan.jenisLapak!)
                      : '-',
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ---------- widget kecil ----------

  Widget _card({required IconData icon, required String title, required List<Widget> children}) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: _brandColor),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _banner({
    required IconData icon,
    required Color iconColor,
    required Color bg,
    required Color border,
    required String title,
    required Color titleColor,
    required String body,
    required Color bodyColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        color: titleColor, fontWeight: FontWeight.w600, fontSize: 13.5)),
                const SizedBox(height: 2),
                Text(body, style: TextStyle(color: bodyColor, fontSize: 12.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _errorBox(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        border: Border.all(color: const Color(0xFFFECACA)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFB91C1C), size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(color: Color(0xFFB91C1C)))),
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
          Expanded(
            child: Text(value.isEmpty ? '-' : value,
                style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}