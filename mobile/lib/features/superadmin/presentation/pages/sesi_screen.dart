import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/superadmin/data/datasources/sesi_datasource.dart';
import 'package:mobile/features/superadmin/domain/entities/sesi.dart';
import 'package:mobile/features/superadmin/presentation/pages/tambah_sesi_page.dart';
import 'package:mobile/features/superadmin/presentation/providers/sesi_provider.dart';

/// TAB "Jam Operasional" superadmin -- body doang (Scaffold/AppBar dipegang
/// MainLayout). Isinya sama dengan web /admin/jam-operasional:
///   - tombol Tambah Sesi;
///   - Sesi Terjadwal: lokasi, jumlah pedagang, peserta, ubah jumlah,
///     hapus/batalkan;
///   - Riwayat Sesi.
/// Menggantikan JamOperasionalScreen lama (sistem sesi harian) untuk
/// superadmin.
class SesiScreen extends ConsumerWidget {
  const SesiScreen({super.key});

  Future<void> _bukaTambah(BuildContext context, WidgetRef ref, {Sesi? acakUntuk}) async {
    final pesan = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => TambahSesiPage(sesi: acakUntuk),
      ),
    );
    ref.invalidate(sesiListProvider);
    if (pesan != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(pesan)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(sesiListProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(sesiListProvider.future),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          const Text(
            'Buat sesi dan acak lokasinya langsung dari tombol Tambah Sesi. '
            'Satu hari boleh punya beberapa sesi.',
            style: TextStyle(fontSize: 14, color: Colors.black54),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 52,
            child: FilledButton.icon(
              onPressed: () => _bukaTambah(context, ref),
              icon: const Icon(Icons.add_circle_outline),
              label: const Text('Tambah Sesi', style: TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 20),
          async.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (err, _) => _Gagal(pesan: '$err', onUlang: () => ref.invalidate(sesiListProvider)),
            data: (list) {
              final terjadwal = list.where((s) => s.aktif).toList()
                ..sort((a, b) => a.kunciUrut.compareTo(b.kunciUrut));
              final riwayat = list.where((s) => !s.aktif).toList()
                ..sort((a, b) => b.kunciUrut.compareTo(a.kunciUrut));
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Judul('Sesi Terjadwal', 'Sesi yang belum selesai. Sesi mulai dan selesai otomatis sesuai jamnya.'),
                  const SizedBox(height: 10),
                  if (terjadwal.isEmpty)
                    const _Kosong('Belum ada sesi terjadwal. Tekan "Tambah Sesi" untuk membuat sesi.')
                  else
                    ...terjadwal.map(
                      (s) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _KartuSesi(
                          sesi: s,
                          onAcakLokasi: () => _bukaTambah(context, ref, acakUntuk: s),
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                  const _Judul('Riwayat Sesi', 'Sesi yang sudah selesai atau dibatalkan.'),
                  const SizedBox(height: 10),
                  if (riwayat.isEmpty)
                    const _Kosong('Belum ada riwayat sesi.')
                  else
                    ...riwayat.take(30).map((s) => _BarisRiwayat(sesi: s)),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

// ───────────────────────── kartu sesi terjadwal ─────────────────────────

class _KartuSesi extends ConsumerWidget {
  final Sesi sesi;
  final VoidCallback onAcakLokasi;

  const _KartuSesi({required this.sesi, required this.onAcakLokasi});

  void _snack(BuildContext context, String pesan) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(pesan)));
  }

  Future<void> _jalankan(BuildContext context, WidgetRef ref, Future<void> Function() aksi, String pesanBerhasil) async {
    try {
      await aksi();
      ref.invalidate(sesiListProvider);
      if (context.mounted) _snack(context, pesanBerhasil);
    } catch (e) {
      if (context.mounted) _snack(context, '$e');
    }
  }

  Future<void> _terbitkan(BuildContext context, WidgetRef ref) async {
    final ok = await _konfirmasi(
      context,
      judul: 'Terbitkan sesi "${sesi.nama}"?',
      isi: 'Sesi akan terlihat oleh pedagang dan bisa langsung diikuti.',
      tombol: 'Terbitkan',
    );
    if (ok && context.mounted) {
      await _jalankan(context, ref, () => SesiDatasource.terbitkan(sesi.id), 'Sesi "${sesi.nama}" diterbitkan.');
    }
  }

  Future<void> _hapus(BuildContext context, WidgetRef ref) async {
    if (sesi.terisi > 0) {
      final ok = await _konfirmasi(
        context,
        judul: 'Batalkan sesi "${sesi.nama}"?',
        isi: 'Sesi yang sudah ada pedagangnya tidak bisa dihapus, jadi sesi ini dibatalkan. '
            '${sesi.terisi} pedagang yang sudah terdaftar ikut dibatalkan. Tindakan ini tidak bisa diurungkan.',
        tombol: 'Batalkan Sesi',
        bahaya: true,
      );
      if (ok && context.mounted) {
        await _jalankan(context, ref, () => SesiDatasource.batalkan(sesi.id), 'Sesi "${sesi.nama}" dibatalkan.');
      }
      return;
    }
    final ok = await _konfirmasi(
      context,
      judul: 'Hapus sesi "${sesi.nama}"?',
      isi: 'Tindakan ini tidak bisa dibatalkan.',
      tombol: 'Hapus Sesi',
      bahaya: true,
    );
    if (ok && context.mounted) {
      await _jalankan(context, ref, () => SesiDatasource.hapus(sesi.id), 'Sesi "${sesi.nama}" dihapus.');
    }
  }

  Future<void> _ubahJumlah(BuildContext context, WidgetRef ref) async {
    final pesan = await showDialog<String>(
      context: context,
      builder: (_) => _UbahJumlahDialog(sesi: sesi),
    );
    if (pesan != null) {
      ref.invalidate(sesiListProvider);
      if (context.mounted) _snack(context, pesan);
    }
  }

  void _lihatPeserta(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _PesertaSheet(sesi: sesi),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = sesi;
    final berlangsung = s.sedangBerlangsung;

    return Container(
      decoration: BoxDecoration(
        color: berlangsung ? kBrandColor.withValues(alpha: 0.06) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: berlangsung ? kBrandColor.withValues(alpha: 0.4) : Colors.black12),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _KotakTanggal(tanggal: s.tanggal, gelap: berlangsung),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.nama, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    _ChipStatus(sesi: s),
                    const SizedBox(height: 6),
                    Text(
                      '${jamTitik(s.jamMulai)} – ${jamTitik(s.jamSelesai)} WIB',
                      style: const TextStyle(fontSize: 14, color: Colors.black87),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.place_outlined, size: 20, color: s.lokasi == null ? Colors.red : kBrandColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  s.lokasi ?? 'Lokasi belum diacak',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: s.lokasi == null ? FontWeight.w600 : FontWeight.w500,
                    color: s.lokasi == null ? Colors.red : Colors.black87,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(
              style: const TextStyle(fontSize: 14, color: Colors.black54),
              children: [
                TextSpan(
                  text: '${s.terisi}/${s.kuotaTotal}',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.black87),
                ),
                TextSpan(text: ' pedagang · lama ${s.terisiLama}/${s.kuotaLama} · baru ${s.terisiBaru}/${s.kuotaBaru}'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (s.status == 'draft' && s.punyaLokasi)
                FilledButton.icon(
                  onPressed: () => _terbitkan(context, ref),
                  icon: const Icon(Icons.send, size: 18),
                  label: const Text('Terbitkan'),
                ),
              if (s.bisaDiatur && !s.punyaLokasi)
                FilledButton.icon(
                  onPressed: onAcakLokasi,
                  icon: const Icon(Icons.shuffle, size: 18),
                  label: const Text('Acak Lokasi'),
                ),
              if (s.bisaDiatur)
                OutlinedButton.icon(
                  onPressed: () => _ubahJumlah(context, ref),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Ubah Jumlah'),
                ),
              OutlinedButton.icon(
                onPressed: () => _lihatPeserta(context),
                icon: const Icon(Icons.people_outline, size: 18),
                label: Text('Peserta (${s.terisi})'),
              ),
              if (s.bisaDiatur)
                OutlinedButton.icon(
                  onPressed: () => _hapus(context, ref),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: Text(s.terisi > 0 ? 'Batalkan' : 'Hapus'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KotakTanggal extends StatelessWidget {
  final String tanggal;
  final bool gelap;

  const _KotakTanggal({required this.tanggal, required this.gelap});

  @override
  Widget build(BuildContext context) {
    final warnaTeks = gelap ? Colors.white : kBrandColor;
    return Container(
      width: 64,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: gelap ? kBrandColor : kBrandColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(hariPendek(tanggal), style: TextStyle(fontSize: 12, color: warnaTeks)),
          Text(
            '${tanggalAngka(tanggal)}',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: warnaTeks),
          ),
          Text(bulanPendek(tanggal), style: TextStyle(fontSize: 12, color: warnaTeks)),
        ],
      ),
    );
  }
}

class _ChipStatus extends StatelessWidget {
  final Sesi sesi;

  const _ChipStatus({required this.sesi});

  @override
  Widget build(BuildContext context) {
    late final String label;
    late final Color warna;
    if (sesi.status == 'draft') {
      label = 'Draft · belum terlihat pedagang';
      warna = Colors.orange;
    } else if (sesi.sedangBerlangsung) {
      label = sesi.statusPendaftaran == 'dibuka' ? 'Berlangsung · pendaftaran dibuka' : 'Berlangsung';
      warna = Colors.green;
    } else if (sesi.statusPendaftaran == 'dibuka') {
      label = 'Pendaftaran dibuka';
      warna = kBrandColor;
    } else if (sesi.statusPendaftaran == 'belum_dibuka') {
      label = 'Pendaftaran belum dibuka';
      warna = Colors.grey;
    } else {
      label = 'Pendaftaran ditutup';
      warna = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: warna.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: warna)),
    );
  }
}

// ───────────────────────── riwayat ─────────────────────────

class _BarisRiwayat extends StatelessWidget {
  final Sesi sesi;

  const _BarisRiwayat({required this.sesi});

  String get _labelStatus {
    switch (sesi.status) {
      case 'dibatalkan':
        return 'Dibatalkan';
      case 'diakhiri_awal':
        return 'Diakhiri lebih awal';
      default:
        return 'Selesai';
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = sesi;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s.nama, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  '${tanggalPanjang(s.tanggal)} · ${jamTitik(s.jamMulai)}–${jamTitik(s.jamSelesai)}',
                  style: const TextStyle(fontSize: 13, color: Colors.black54),
                ),
                const SizedBox(height: 2),
                Text(
                  '${s.lokasi ?? "-"} · ${s.terisi}/${s.kuotaTotal} pedagang',
                  style: const TextStyle(fontSize: 13, color: Colors.black54),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            _labelStatus,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: s.status == 'dibatalkan' ? Colors.red : Colors.black54,
            ),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────── ubah jumlah ─────────────────────────

class _UbahJumlahDialog extends StatefulWidget {
  final Sesi sesi;

  const _UbahJumlahDialog({required this.sesi});

  @override
  State<_UbahJumlahDialog> createState() => _UbahJumlahDialogState();
}

class _UbahJumlahDialogState extends State<_UbahJumlahDialog> {
  late final TextEditingController _total = TextEditingController(text: '${widget.sesi.kuotaTotal}');
  late final TextEditingController _lama = TextEditingController(text: '${widget.sesi.kuotaLama}');
  bool _menyimpan = false;
  String? _error;

  @override
  void dispose() {
    _total.dispose();
    _lama.dispose();
    super.dispose();
  }

  int get _angkaTotal => int.tryParse(_total.text.trim()) ?? 0;
  int get _angkaLama => int.tryParse(_lama.text.trim()) ?? 0;

  Future<void> _simpan() async {
    final total = _angkaTotal;
    final lama = _angkaLama;
    if (total < 1) {
      setState(() => _error = 'Jumlah pedagang minimal 1.');
      return;
    }
    if (lama < 0 || lama > total) {
      setState(() => _error = 'Jatah pedagang lama harus antara 0 dan jumlah pedagang.');
      return;
    }
    setState(() {
      _menyimpan = true;
      _error = null;
    });
    try {
      await SesiDatasource.ubahJumlah(widget.sesi, kuotaTotal: total, kuotaLama: lama);
      if (mounted) Navigator.of(context).pop('Jumlah pedagang sesi "${widget.sesi.nama}" diperbarui.');
    } catch (e) {
      if (mounted) {
        setState(() {
          _menyimpan = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.sesi;
    return AlertDialog(
      title: const Text('Ubah Jumlah Pedagang'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(s.nama, style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 12),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
            ],
            _InputAngka(controller: _total, label: 'Jumlah pedagang di sesi ini', onChanged: (_) => setState(() {})),
            const SizedBox(height: 12),
            _InputAngka(controller: _lama, label: 'Dari jumlah itu, untuk pedagang lama', onChanged: (_) => setState(() {})),
            const SizedBox(height: 8),
            Text(
              'Pedagang baru: ${(_angkaTotal - _angkaLama).clamp(0, 999999)}',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Text(
              'Sudah terdaftar: ${s.terisi} (lama ${s.terisiLama}, baru ${s.terisiBaru}). '
              'Jumlah tidak boleh di bawah pedagang yang sudah terdaftar. Setelah pendaftaran dibuka, '
              'jumlahnya hanya bisa dinaikkan.',
              style: const TextStyle(fontSize: 13, color: Colors.black54),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _menyimpan ? null : () => Navigator.of(context).pop(),
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

// ───────────────────────── peserta ─────────────────────────

class _PesertaSheet extends StatelessWidget {
  final Sesi sesi;

  const _PesertaSheet({required this.sesi});

  static const _labelStatus = {
    'terdaftar': 'Terdaftar',
    'check_in': 'Sudah check-in',
    'check_out': 'Sudah check-out',
    'batal': 'Batal',
    'tidak_hadir': 'Tidak hadir',
  };

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.75,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Peserta Sesi', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                Text(sesi.nama, style: const TextStyle(color: Colors.black54)),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: FutureBuilder<List<PesertaSesi>>(
              future: SesiDatasource.peserta(sesi.id),
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(child: Text('${snap.error}', textAlign: TextAlign.center));
                }
                final list = snap.data ?? const <PesertaSesi>[];
                if (list.isEmpty) {
                  return const Center(child: Text('Belum ada pedagang yang ikut sesi ini.'));
                }
                return ListView.separated(
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final p = list[i];
                    return ListTile(
                      title: Text(p.namaUsaha ?? p.namaLengkap ?? '-'),
                      subtitle: Text(
                        '${p.namaLengkap ?? "-"} · pedagang ${p.kategori} · ${_labelStatus[p.status] ?? p.status}',
                      ),
                      trailing: Text(
                        p.kodeStan,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: kBrandColor),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────── bagian kecil ─────────────────────────

class _InputAngka extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final ValueChanged<String>? onChanged;

  const _InputAngka({required this.controller, required this.label, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      onChanged: onChanged,
      style: const TextStyle(fontSize: 16),
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    );
  }
}

class _Judul extends StatelessWidget {
  final String judul;
  final String sub;

  const _Judul(this.judul, this.sub);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(judul, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text(sub, style: const TextStyle(fontSize: 13, color: Colors.black54)),
      ],
    );
  }
}

class _Kosong extends StatelessWidget {
  final String teks;

  const _Kosong(this.teks);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black12),
      ),
      child: Text(teks, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
    );
  }
}

class _Gagal extends StatelessWidget {
  final String pesan;
  final VoidCallback onUlang;

  const _Gagal({required this.pesan, required this.onUlang});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 40),
          const SizedBox(height: 8),
          Text(pesan, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          TextButton(onPressed: onUlang, child: const Text('Coba Lagi')),
        ],
      ),
    );
  }
}

Future<bool> _konfirmasi(
  BuildContext context, {
  required String judul,
  required String isi,
  required String tombol,
  bool bahaya = false,
}) async {
  final hasil = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(judul),
      content: Text(isi),
      actions: [
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Batal')),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          style: bahaya ? FilledButton.styleFrom(backgroundColor: Colors.red) : null,
          child: Text(tombol),
        ),
      ],
    ),
  );
  return hasil ?? false;
}