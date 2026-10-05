import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/network/api_exception.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/widgets/time_stepper.dart';
import 'package:mobile/features/superadmin/data/datasources/sesi_datasource.dart';
import 'package:mobile/features/superadmin/domain/entities/manajemen_lapak.dart';
import 'package:mobile/features/superadmin/domain/entities/sesi.dart';
import 'package:mobile/features/superadmin/presentation/providers/sesi_provider.dart';

/// Tambah Sesi -- sama dengan form web, dibuat SESEDERHANA mungkin:
///   1. Data sesi: nama, tanggal, jam mulai, jam selesai;
///   2. Jumlah pedagang (dan berapa untuk pedagang lama);
///   3. Lokasi diundi dari: Se-Surabaya / kecamatan / jalan / ruas.
/// Tombol "Simpan & Acak Lokasi" -> sesi dibuat, server mengundi SATU ruas,
/// lalu sesi langsung terbit.
///
/// Kalau undian / penerbitan gagal, sesi yang sudah terbuat tidak dibuat
/// ulang: "Coba Lagi" melanjutkan dari sesi yang sama.
///
/// Mode "Acak Lokasi" (`sesi` diisi): untuk sesi draft yang lokasinya
/// belum sempat diundi -- langkah 1 & 2 disembunyikan.
///
/// Halaman ini di-push sebagai halaman penuh, jadi punya Scaffold sendiri.
/// Hasilnya (pop) berupa pesan untuk snackbar, atau null kalau dibatalkan.
class TambahSesiPage extends ConsumerStatefulWidget {
  final Sesi? sesi;

  const TambahSesiPage({super.key, this.sesi});

  @override
  ConsumerState<TambahSesiPage> createState() => _TambahSesiPageState();
}

class _TambahSesiPageState extends ConsumerState<TambahSesiPage> {
  bool get _modeAcakSaja => widget.sesi != null;

  // --- data sesi ---
  final _nama = TextEditingController();
  DateTime _tanggal = DateTime.now();
  String _jamMulai = '06:00';
  String _jamSelesai = '11:00';
  final _kuotaTotal = TextEditingController();
  final _kuotaLama = TextEditingController(text: '0');

  // --- undian ---
  CakupanUndian _cakupan = CakupanUndian.kota;
  final Map<CakupanUndian, Set<String>> _pilihan = {
    CakupanUndian.kota: <String>{},
    CakupanUndian.kecamatan: <String>{},
    CakupanUndian.jalan: <String>{},
    CakupanUndian.ruas: <String>{},
  };
  String _cari = '';

  // --- proses ---
  bool _menyimpan = false;
  String? _error;
  String? _sesiIdTerbuat;
  bool _lokasiSudahDiacak = false;
  LokasiSesi? _lokasiTerundi;
  bool _selesai = false;

  @override
  void initState() {
    super.initState();
    _sesiIdTerbuat = widget.sesi?.id;
  }

  @override
  void dispose() {
    _nama.dispose();
    _kuotaTotal.dispose();
    _kuotaLama.dispose();
    super.dispose();
  }

  int get _angkaTotal => int.tryParse(_kuotaTotal.text.trim()) ?? 0;
  int get _angkaLama => int.tryParse(_kuotaLama.text.trim()) ?? 0;

  DateTime _waktu(String jam) {
    final p = jam.split(':');
    final h = int.tryParse(p.isNotEmpty ? p[0] : '') ?? 0;
    final m = int.tryParse(p.length > 1 ? p[1] : '') ?? 0;
    return DateTime(_tanggal.year, _tanggal.month, _tanggal.day, h, m);
  }

  String? _validasi() {
    if (!_modeAcakSaja && _sesiIdTerbuat == null) {
      if (_nama.text.trim().isEmpty) return 'Isi nama sesi dulu.';
      if (_jamSelesai.compareTo(_jamMulai) <= 0) return 'Jam selesai harus lebih besar dari jam mulai.';
      if (!_waktu(_jamSelesai).isAfter(DateTime.now())) {
        return 'Jam selesai sesi ini sudah lewat. Pilih tanggal atau jam yang akan datang.';
      }
      if (_angkaTotal < 1) return 'Isi jumlah pedagang, minimal 1.';
      if (_angkaLama < 0 || _angkaLama > _angkaTotal) {
        return 'Jatah pedagang lama harus antara 0 dan jumlah pedagang.';
      }
    }
    if (_lokasiSudahDiacak) return null;
    if (_cakupan != CakupanUndian.kota && _pilihan[_cakupan]!.isEmpty) {
      return 'Pilih minimal satu ${_cakupan.label.toLowerCase()}.';
    }
    return null;
  }

