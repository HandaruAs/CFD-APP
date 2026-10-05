// features/pedagang/presentation/pages/lapak_screen.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile/features/pedagang/domain/entities/event_pedagang.dart';
import 'package:mobile/features/pedagang/domain/entities/pengajuan_status.dart';
import 'package:mobile/features/pedagang/presentation/pages/checkout_screen.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_state.dart';

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

/// "1990-05-12" (atau ISO lengkap) -> "12 Mei 1990".
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

/// TAB "Check in / Check Out" pedagang -- sistem MULTI-EVENT, sama dengan
/// web /pedagang/nomer-stand:
///   1. belum punya data usaha -> isi data usaha;
///   2. pilih event -> server mengacak lokasi & nomor stan (CFD-xxxxxx);
///   3. kartu event + QR -> ditunjukkan ke petugas untuk check-in;
///   4. setelah event selesai -> isi omset di halaman Cek-out.
///
/// Kalau pedagang masih punya check-in di event yang SUDAH selesai tapi
/// omsetnya belum diisi, halaman ini langsung membuka Cek-out (wajib
/// checkout dulu sebelum ikut / check-in event lain).
///
/// build() mengembalikan body saja, Scaffold/AppBar dipegang MainLayout.
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
  String? _formError;

  bool _loadedAwal = false;
  bool _diCheckout = false; // sedang di halaman Cek-out (hasil push dari sini)
  String? _sedangDiproses; // id event yang sedang ikut / batal
  String? _checkInBerjalan; // nama event yang sedang check-in (masih berjalan)
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    Future.microtask(_muatAwal);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _nikController.dispose();
    _namaLengkapController.dispose();
    _namaUsahaController.dispose();
    super.dispose();
  }

  Future<void> _muatAwal() async {
    final notifier = ref.read(pedagangProvider.notifier);
    notifier.clearError();
    await notifier.loadStatusPengajuan();
    if (ref.read(pedagangProvider).pengajuan != null) {
      await notifier.loadEvents();
    }
    if (!mounted) return;
    setState(() => _loadedAwal = true);
    await _cekCheckout();
    // Selagi ada event yang menunggu check-in, segarkan diam-diam supaya
    // kartu event berubah jadi "Sudah check-in" setelah petugas scan.
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) => _segarkanDiam());
  }

  Future<void> _segarkanDiam() async {
    if (!mounted || _diCheckout) return;
    final state = ref.read(pedagangProvider);
    if (state.pengajuan == null) return;
    final menunggu = state.eventSaya.any((k) => k.aktif);
    if (!menunggu) return;
    await ref.read(pedagangProvider.notifier).loadEvents(diam: true);
    await _cekCheckout();
  }

  /// Wajib checkout (event sudah selesai) -> langsung buka Cek-out.
  /// Sedang check-in di event yang masih berjalan -> tampilkan banner.
  Future<void> _cekCheckout() async {
    if (_diCheckout) return;
    final d = await ref.read(pedagangProvider.notifier).cekCheckout();
    if (!mounted) return;
    if (d != null && !d.sudahCheckOut && d.wajibCheckout) {
      await _bukaCheckout();
      return;
    }
    setState(() => _checkInBerjalan = (d != null && d.sudahCheckIn && !d.sudahCheckOut) ? d.namaEvent : null);
  }

  Future<void> _bukaCheckout() async {
    if (_diCheckout) return;
    _diCheckout = true;
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutScreen()));
    _diCheckout = false;
    if (!mounted) return;
    await ref.read(pedagangProvider.notifier).loadEvents(diam: true);
    await _cekCheckout();
  }

  Future<void> _muatUlang() async {
    await ref.read(pedagangProvider.notifier).loadEvents();
    await _cekCheckout();
  }

  // ───────────────────────── aksi ─────────────────────────

  Future<void> _ikut(EventTersedia ev) async {
    final lanjut = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Ikut "${ev.nama}"?'),
        content: Text(
          '${tanggalEvent(ev.tanggal)}\n${jamEvent(ev.jamMulai)} – ${jamEvent(ev.jamSelesai)} WIB\n\n'
          'Lokasi dan nomor stan kamu akan diacak otomatis oleh sistem.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Ya, Ikut')),
        ],
      ),
    );
    if (lanjut != true || !mounted) return;

    setState(() => _sedangDiproses = ev.id);
    final r = await ref.read(pedagangProvider.notifier).ikut(ev.id);
    if (!mounted) return;
    setState(() => _sedangDiproses = null);

    if (r.hasil != null) {
      await _tampilkanHasilIkut(r.hasil!);
      return;
    }
    if (r.kode == 'BELUM_CHECKOUT') {
      await _bukaCheckout();
      return;
    }
    _snack(r.pesan ?? 'Gagal ikut event.');
  }

  Future<void> _tampilkanHasilIkut(Keikutsertaan k) {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: Colors.green, size: 48),
        title: const Text('Berhasil Ikut Event', textAlign: TextAlign.center),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(k.namaEvent, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            const Text('Nomor stan kamu', style: TextStyle(color: Colors.black54)),
            Text(k.kodeStan, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: _brandColor)),
            const SizedBox(height: 8),
            Text(
              '${k.namaJalan} · ${k.namaRuas}${k.namaKecamatan != null ? '\nKec. ${k.namaKecamatan}' : ''}',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            const Text(
              'Tunjukkan QR di kartu event ke petugas saat datang.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: Colors.black54),
            ),
          ],
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Lihat Kartu Event')),
        ],
      ),
    );
  }

  Future<void> _batal(Keikutsertaan k) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Batal ikut event?'),
        content: Text(
          'Nomor stan ${k.kodeStan} di ${k.namaJalan} · ${k.namaRuas} akan dilepas dan '
          'bisa diambil pedagang lain.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Tidak')),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Ya, Batalkan'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _sedangDiproses = k.eventId);
    final err = await ref.read(pedagangProvider.notifier).batal(k.eventId);
    if (!mounted) return;
    setState(() => _sedangDiproses = null);
    _snack(err ?? 'Pendaftaran event dibatalkan.');
  }

  void _snack(String pesan) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(pesan)));
  }

  // ───────────────────────── data usaha ─────────────────────────

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

  Future<void> _simpanDataUsaha() async {
    final valid = (_formKey.currentState?.validate() ?? false) &&
        _tanggalLahir != null &&
        _jenisDagangan != null &&
        _jenisLapak != null;
    setState(() => _formError = valid ? null : 'Mohon lengkapi semua data usaha terlebih dahulu.');
    if (!valid) return;

    final lanjut = await _konfirmasiDataUsaha();
    if (lanjut != true || !mounted) return;

    await ref.read(pedagangProvider.notifier).submitPengajuan(
          nik: _nikController.text.trim(),
          namaLengkap: _namaLengkapController.text.trim(),
          tanggalLahir: _formatTanggalApi(_tanggalLahir!),
          namaUsaha: _namaUsahaController.text.trim(),
          jenisDagangan: _jenisDagangan!,
          jenisLapak: _jenisLapak!,
        );
  }

  Future<bool?> _konfirmasiDataUsaha() {
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
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Periksa Lagi')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: _brandColor, foregroundColor: Colors.white),
            child: const Text('Ya, Kirim'),
          ),
        ],
      ),
    );
  }

  // ───────────────────────── build ─────────────────────────

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pedagangProvider);

    if (!_loadedAwal) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.pengajuan == null) {
      return _buildIsiDataUsaha(state);
    }
    return _buildHalamanEvent(state, state.pengajuan!);
  }

  Widget _buildIsiDataUsaha(PedagangState state) {
    final busy = state.isSubmittingPengajuan;
    final error = _formError ?? state.error;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Isi Data Usaha', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text(
            'Lengkapi data usaha kamu sekali saja. Setelah itu kamu bisa memilih event CFD yang ingin diikuti.',
            style: TextStyle(color: Colors.black54, fontSize: 13),
          ),
          const SizedBox(height: 16),
          _buildFormPendaftaran(enabled: !busy),
          if (error != null) ...[
            const SizedBox(height: 12),
            _errorBox(error),
          ],
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: busy ? null : _simpanDataUsaha,
            style: ElevatedButton.styleFrom(
              backgroundColor: _brandColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save_outlined, size: 18),
            label: Text(busy ? 'Menyimpan...' : 'Simpan & Lanjut Pilih Event'),
          ),
        ],
      ),
    );
  }

  Widget _buildHalamanEvent(PedagangState state, PengajuanStatus pengajuan) {
    final aktif = state.eventSaya.where((k) => k.aktif).toList();
    final lainnya = state.eventSaya.where((k) => !k.aktif).toList();
    final belumDiikuti = state.events.where((e) => e.statusSaya == null || e.statusSaya == 'batal').toList();

    return RefreshIndicator(
      onRefresh: _muatUlang,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (_checkInBerjalan != null) ...[
            _banner(
              icon: Icons.storefront,
              iconColor: const Color(0xFF16A34A),
              bg: const Color(0xFFE3F8EE),
              border: const Color(0xFFBFEED7),
              title: 'Sedang berjualan di $_checkInBerjalan',
              titleColor: const Color(0xFF0F7A44),
              body: 'Isi omset di halaman Cek-out setelah event selesai.',
              bodyColor: const Color(0xFF1A7A52),
              aksi: TextButton(onPressed: _bukaCheckout, child: const Text('Ke halaman Cek-out')),
            ),
            const SizedBox(height: 12),
          ],

          // ===== EVENT SAYA =====
          Row(
            children: [
              const Expanded(
                child: Text('Event Saya', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              TextButton.icon(
                onPressed: state.isLoadingEvent ? null : _muatUlang,
                icon: state.isLoadingEvent
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.refresh, size: 18),
                label: const Text('Muat ulang'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (aktif.isEmpty)
            _kotakKosong('Kamu belum ikut event apa pun. Pilih event di bawah.')
          else
            ...aktif.map((k) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _KartuEvent(
                    k: k,
                    diproses: _sedangDiproses == k.eventId,
                    onBatal: () => _batal(k),
                  ),
                )),
          if (lainnya.isNotEmpty) ...[
            const SizedBox(height: 4),
            ...lainnya.map(_barisRiwayat),
          ],
          const SizedBox(height: 20),

          // ===== PILIH EVENT =====
          const Text('Pilih Event', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (state.errorEvent != null)
            _errorBox(state.errorEvent!)
          else if (state.isLoadingEvent && state.events.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (belumDiikuti.isEmpty)
            _kotakKosong('Belum ada event yang dibuka. Cek lagi nanti.')
          else
            ...belumDiikuti.map((ev) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _kartuPilihEvent(ev),
                )),
          const SizedBox(height: 12),
          _buildDataTerdaftar(pengajuan),
        ],
      ),
    );
  }

  Widget _kartuPilihEvent(EventTersedia ev) {
    final diproses = _sedangDiproses == ev.id;
    String? alasan;
    if (!ev.bisaIkut) {
      if (ev.statusPendaftaran == 'belum_dibuka') {
        alasan = 'Pendaftaran belum dibuka';
      } else if (ev.statusPendaftaran == 'ditutup') {
        alasan = 'Pendaftaran sudah ditutup';
      } else if (ev.sisaUntukSaya <= 0) {
        alasan = 'Tempat sudah penuh';
      }
    }
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(ev.nama, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
              '${tanggalEvent(ev.tanggal)}\n${jamEvent(ev.jamMulai)} – ${jamEvent(ev.jamSelesai)} WIB',
              style: const TextStyle(color: Colors.black54),
            ),
            if (ev.lokasi.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.place_outlined, size: 18, color: _brandColor),
                  const SizedBox(width: 6),
                  Expanded(child: Text(ev.lokasi.map((l) => l.teks).join('\n'))),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Text(
              ev.sisaUntukSaya > 0 ? 'Sisa ${ev.sisaUntukSaya} tempat untukmu' : 'Tempat penuh',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: ev.sisaUntukSaya > 0 ? const Color(0xFF15803D) : Colors.red,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: (ev.bisaIkut && _sedangDiproses == null) ? () => _ikut(ev) : null,
                child: diproses
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                      )
                    : Text(alasan ?? 'Ikut Event', style: const TextStyle(fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _barisRiwayat(Keikutsertaan k) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        title: Text(k.namaEvent, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${tanggalEvent(k.tanggal)} · ${k.namaJalan} · ${k.namaRuas} · ${k.kodeStan}'),
        trailing: Text(labelStatusPeserta(k.status), style: const TextStyle(fontSize: 12)),
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
          pengajuan.jenisLapak != null ? (_lapakLabel[pengajuan.jenisLapak!] ?? pengajuan.jenisLapak!) : '-',
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
                _tanggalLahir == null ? 'Pilih tanggal' : _formatTanggalIndo(_formatTanggalApi(_tanggalLahir!)),
                style: TextStyle(color: _tanggalLahir == null ? Colors.black45 : Colors.black87),
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
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Nama lengkap wajib diisi' : null,
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
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Nama usaha wajib diisi' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _jenisDagangan,
            decoration: const InputDecoration(labelText: 'Kategori', border: OutlineInputBorder()),
            items: _kategoriLabel.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
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

  // ---------- widget kecil ----------

  Widget _kotakKosong(String teks) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Text(teks, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
      ),
    );
  }

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
    Widget? aksi,
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
                Text(title, style: TextStyle(color: titleColor, fontWeight: FontWeight.w600, fontSize: 13.5)),
                const SizedBox(height: 2),
                Text(body, style: TextStyle(color: bodyColor, fontSize: 12.5)),
                if (aksi != null) aksi,
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
          Expanded(child: Text(value.isEmpty ? '-' : value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}

/// Kartu event yang diikuti: nomor stan, lokasi, jam, status, dan QR untuk
/// dipindai petugas saat check-in.
class _KartuEvent extends StatelessWidget {
  final Keikutsertaan k;
  final bool diproses;
  final VoidCallback onBatal;

  const _KartuEvent({required this.k, required this.diproses, required this.onBatal});

  @override
  Widget build(BuildContext context) {
    final sudahCheckIn = k.status == 'check_in';
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: _brandColor.withValues(alpha: 0.25)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(k.namaEvent, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: (sudahCheckIn ? Colors.green : Colors.amber).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    labelStatusPeserta(k.status),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: sudahCheckIn ? const Color(0xFF15803D) : const Color(0xFFB45309),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${tanggalEvent(k.tanggal)} · ${jamEvent(k.jamMulai)} – ${jamEvent(k.jamSelesai)} WIB',
              style: const TextStyle(color: Colors.black54),
            ),
            const Divider(height: 24),
            const Text('NOMOR STAN',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _brandColor, letterSpacing: 0.5)),
            Text(k.kodeStan,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: _brandColor)),
            const SizedBox(height: 4),
            Text(
              '${k.namaJalan} · ${k.namaRuas}${k.namaKecamatan != null ? '\nKec. ${k.namaKecamatan}' : ''}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 12),
            if (!sudahCheckIn && k.qrCode.isNotEmpty) ...[
              Center(
                child: QrImageView(
                  data: k.qrCode,
                  version: QrVersions.auto,
                  size: 200,
                  backgroundColor: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Tunjukkan QR ini ke petugas untuk check-in.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ] else if (sudahCheckIn)
              const Text(
                'Kamu sudah check-in. Selamat berjualan!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.w600),
              ),
            if (k.bisaBatal) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: diproses ? null : onBatal,
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                child: Text(diproses ? 'Membatalkan...' : 'Batal ikut event ini'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}