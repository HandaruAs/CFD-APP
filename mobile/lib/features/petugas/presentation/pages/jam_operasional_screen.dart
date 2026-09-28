import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/providers/nav_provider.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/widgets/time_stepper.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/presentation/providers/jam_operasional_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/jam_operasional_state.dart';

// Isi & alurnya disamakan dengan web/app/admin/jam-operasional/page.tsx:
// Sesi CFD Hari Ini (buka / atur jam / ubah jam / akhiri lebih awal),
// Kode Event, timer Sisa Waktu CFD, dan Riwayat Operasional. Jadwal
// Mingguan & toggle buka/tutup pendaftaran yang dulu ada di sini sudah
// dihapus karena di web juga sudah gak dipakai.

const _kSukses = Color(0xFF16A34A);
const _kBahaya = Color(0xFFDC2626);
const _kPeringatan = Color(0xFFD97706);
const _kGaris = Color(0xFFE2E6EE);
const _kTeksRedup = Colors.black54;

const _kAcakLapakPath = '/admin/acak-lapak';

String _formatJamTampilan(String jam) =>
    (jam.length >= 5 ? jam.substring(0, 5) : jam).replaceAll(':', '.');

String _formatSisaWaktu(int totalMenit) {
  final jam = totalMenit ~/ 60;
  final menit = totalMenit % 60;
  return '${jam.toString().padLeft(2, '0')}:${menit.toString().padLeft(2, '0')}';
}

String _formatWaktuTabel(String waktu) => waktu.split('.').first;

/// "06:00:00" / "06:00" -> "06:00" (nilai awal stepper di dialog).
String _jamUntukForm(String jam) => jam.length >= 5 ? jam.substring(0, 5) : jam;

class JamOperasionalScreen extends ConsumerStatefulWidget {
  const JamOperasionalScreen({super.key});

  @override
  ConsumerState<JamOperasionalScreen> createState() => _JamOperasionalScreenState();
}