  Future<void> _simpan() async {
    FocusScope.of(context).unfocus();
    final pesan = _validasi();
    setState(() => _error = pesan);
    if (pesan != null) return;

    setState(() => _menyimpan = true);
    try {
      // 1. Buat sesi (sekali saja, walau langkah berikutnya gagal)
      final id = _sesiIdTerbuat ??
          await SesiDatasource.buat(
            nama: _nama.text.trim(),
            tanggal: isoTanggal(_tanggal),
            jamMulai: _jamMulai,
            jamSelesai: _jamSelesai,
            kuotaTotal: _angkaTotal,
            kuotaLama: _angkaLama,
          );
      _sesiIdTerbuat = id;

      // 2. Undi satu lokasi (dilewati kalau sudah berhasil sebelumnya)
      if (!_lokasiSudahDiacak) {
        _lokasiTerundi = await SesiDatasource.acakLokasi(
          id,
          cakupan: _cakupan,
          pilihan: _pilihan[_cakupan]!.toList(),
        );
        _lokasiSudahDiacak = true;
      }

      // 3. Terbitkan
      if (!_modeAcakSaja || widget.sesi?.status == 'draft') {
        await SesiDatasource.terbitkan(id);
      }
      if (mounted) setState(() => _selesai = true);
    } catch (e) {
      final pesanErr = e is ApiException ? e.message : '$e';
      final adaSesi = _sesiIdTerbuat != null;
      if (mounted) {
        setState(() {
          _error = (adaSesi && !_lokasiSudahDiacak)
              ? '$pesanErr Pilih tempat lain lalu tekan "Coba Lagi".'
              : pesanErr;
        });
      }
    } finally {
      if (mounted) setState(() => _menyimpan = false);
    }
  }

  void _tutup() {
    // Sesi sempat terbuat walau undiannya gagal -> beri tahu daftar.
    if (_sesiIdTerbuat != null && !_modeAcakSaja && !_selesai) {
      Navigator.of(context).pop('Sesi tersimpan sebagai draft, lokasinya belum diacak.');
    } else {
      Navigator.of(context).pop();
    }
  }

  Future<void> _pilihTanggal() async {
    final hariIni = DateTime.now();
    final dipilih = await showDatePicker(
      context: context,
      initialDate: _tanggal,
      firstDate: DateTime(hariIni.year, hariIni.month, hariIni.day),
      lastDate: hariIni.add(const Duration(days: 365)),
      helpText: 'Pilih tanggal sesi',
    );
    if (dipilih != null) setState(() => _tanggal = dipilih);
  }

  @override
  Widget build(BuildContext context) {
    final judul = _modeAcakSaja ? 'Acak Lokasi Sesi' : 'Tambah Sesi';
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !_menyimpan) _tutup();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(judul),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: _menyimpan ? null : _tutup,
          ),
        ),
        body: _selesai ? _hasil() : _form(),
      ),
    );
  }

  // ───────────────────────── tampilan hasil ─────────────────────────

  Widget _hasil() {
    final l = _lokasiTerundi;
    final namaSesi = _modeAcakSaja ? widget.sesi!.nama : _nama.text.trim();
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 16),
        const Icon(Icons.check_circle, color: Colors.green, size: 72),
        const SizedBox(height: 12),
        Text(
          _modeAcakSaja ? 'Lokasi Sudah Diacak' : 'Sesi Sudah Dibuat',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        const Text('Lokasi berjualan untuk sesi ini:', textAlign: TextAlign.center),
        const SizedBox(height: 16),
        if (l != null)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: kBrandColor.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: kBrandColor.withValues(alpha: 0.35), width: 2),
            ),
            child: Column(
              children: [
                Text(l.namaJalan, textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(l.namaRuas, textAlign: TextAlign.center, style: const TextStyle(fontSize: 18)),
                if (l.namaKecamatan != null) ...[
                  const SizedBox(height: 4),
                  Text('Kecamatan ${l.namaKecamatan}', style: const TextStyle(color: Colors.black54)),
                ],
              ],
            ),
          ),
        const SizedBox(height: 12),
        const Text(
          'Sesi sudah terlihat oleh pedagang dan siap diikuti.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 52,
          child: FilledButton(
            onPressed: () => Navigator.of(context).pop(
              l == null
                  ? 'Sesi "$namaSesi" sudah siap.'
                  : 'Sesi "$namaSesi" dibuat di ${l.namaJalan} · ${l.namaRuas}.',
            ),
            child: const Text('Selesai', style: TextStyle(fontSize: 16)),
          ),
        ),
      ],
    );
  }

  // ───────────────────────── form ─────────────────────────

  Widget _form() {
    final dataSesiTerkunci = _sesiIdTerbuat != null;
    return Column(
      children: [
        Expanded(
          child: AbsorbPointer(
            absorbing: _menyimpan,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 15)),
                  ),
                  const SizedBox(height: 16),
                ],
                if (!_modeAcakSaja) ...[
                  Opacity(
                    opacity: dataSesiTerkunci ? 0.55 : 1,
                    child: IgnorePointer(
                      ignoring: dataSesiTerkunci,
                      child: _bagianDataSesi(),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                Opacity(
                  opacity: _lokasiSudahDiacak ? 0.55 : 1,
                  child: IgnorePointer(
                    ignoring: _lokasiSudahDiacak,
                    child: _bagianUndian(),
                  ),
                ),
              ],
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SizedBox(
              width: double.infinity,
              height: 54,
              child: FilledButton.icon(
                onPressed: _menyimpan ? null : _simpan,
                icon: _menyimpan
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                      )
                    : const Icon(Icons.shuffle),
                label: Text(
                  _menyimpan
                      ? 'Mengacak...'
                      : (_modeAcakSaja
                          ? 'Acak Lokasi'
                          : (_sesiIdTerbuat != null ? 'Coba Lagi' : 'Simpan & Acak Lokasi')),
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _bagianDataSesi() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Langkah(no: 1, judul: 'Data sesi'),
        const SizedBox(height: 12),
        TextField(
          controller: _nama,
          maxLength: 150,
          style: const TextStyle(fontSize: 16),
          decoration: const InputDecoration(
            labelText: 'Nama sesi',
            hintText: 'contoh: CFD Minggu Pagi',
            border: OutlineInputBorder(),
            counterText: '',
          ),
        ),
        const SizedBox(height: 12),
        InkWell(
          onTap: _pilihTanggal,
          borderRadius: BorderRadius.circular(4),
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Tanggal',
              border: OutlineInputBorder(),
              suffixIcon: Icon(Icons.calendar_today_outlined),
            ),
            child: Text(tanggalPanjang(isoTanggal(_tanggal)), style: const TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(height: 16),
        const Text('Jam mulai', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TimeStepper(value: _jamMulai, showSeconds: false, onChanged: (v) => setState(() => _jamMulai = v)),
        const SizedBox(height: 12),
        const Text('Jam selesai', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        TimeStepper(value: _jamSelesai, showSeconds: false, onChanged: (v) => setState(() => _jamSelesai = v)),
        const SizedBox(height: 24),
        const _Langkah(no: 2, judul: 'Jumlah pedagang'),
        const SizedBox(height: 12),
        _InputAngka(
          controller: _kuotaTotal,
          label: 'Jumlah pedagang di sesi ini',
          hint: 'contoh: 50',
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        _InputAngka(
          controller: _kuotaLama,
          label: 'Dari jumlah itu, untuk pedagang lama',
          onChanged: (_) => setState(() {}),
        ),
        if (_angkaTotal > 0) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Pedagang lama ${_angkaLama.clamp(0, _angkaTotal)} · '
              'Pedagang baru ${(_angkaTotal - _angkaLama).clamp(0, _angkaTotal)} · '
              'Total $_angkaTotal',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ],
    );
  }

  Widget _bagianUndian() {
    final wilayahAsync = ref.watch(wilayahSesiProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Langkah(no: _modeAcakSaja ? 1 : 3, judul: 'Lokasi diundi dari'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: CakupanUndian.values
              .map(
                (c) => ChoiceChip(
                  label: Text(c.label, style: const TextStyle(fontSize: 15)),
                  selected: _cakupan == c,
                  onSelected: (_) => setState(() {
                    _cakupan = c;
                    _cari = '';
                  }),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 12),
        if (_cakupan != CakupanUndian.kota)
          wilayahAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Text('Daftar wilayah gagal dimuat: $e', style: const TextStyle(color: Colors.red)),
            data: _daftarPilihan,
          ),
        const SizedBox(height: 8),
        const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.info_outline, size: 18, color: Colors.black54),
            SizedBox(width: 6),
            Expanded(
              child: Text(
                'Sistem mengundi SATU ruas sebagai lokasi sesi ini. Ruas yang sedang dipakai sesi lain '
                'di jam yang sama tidak ikut diundi.',
                style: TextStyle(fontSize: 13, color: Colors.black54),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _daftarPilihan(List<KecamatanLengkap> wilayah) {
    final q = _cari.trim().toLowerCase();
    bool cocok(String teks) => q.isEmpty || teks.toLowerCase().contains(q);
    final terpilih = _pilihan[_cakupan]!;

    void toggle(String id) => setState(() {
          if (!terpilih.remove(id)) terpilih.add(id);
        });

    Widget baris(String id, String label, {String? sub}) => CheckboxListTile(
          value: terpilih.contains(id),
          onChanged: (_) => toggle(id),
          dense: false,
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          title: Text(label, style: const TextStyle(fontSize: 15)),
          subtitle: sub == null ? null : Text(sub),
        );

    Widget kepala(String judul) => Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 2),
          child: Text(
            judul.toUpperCase(),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black54, letterSpacing: 0.5),
          ),
        );

    final isi = <Widget>[];
    final kecamatanList = wilayah.where((k) => k.id != null).toList();

    switch (_cakupan) {
      case CakupanUndian.kota:
        break;
      case CakupanUndian.kecamatan:
        for (final k in kecamatanList.where((k) => cocok(k.nama))) {
          isi.add(baris(k.id!, k.nama, sub: '${k.jalan.length} jalan'));
        }
        break;
      case CakupanUndian.jalan:
        for (final k in wilayah) {
          final jalan = k.jalan.where((j) => cocok(j.namaJalan) || cocok(k.nama)).toList();
          if (jalan.isEmpty) continue;
          isi.add(kepala(k.nama));
          for (final j in jalan) {
            isi.add(baris(j.id, j.namaJalan, sub: '${j.ruas.length} ruas'));
          }
        }
        break;
      case CakupanUndian.ruas:
        for (final k in wilayah) {
          for (final j in k.jalan) {
            final ruas = j.ruas.where((r) => cocok(r.namaRuas) || cocok(j.namaJalan)).toList();
            if (ruas.isEmpty) continue;
            isi.add(kepala('${j.namaJalan} · ${k.nama}'));
            for (final r in ruas) {
              isi.add(baris(r.id, r.namaRuas));
            }
          }
        }
        break;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          onChanged: (v) => setState(() => _cari = v),
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.search),
            hintText: 'Cari ${_cakupan.label.toLowerCase()}...',
            border: const OutlineInputBorder(),
            isDense: true,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          terpilih.isEmpty ? 'Belum ada yang dipilih' : '${terpilih.length} dipilih',
          style: const TextStyle(fontSize: 13, color: Colors.black54),
        ),
        if (isi.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('Tidak ada yang cocok.', style: TextStyle(color: Colors.black54)),
          )
        else
          ...isi,
      ],
    );
  }
}

class _Langkah extends StatelessWidget {
  final int no;
  final String judul;

  const _Langkah({required this.no, required this.judul});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 15,
          backgroundColor: kBrandColor,
          child: Text('$no', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(width: 10),
        Text(judul, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ],
    );
  }
}

class _InputAngka extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final ValueChanged<String>? onChanged;

  const _InputAngka({required this.controller, required this.label, this.hint, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      onChanged: onChanged,
      style: const TextStyle(fontSize: 16),
      decoration: InputDecoration(labelText: label, hintText: hint, border: const OutlineInputBorder()),
    );
  }
}