class _JamOperasionalScreenState extends ConsumerState<JamOperasionalScreen> {
  Timer? _autoRefresh;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(jamOperasionalProvider.notifier).load());
    // Sama kayak web: data disegarkan tiap 1 menit supaya sisa waktu &
    // status sesi ikut jalan tanpa perlu tarik-untuk-refresh.
    _autoRefresh = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) ref.read(jamOperasionalProvider.notifier).load(silent: true);
    });
  }

  @override
  void dispose() {
    _autoRefresh?.cancel();
    super.dispose();
  }

  // ===== FEEDBACK =====
  void _toast(String? error, String pesanSukses) {
    if (!mounted) return;
    final sukses = error == null;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: sukses ? _kSukses : _kBahaya,
          content: Row(
            children: [
              Icon(sukses ? Icons.check_circle : Icons.warning_amber_rounded, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  error ?? pesanSukses,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ),
      );
  }

  Future<bool> _konfirmasi({
    required String judul,
    required String pesan,
    required String labelYa,
    bool bahaya = false,
  }) async {
    final hasil = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: CircleAvatar(
          radius: 24,
          backgroundColor: (bahaya ? _kBahaya : kBrandColor).withValues(alpha: 0.12),
          child: Icon(Icons.warning_amber_rounded, color: bahaya ? _kBahaya : kBrandColor),
        ),
        title: Text(judul),
        content: Text(pesan, style: const TextStyle(fontSize: 15, height: 1.4)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: bahaya ? _kBahaya : kBrandColor),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(labelYa),
          ),
        ],
      ),
    );
    return hasil == true;
  }

  // ===== AKSI =====
  Future<void> _bukaSesiSekarang() async {
    final err = await ref.read(jamOperasionalProvider.notifier).bukaSesiSekarang();
    _toast(err, 'Sesi CFD berhasil dibuka');
  }

  Future<void> _akhiriSesi() async {
    final ya = await _konfirmasi(
      judul: 'Akhiri Sesi Lebih Awal',
      pesan: 'Sesi CFD hari ini akan langsung ditutup. Pedagang yang SUDAH check-in '
          'tetap aman dan bisa langsung check-out. Pedagang yang BELUM check-in klaim '
          'lapaknya otomatis dibatalkan (mereka perlu klaim ulang kalau sesi ini dibuka '
          'lagi). Sesi ini masih bisa dibuka ulang lewat "Buka Sesi Sekarang" atau '
          '"Atur Jam Sesi" kalau ternyata masih diperlukan hari ini. Lanjutkan?',
      labelYa: 'Ya, Akhiri Sesi',
      bahaya: true,
    );
    if (!ya) return;
    final err = await ref.read(jamOperasionalProvider.notifier).akhiriSesiLebihAwal();
    _toast(err, 'Sesi CFD berhasil diakhiri lebih awal');
  }

  Future<void> _bukaDialogAturJam(SesiAktif? sesi) async {
    await showDialog<void>(
      context: context,
      builder: (_) => _AturJamSesiDialog(
        ubah: sesi != null,
        jamMulaiAwal: sesi != null ? _jamUntukForm(sesi.jamMulai) : '06:00',
        jamSelesaiAwal: sesi != null ? _jamUntukForm(sesi.jamSelesaiRencana) : '11:00',
        onSimpan: (mulai, selesai) =>
            ref.read(jamOperasionalProvider.notifier).simpanSesi(mulai, selesai),
        onSelesai: (err) => _toast(err, 'Jam sesi CFD berhasil disimpan'),
      ),
    );
  }

  Future<void> _bukaDialogKodeEvent(String kodeSekarang) async {
    await showDialog<void>(
      context: context,
      builder: (_) => _KodeEventDialog(
        kodeAwal: kodeSekarang,
        konfirmasi: () => _konfirmasi(
          judul: 'Konfirmasi Perubahan Kode Event',
          pesan: 'Apakah Anda yakin dengan perubahan kode event ini?',
          labelYa: 'Ya, Simpan',
        ),
        onSimpan: (kode) => ref.read(jamOperasionalProvider.notifier).simpanKodeEvent(kode),
        onSelesai: (err) => _toast(err, 'Kode event berhasil disimpan'),
      ),
    );
  }

  void _keAcakLapak(int tabIndex) {
    ref.read(bottomNavIndexProvider.notifier).state = tabIndex;
  }

  // ===== BUILD =====
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(jamOperasionalProvider);

    // Tombol "Acak Lapak" cuma muncul kalau menu itu memang ada di tab
    // user ini (superadmin) -- petugas gak lihat tombolnya.
    final menus = ref.watch(menuListProvider).valueOrNull ?? const [];
    final acakLapakIndex = tabIndexForPath(menus, _kAcakLapakPath);

    return RefreshIndicator(
      onRefresh: () => ref.read(jamOperasionalProvider.notifier).load(silent: true),
      child: _buildBody(state, acakLapakIndex),
    );
  }

  Widget _buildBody(JamOperasionalState state, int acakLapakIndex) {
    if (state.isLoading && state.status == null) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 12),
            Text('Memuat data jam operasional...', style: TextStyle(color: _kTeksRedup)),
          ],
        ),
      );
    }

    if (state.status == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.error_outline, color: _kBahaya, size: 48),
          const SizedBox(height: 12),
          Text(
            'Gagal memuat data: ${state.error ?? 'data tidak ditemukan'}',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Center(
            child: FilledButton.icon(
              onPressed: () => ref.read(jamOperasionalProvider.notifier).load(),
              icon: const Icon(Icons.refresh),
              label: const Text('Coba Lagi'),
            ),
          ),
        ],
      );
    }

    final status = state.status!;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        const Text(
          'Atur sesi CFD hari ini dan kelola check-in pedagang.',
          style: TextStyle(color: _kTeksRedup, fontSize: 14.5),
        ),
        const SizedBox(height: 16),
        _buildSesiCard(state, status, acakLapakIndex),
        const SizedBox(height: 16),
        _buildTimerCard(status.sesi),
        const SizedBox(height: 16),
        _buildRiwayatCard(status.riwayat),
      ],
    );
  }

  // ===== CARD: SESI CFD HARI INI + KODE EVENT =====
  Widget _buildSesiCard(JamOperasionalState state, StatusOperasional status, int acakLapakIndex) {
    final sesi = status.sesi;

    return _Kartu(
      children: [
        Row(
          children: [
            const Expanded(child: _JudulBagian('Sesi CFD Hari Ini')),
            if (sesi != null)
              TextButton.icon(
                onPressed: state.isSaving ? null : () => _bukaDialogAturJam(sesi),
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('Ubah Jam'),
              ),
          ],
        ),
        if (acakLapakIndex != -1) ...[
          const SizedBox(height: 4),
          OutlinedButton.icon(
            onPressed: () => _keAcakLapak(acakLapakIndex),
            icon: const Icon(Icons.shuffle, size: 20),
            label: const Text('Acak Lapak'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
          ),
        ],
        const SizedBox(height: 12),
        if (sesi == null) _buildBelumAdaSesi(state) else _buildInfoSesi(state, sesi),
        if (sesi != null && sesi.aktif) ...[
          const SizedBox(height: 10),
          const _Catatan(
            'Kalau sesi diakhiri lebih awal, pedagang yang belum check-in klaim lapaknya '
            'otomatis dibatalkan. Sesi tetap bisa dibuka lagi kalau ternyata masih diperlukan.',
          ),
        ],
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 16),
          child: Divider(height: 1, color: _kGaris),
        ),
        _buildKodeEvent(state, status.pendaftaran),
      ],
    );
  }

  Widget _buildBelumAdaSesi(JamOperasionalState state) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Belum ada sesi CFD untuk hari ini.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _kTeksRedup, fontSize: 15),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: state.isSaving ? null : _bukaSesiSekarang,
            icon: state.isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.add),
            label: const Text('Buka Sesi Sekarang'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: state.isSaving ? null : () => _bukaDialogAturJam(null),
            icon: const Icon(Icons.schedule),
            label: const Text('Atur Jam Sesi'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSesi(JamOperasionalState state, SesiAktif sesi) {
    final String labelStatus;
    final Color warnaStatus;
    if (sesi.aktif) {
      labelStatus = 'Berlangsung';
      warnaStatus = _kSukses;
    } else if (sesi.sudahBerakhir) {
      labelStatus = 'Sudah Berakhir';
      warnaStatus = Colors.grey.shade600;
    } else {
      labelStatus = 'Belum Mulai';
      warnaStatus = Colors.grey.shade600;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F7FB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _kGaris),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'CFD ${sesi.tanggal}',
                style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w600),
              ),
              _Pill(label: labelStatus, warna: warnaStatus, titik: true),
            ],
          ),
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(
              style: const TextStyle(color: _kTeksRedup, fontSize: 14.5),
              children: [
                TextSpan(
                  text: '${_formatJamTampilan(sesi.jamMulai)} – '
                      '${_formatJamTampilan(sesi.jamSelesaiRencana)} WIB',
                ),
                if (sesi.aktif) ...[
                  const TextSpan(text: ' · sisa '),
                  TextSpan(
                    text: _formatSisaWaktu(sesi.sisaMenit),
                    style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w700),
                  ),
                ],
              ],
            ),
          ),
          if (sesi.aktif) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: state.isSaving ? null : _akhiriSesi,
                icon: const Icon(Icons.warning_amber_rounded),
                label: const Text('Akhiri Lebih Awal'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _kBahaya,
                  side: const BorderSide(color: _kBahaya),
                  minimumSize: const Size.fromHeight(46),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildKodeEvent(JamOperasionalState state, PendaftaranStatus pendaftaran) {
    final kode = pendaftaran.kodeEvent;
    final link = pendaftaran.linkPendaftaran;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(child: _JudulBagian('Kode Event')),
            TextButton.icon(
              onPressed: state.isSaving ? null : () => _bukaDialogKodeEvent(kode),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Edit'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _kGaris),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 10,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _Pill(label: 'Kode: $kode', warna: kBrandColor, ikon: Icons.sell_outlined),
                  if (link != null && link.isNotEmpty)
                    InkWell(
                      onTap: () async {
                        await Clipboard.setData(ClipboardData(text: link));
                        _toast(null, 'Link pendaftaran disalin');
                      },
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                          'Salin Link Pendaftaran',
                          style: TextStyle(
                            color: kBrandColor,
                            decoration: TextDecoration.underline,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Prefix nomor lapak acak pedagang, mis. "$kode-001234". Check-in kehadiran '
                'pedagang di lokasi tetap dilakukan petugas lewat Scan QR -- kode ini cuma '
                'buat prefix nomor lapak.',
                style: const TextStyle(color: _kTeksRedup, fontSize: 12.5, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ===== CARD: TIMER SISA WAKTU =====
  Widget _buildTimerCard(SesiAktif? sesi) {
    // Cuma diisi kalau sesinya sedang berlangsung -- sekalian bikin Dart
    // bisa promote ke non-null di bawah.
    final berjalan = (sesi != null && sesi.aktif) ? sesi : null;
    final progress = berjalan != null && berjalan.totalMenit > 0
        ? (berjalan.sisaMenit / berjalan.totalMenit).clamp(0.0, 1.0).toDouble()
        : 0.0;

    return _Kartu(
      children: [
        Center(
          child: SizedBox(
            width: 132,
            height: 132,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox.expand(
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(end: progress),
                    duration: const Duration(seconds: 1),
                    builder: (_, value, _) => CircularProgressIndicator(
                      value: value,
                      strokeWidth: 10,
                      strokeCap: StrokeCap.round,
                      backgroundColor: const Color(0xFFE6EAF1),
                      color: kBrandColor,
                    ),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      berjalan != null ? _formatSisaWaktu(berjalan.sisaMenit) : '--:--',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
                    ),
                    const Text('Sisa Waktu CFD', style: TextStyle(color: _kTeksRedup, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (berjalan != null)
          Text.rich(
            TextSpan(
              style: const TextStyle(color: _kTeksRedup, fontSize: 13.5),
              children: [
                const TextSpan(text: 'Sesi hari ini akan berakhir pada '),
                TextSpan(
                  text: '${_formatJamTampilan(berjalan.jamSelesaiRencana)} WIB',
                  style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            textAlign: TextAlign.center,
          )
        else
          const Text(
            'Belum ada sesi yang sedang berlangsung',
            textAlign: TextAlign.center,
            style: TextStyle(color: _kTeksRedup, fontSize: 13.5),
          ),
      ],
    );
  }

  // ===== CARD: RIWAYAT OPERASIONAL =====
  Widget _buildRiwayatCard(List<RiwayatSesi> riwayat) {
    return _Kartu(
      children: [
        Row(
          children: [
            const Icon(Icons.history, size: 20, color: _kTeksRedup),
            const SizedBox(width: 8),
            const Expanded(child: _JudulBagian('Riwayat Operasional')),
            Text('${riwayat.length} sesi terakhir',
                style: const TextStyle(color: _kTeksRedup, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 12),
        if (riwayat.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text(
              'Belum ada riwayat sesi.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _kTeksRedup),
            ),
          )
        else
          ...riwayat.map(_buildRiwayatItem),
      ],
    );
  }

  Widget _buildRiwayatItem(RiwayatSesi r) {
    final (label, warna, ikon) = switch (r.status) {
      'diperpanjang' => ('Diperpanjang', _kPeringatan, Icons.schedule),
      'diakhiri-awal' => ('Diakhiri Awal', _kBahaya, Icons.warning_amber_rounded),
      _ => ('Selesai Normal', _kSukses, Icons.check),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F7FB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _kGaris),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(r.tanggal,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
              ),
              _Pill(label: label, warna: warna, ikon: ikon),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${_formatWaktuTabel(r.jamMulai)} – ${_formatWaktuTabel(r.jamSelesai)} · ${r.durasi}',
            style: const TextStyle(color: _kTeksRedup, fontSize: 13.5),
          ),
        ],
      ),
    );
  }
}

// ===== DIALOG: ATUR / UBAH JAM SESI =====
class _AturJamSesiDialog extends StatefulWidget {
  final bool ubah;
  final String jamMulaiAwal;
  final String jamSelesaiAwal;
  final Future<String?> Function(String jamMulai, String jamSelesai) onSimpan;
  final void Function(String? error) onSelesai;

  const _AturJamSesiDialog({
    required this.ubah,
    required this.jamMulaiAwal,
    required this.jamSelesaiAwal,
    required this.onSimpan,
    required this.onSelesai,
  });

  @override
  State<_AturJamSesiDialog> createState() => _AturJamSesiDialogState();
}

class _AturJamSesiDialogState extends State<_AturJamSesiDialog> {
  late String _mulai = widget.jamMulaiAwal;
  late String _selesai = widget.jamSelesaiAwal;
  bool _menyimpan = false;

  Future<void> _simpan() async {
    setState(() => _menyimpan = true);
    final err = await widget.onSimpan(_mulai, _selesai);
    if (!mounted) return;
    setState(() => _menyimpan = false);
    // Sama kayak web: dialog cuma ditutup kalau berhasil, biar jamnya
    // gak perlu diisi ulang kalau backend nolak (mis. jam selesai lewat).
    if (err == null) Navigator.pop(context);
    widget.onSelesai(err);
  }

  Widget _field(String label, String value, ValueChanged<String> onChanged) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        const SizedBox(height: 4),
        FittedBox(
          child: TimeStepper(value: value, onChanged: onChanged, enabled: !_menyimpan),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.ubah ? 'Ubah Jam Sesi CFD' : 'Atur Jam Sesi CFD'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Sesi ini menentukan kapan pedagang bisa check-in (scan QR) dan kapan mereka '
              'baru boleh check-out.',
              style: TextStyle(color: _kTeksRedup, fontSize: 13.5, height: 1.4),
            ),
            const SizedBox(height: 16),
            _field('Jam Mulai', _mulai, (v) => setState(() => _mulai = v)),
            const SizedBox(height: 16),
            _field('Jam Selesai', _selesai, (v) => setState(() => _selesai = v)),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _menyimpan ? null : () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: _menyimpan ? null : _simpan,
          child: _menyimpan
              ? const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    ),
                    SizedBox(width: 8),
                    Text('Menyimpan...'),
                  ],
                )
              : const Text('Simpan'),
        ),
      ],
    );
  }
}

// ===== DIALOG: EDIT KODE EVENT =====
class _KodeEventDialog extends StatefulWidget {
  final String kodeAwal;
  final Future<bool> Function() konfirmasi;
  final Future<String?> Function(String kode) onSimpan;
  final void Function(String? error) onSelesai;

  const _KodeEventDialog({
    required this.kodeAwal,
    required this.konfirmasi,
    required this.onSimpan,
    required this.onSelesai,
  });

  @override
  State<_KodeEventDialog> createState() => _KodeEventDialogState();
}

class _KodeEventDialogState extends State<_KodeEventDialog> {
  late final _controller = TextEditingController(text: widget.kodeAwal);
  bool _menyimpan = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _simpan() async {
    if (!await widget.konfirmasi()) return;
    if (!mounted) return;
    setState(() => _menyimpan = true);
    final err = await widget.onSimpan(_controller.text.trim());
    if (!mounted) return;
    setState(() => _menyimpan = false);
    if (err == null) Navigator.pop(context);
    widget.onSelesai(err);
  }

  @override
  Widget build(BuildContext context) {
    final contoh = _controller.text.isEmpty ? 'CFD' : _controller.text;

    return AlertDialog(
      title: const Text('Edit Kode Event'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Prefix nomor lapak acak pedagang -- ganti sesuai event yang sedang berjalan '
              '(CFD, MRT, dst).',
              style: TextStyle(color: _kTeksRedup, fontSize: 13.5, height: 1.4),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              enabled: !_menyimpan,
              textCapitalization: TextCapitalization.characters,
              inputFormatters: [
                LengthLimitingTextInputFormatter(10),
                _HurufBesarFormatter(),
              ],
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: 1),
              decoration: const InputDecoration(
                labelText: 'Kode Event',
                hintText: 'CFD',
                prefixIcon: Icon(Icons.sell_outlined),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Contoh nomor lapak: "$contoh-001234"',
              style: const TextStyle(color: _kTeksRedup, fontSize: 12.5),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _menyimpan ? null : () => Navigator.pop(context),
          child: const Text('Batal'),
        ),
        FilledButton(
          onPressed: _menyimpan ? null : _simpan,
          child: Text(_menyimpan ? 'Menyimpan...' : 'Simpan'),
        ),
      ],
    );
  }
}

class _HurufBesarFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}

// ===== KOMPONEN KECIL =====
class _Kartu extends StatelessWidget {
  final List<Widget> children;
  const _Kartu({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kGaris),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
    );
  }
}

class _JudulBagian extends StatelessWidget {
  final String teks;
  const _JudulBagian(this.teks);

  @override
  Widget build(BuildContext context) =>
      Text(teks, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w700));
}

class _Catatan extends StatelessWidget {
  final String teks;
  const _Catatan(this.teks);

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(Icons.info_outline, size: 16, color: _kTeksRedup),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(teks, style: const TextStyle(color: _kTeksRedup, fontSize: 12.5, height: 1.4)),
        ),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final Color warna;
  final IconData? ikon;
  final bool titik;

  const _Pill({required this.label, required this.warna, this.ikon, this.titik = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: warna.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (titik) ...[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: warna, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          if (ikon != null) ...[
            Icon(ikon, size: 14, color: warna),
            const SizedBox(width: 4),
          ],
          Text(label, style: TextStyle(color: warna, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}