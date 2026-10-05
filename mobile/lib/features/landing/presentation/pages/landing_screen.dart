import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/presentation/pages/register_screen.dart';
import 'package:mobile/features/landing/data/datasources/public_event_datasource.dart';
import 'package:mobile/features/landing/domain/entities/event_publik.dart';

/// Beranda publik versi aplikasi -- halaman pertama untuk pengguna yang
/// BELUM login. Isinya sejalan dengan beranda web, tapi disusun ulang untuk
/// HP dan disesuaikan dengan alur sistem yang sebenarnya:
///   1. Kartu sambutan + tombol Daftar / Masuk
///   2. Event terdekat -- kartu geser dari GET /api/public/sisa-lapak
///      (tanpa login, diperbarui otomatis tiap 30 detik)
///   3. Layanan yang tersedia di aplikasi
///   4. Langkah mendaftar sampai berjualan (bisa diketuk untuk detail)
/// Tombol "Daftar & Ikut Event" selalu terlihat di bawah layar.
///
/// Pengguna yang sudah login tidak melihat halaman ini -- SplashScreen
/// langsung mengarahkannya ke home sesuai role.
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

const _kLeaf = Color(0xFF0F7A44);
const _kRed = Color(0xFFBA1A1A);
const _kAmber = Color(0xFFB45309);
const _kInk = Color(0xFF1A1D29);
const _kInkSoft = Color(0xFF6B6F80);
const _kLine = Color(0xFFE4E6EE);
const _kBg = Color(0xFFF5F7FB);

class _LandingScreenState extends State<LandingScreen> {
  List<EventPublik> _events = const [];
  bool _loading = true;
  String? _error;
  DateTime? _diperbarui;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _muat();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _muat(diam: true));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _muat({bool diam = false}) async {
    if (!diam && mounted && !_loading) setState(() => _loading = true);
    try {
      final data = await PublicEventDatasource.sisaLapak();
      if (!mounted) return;
      setState(() {
        // Event yang sudah selesai / dibatalkan tidak perlu ditawarkan.
        _events = data.where((e) => e.status != 'selesai' && e.status != 'dibatalkan').toList();
        _error = null;
        _diperbarui = DateTime.now();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Data event belum bisa dimuat. Periksa koneksi lalu coba lagi.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _keLogin() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  // Daftar dibuka di atas halaman Login: setelah akun berhasil dibuat,
  // RegisterScreen menutup dirinya dan pengguna langsung berada di Login.
  void _keDaftar() {
    final nav = Navigator.of(context);
    nav.push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    nav.push(MaterialPageRoute(builder: (_) => const RegisterScreen()));
  }

  void _lihatLokasi(EventPublik ev) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (ctx) => _SheetLokasi(
        ev: ev,
        onDaftar: () {
          Navigator.of(ctx).pop();
          _keDaftar();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: _kBg,
        body: RefreshIndicator(
          onRefresh: () => _muat(diam: true),
          color: kBrandColor,
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: kBrandColor,
                titleSpacing: 16,
                title: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        color: Colors.white,
                        padding: const EdgeInsets.all(3),
                        child: const Image(
                          image: AssetImage('assets/images/logo.png'),
                          width: 26,
                          height: 26,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Text('E-Event Surabaya'),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: _keLogin,
                    style: TextButton.styleFrom(foregroundColor: Colors.white),
                    child: const Text('Masuk', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 6),
                ],
              ),
              SliverToBoxAdapter(child: _KartuSambutan(onDaftar: _keDaftar, onMasuk: _keLogin)),
              SliverToBoxAdapter(child: _bagianEvent()),
              const SliverToBoxAdapter(child: _BagianLayanan()),
              const SliverToBoxAdapter(child: _BagianLangkah()),
              const SliverToBoxAdapter(child: _Penutup()),
            ],
          ),
        ),
        // Ajakan utama selalu terlihat, tidak perlu menggulir ke atas.
        bottomNavigationBar: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: _kLine)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
              child: FilledButton.icon(
                onPressed: _keDaftar,
                icon: const Icon(Icons.storefront_outlined),
                label: const Text('Daftar & Ikut Event', style: TextStyle(fontWeight: FontWeight.w700)),
                style: FilledButton.styleFrom(
                  backgroundColor: kBrandColor,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ===================== EVENT TERDEKAT =====================
  Widget _bagianEvent() {
    Widget isi;
    if (_loading && _events.isEmpty) {
      isi = SizedBox(
        height: 190,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: 2,
          separatorBuilder: (_, i) => const SizedBox(width: 12),
          itemBuilder: (_, i) => Container(
            width: 270,
            decoration: BoxDecoration(color: const Color(0xFFE9ECF3), borderRadius: BorderRadius.circular(20)),
          ),
        ),
      );
    } else if (_error != null && _events.isEmpty) {
      isi = _KotakKosong(
        ikon: Icons.wifi_off_rounded,
        teks: _error!,
        aksi: TextButton(onPressed: () => _muat(), child: const Text('Coba lagi')),
      );
    } else if (_events.isEmpty) {
      isi = const _KotakKosong(
        ikon: Icons.event_busy_outlined,
        teks: 'Belum ada event CFD yang dijadwalkan dalam 2 minggu ke depan. Cek lagi nanti, ya.',
      );
    } else {
      isi = SizedBox(
        height: 196,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _events.length,
          separatorBuilder: (_, i) => const SizedBox(width: 12),
          itemBuilder: (_, i) => _KartuEvent(ev: _events[i], onTap: () => _lihatLokasi(_events[i])),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 8, 10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Event terdekat',
                          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: _kInk)),
                      const SizedBox(height: 2),
                      Text(
                        _diperbarui == null
                            ? 'Hari ini sampai 2 minggu ke depan'
                            : 'Geser untuk melihat event lain · diperbarui ${_jam(_diperbarui!)}',
                        style: const TextStyle(fontSize: 12.5, color: _kInkSoft),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _loading ? null : () => _muat(),
                  tooltip: 'Muat ulang',
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: kBrandColor),
                        )
                      : const Icon(Icons.refresh_rounded, color: _kInkSoft),
                ),
              ],
            ),
          ),
          isi,
        ],
      ),
    );
  }
}

// ===================== KARTU SAMBUTAN =====================
class _KartuSambutan extends StatelessWidget {
  final VoidCallback onDaftar;
  final VoidCallback onMasuk;
  const _KartuSambutan({required this.onDaftar, required this.onMasuk});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Container(
          decoration: const BoxDecoration(
            color: kBrandColor, // cadangan kalau gambar gagal dimuat
            image: DecorationImage(
              image: AssetImage('assets/images/cfd_surabaya.jpg'),
              fit: BoxFit.cover,
            ),
          ),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  kBrandColor.withValues(alpha: 0.55),
                  kBrandColor.withValues(alpha: 0.95),
                ],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Text('Car Free Day Surabaya',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Mau jualan di CFD?\nDaftar cukup dari HP.',
                  style: TextStyle(fontSize: 25, fontWeight: FontWeight.w700, color: Colors.white, height: 1.2),
                ),
                const SizedBox(height: 10),
                Text(
                  'Pilih event, dapatkan lokasi & nomor stan yang diacak adil oleh sistem, '
                  'lalu tunjukkan kartu QR ke petugas saat check-in.',
                  style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.9), height: 1.45),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: onDaftar,
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: kBrandColor,
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('Daftar Sekarang', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onMasuk,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.7)),
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('Sudah Punya Akun', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ===================== KARTU EVENT (geser horizontal) =====================
class _KartuEvent extends StatelessWidget {
  final EventPublik ev;
  final VoidCallback onTap;
  const _KartuEvent({required this.ev, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final tgl = DateTime.tryParse(ev.tanggal.length >= 10 ? ev.tanggal.substring(0, 10) : ev.tanggal);
    final persenTerisi = ev.kuotaTotal > 0 ? (ev.terisi / ev.kuotaTotal).clamp(0.0, 1.0) : 0.0;
    final (labelStatus, warnaStatus) = _statusEvent(ev);

    return SizedBox(
      width: 272,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _kLine),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Lencana tanggal
                    Container(
                      width: 48,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: kBrandColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Text(tgl == null ? '-' : '${tgl.day}',
                              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: kBrandColor)),
                          Text(tgl == null ? '' : _bulanPendek[tgl.month - 1],
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kBrandColor)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(ev.nama,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _kInk)),
                          const SizedBox(height: 2),
                          Text(
                            '${_hariRelatif(tgl)} · ${_jamTitik(ev.jamMulai)}–${_jamTitik(ev.jamSelesai)} WIB',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: _kInkSoft),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: warnaStatus.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(labelStatus,
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: warnaStatus)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Row(
                  children: [
                    Text(
                      ev.penuh ? 'Kuota penuh' : 'Sisa ${ev.sisa} lapak',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: ev.penuh ? _kRed : _kLeaf,
                      ),
                    ),
                    const Spacer(),
                    Text('${ev.terisi}/${ev.kuotaTotal} terisi',
                        style: const TextStyle(fontSize: 11.5, color: _kInkSoft)),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: persenTerisi,
                    minHeight: 6,
                    backgroundColor: const Color(0xFFE9ECF3),
                    color: ev.penuh ? _kRed : kBrandColor,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 15, color: _kInkSoft),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        ev.lokasi.isEmpty ? 'Lokasi belum ditentukan' : '${ev.lokasi.length} lokasi · ketuk untuk detail',
                        style: const TextStyle(fontSize: 12, color: _kInkSoft),
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, size: 18, color: _kInkSoft),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

(String, Color) _statusEvent(EventPublik ev) {
  if (ev.berjalan) return ('Sedang berlangsung', _kLeaf);
  switch (ev.statusPendaftaran) {
    case 'dibuka':
      return ('Pendaftaran dibuka', kBrandColor);
    case 'belum_dibuka':
      return ('Pendaftaran belum dibuka', _kAmber);
    default:
      return ('Pendaftaran ditutup', _kInkSoft);
  }
}

// ===================== SHEET LOKASI EVENT =====================
class _SheetLokasi extends StatelessWidget {
  final EventPublik ev;
  final VoidCallback onDaftar;
  const _SheetLokasi({required this.ev, required this.onDaftar});

  @override
  Widget build(BuildContext context) {
    final tgl = DateTime.tryParse(ev.tanggal.length >= 10 ? ev.tanggal.substring(0, 10) : ev.tanggal);
    final bisaDaftar = ev.pendaftaranDibuka && !ev.penuh;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(ev.nama, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: _kInk)),
              const SizedBox(height: 4),
              Text(
                '${tgl == null ? ev.tanggal : _tanggalPanjang(tgl)} · ${_jamTitik(ev.jamMulai)}–${_jamTitik(ev.jamSelesai)} WIB',
                style: const TextStyle(fontSize: 13, color: _kInkSoft),
              ),
              const SizedBox(height: 16),
              const Text('Lokasi event',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _kInk)),
              const SizedBox(height: 8),
              if (ev.lokasi.isEmpty)
                const Text('Lokasi event ini belum ditentukan.', style: TextStyle(fontSize: 13.5, color: _kInkSoft))
              else
                for (final l in ev.lokasi)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: _kBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.signpost_outlined, size: 18, color: kBrandColor),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(l.namaJalan, style: const TextStyle(fontSize: 13.5, color: _kInk)),
                              if (l.kecamatan != null)
                                Text('Kec. ${l.kecamatan}', style: const TextStyle(fontSize: 12, color: _kInkSoft)),
                            ],
                          ),
                        ),
                        Text('${l.jumlahRuas} ruas', style: const TextStyle(fontSize: 12, color: _kInkSoft)),
                      ],
                    ),
                  ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kBrandColor.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.shuffle_rounded, size: 18, color: kBrandColor),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Ruas dan nomor stan tidak dipilih sendiri -- sistem mengacaknya otomatis saat kamu '
                        'menekan "Ikut Event", jadi semua pedagang punya peluang yang sama.',
                        style: TextStyle(fontSize: 12.5, color: _kInk, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: bisaDaftar ? onDaftar : null,
                style: FilledButton.styleFrom(
                  backgroundColor: kBrandColor,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(
                  bisaDaftar
                      ? 'Daftar untuk ikut event ini'
                      : ev.penuh
                          ? 'Kuota event ini sudah penuh'
                          : 'Pendaftaran belum/tidak dibuka',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ===================== LAYANAN =====================
class _BagianLayanan extends StatelessWidget {
  const _BagianLayanan();

  static const _layanan = [
    (Icons.event_note_outlined, 'Info event real-time', 'Jadwal event & sisa lapak, bisa dilihat tanpa login.'),
    (Icons.badge_outlined, 'Daftar online', 'Buat akun & isi data usaha dari HP, langsung aktif.'),
    (Icons.shuffle_rounded, 'Lokasi diacak adil', 'Ruas & nomor stan dipilih sistem, tanpa rebutan.'),
    (Icons.qr_code_2_rounded, 'Kartu QR digital', 'Satu QR per event untuk check-in ke petugas.'),
    (Icons.payments_outlined, 'Checkout & omset', 'Catat omset setelah event selesai berjualan.'),
    (Icons.lock_reset_rounded, 'Lupa password', 'Atur ulang lewat kode OTP yang dikirim ke email.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 30, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _JudulBagian(judul: 'Layanan untuk pedagang', sub: 'Semua bisa diurus dari aplikasi ini.'),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, c) {
              final lebar = (c.maxWidth - 10) / 2;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final l in _layanan)
                    Container(
                      width: lebar,
                      constraints: const BoxConstraints(minHeight: 132),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: _kLine),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: kBrandColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Icon(l.$1, size: 20, color: kBrandColor),
                          ),
                          const SizedBox(height: 10),
                          Text(l.$2, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _kInk)),
                          const SizedBox(height: 4),
                          Text(l.$3, style: const TextStyle(fontSize: 12.5, color: _kInkSoft, height: 1.35)),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

// ===================== LANGKAH MENDAFTAR =====================
class _Langkah {
  final IconData ikon;
  final String judul;
  final String ringkas;
  final List<String> detail;
  const _Langkah(this.ikon, this.judul, this.ringkas, this.detail);
}

class _BagianLangkah extends StatefulWidget {
  const _BagianLangkah();

  @override
  State<_BagianLangkah> createState() => _BagianLangkahState();
}

class _BagianLangkahState extends State<_BagianLangkah> {
  int? _terbuka = 0;

  // Mengikuti alur sistem yang sebenarnya (register -> data usaha -> ikut
  // event -> acak lokasi & QR -> check-in -> checkout).
  static const _langkah = [
    _Langkah(Icons.person_add_alt_1_outlined, 'Buat akun', 'Daftar dengan nama, email, dan password.', [
      'Tekan "Daftar Sekarang", isi nama, email aktif, dan password.',
      'Setelah berhasil, masuk (login) dengan email & password tadi.',
      'Lupa password? Pakai "Lupa password" di halaman Masuk -- kode OTP dikirim ke email.',
    ]),
    _Langkah(Icons.store_mall_directory_outlined, 'Lengkapi data usaha', 'Sekali isi, dipakai untuk semua event.', [
      'Isi NIK (16 digit), nama lengkap, dan tanggal lahir.',
      'Isi nama usaha, kategori dagangan (makanan & minuman / bukan), dan jenis lapak (rombong / meja).',
      'Akun langsung aktif -- tidak perlu menunggu verifikasi petugas.',
    ]),
    _Langkah(Icons.touch_app_outlined, 'Pilih event & tekan "Ikut Event"', 'Pilih event yang pendaftarannya dibuka.', [
      'Lihat daftar event beserta sisa kuota untuk kategorimu (pedagang lama / baru).',
      'Hanya bisa ikut event yang statusnya "Pendaftaran dibuka" dan kuotanya masih ada.',
      'Satu pedagang hanya boleh terdaftar di SATU event aktif dalam satu waktu.',
    ]),
    _Langkah(Icons.qr_code_2_rounded, 'Dapat lokasi, nomor stan & QR', 'Diacak otomatis oleh sistem saat itu juga.', [
      'Sistem mengacak titik lokasi (jalan & ruas) dan nomor stanmu.',
      'Kartu QR khusus event itu langsung terbit -- simpan atau cetak.',
      'Berhalangan? Pendaftaran bisa dibatalkan selama pendaftaran masih dibuka dan kamu belum check-in.',
    ]),
    _Langkah(Icons.qr_code_scanner_rounded, 'Check-in di hari-H', 'Tunjukkan QR ke petugas di lokasi.', [
      'Check-in dibuka mulai 1 jam sebelum event dimulai.',
      'Datang ke lokasi & nomor stan sesuai kartu, lalu minta petugas memindai QR-mu.',
    ]),
    _Langkah(Icons.receipt_long_outlined, 'Checkout & isi omset', 'Setelah event selesai.', [
      'Buka menu Check-out lalu isi total omset hari itu.',
      'Wajib dilakukan -- selama belum checkout, kamu tidak bisa ikut event berikutnya.',
    ]),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 30, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _JudulBagian(
            judul: 'Cara mendaftar sampai berjualan',
            sub: 'Enam langkah. Ketuk tiap langkah untuk melihat detailnya.',
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _kLine),
            ),
            child: Column(
              children: [
                for (var i = 0; i < _langkah.length; i++)
                  _ItemLangkah(
                    nomor: i + 1,
                    langkah: _langkah[i],
                    terakhir: i == _langkah.length - 1,
                    terbuka: _terbuka == i,
                    onTap: () => setState(() => _terbuka = _terbuka == i ? null : i),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemLangkah extends StatelessWidget {
  final int nomor;
  final _Langkah langkah;
  final bool terakhir;
  final bool terbuka;
  final VoidCallback onTap;

  const _ItemLangkah({
    required this.nomor,
    required this.langkah,
    required this.terakhir,
    required this.terbuka,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Garis penghubung antar-langkah digambar di belakang (Stack), BUKAN
    // lewat IntrinsicHeight. IntrinsicHeight + AnimatedSize bikin
    // "RenderFlex overflowed" sesaat setiap detail langkah menutup, karena
    // tinggi baris dihitung dari ukuran akhir sementara animasinya masih
    // berjalan.
    return InkWell(
      onTap: onTap,
      child: Stack(
        children: [
          if (!terakhir)
            const Positioned(
              left: 31,
              top: 48,
              bottom: 0,
              child: SizedBox(width: 2, child: ColoredBox(color: _kLine)),
            ),
          Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Bulatan nomor langkah
            SizedBox(
              width: 64,
              child: Column(
                children: [
                  const SizedBox(height: 14),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: terbuka ? kBrandColor : kBrandColor.withValues(alpha: 0.08),
                    ),
                    child: Text(
                      '$nomor',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: terbuka ? Colors.white : kBrandColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(0, 14, 12, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(langkah.ikon, size: 18, color: kBrandColor),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(langkah.judul,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _kInk)),
                        ),
                        AnimatedRotation(
                          turns: terbuka ? 0.5 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: const Icon(Icons.expand_more_rounded, color: _kInkSoft),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(langkah.ringkas, style: const TextStyle(fontSize: 13, color: _kInkSoft)),
                    AnimatedSize(
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOut,
                      alignment: Alignment.topCenter,
                      child: terbuka
                          ? Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  for (final d in langkah.detail)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 6),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Padding(
                                            padding: EdgeInsets.only(top: 6),
                                            child: Icon(Icons.circle, size: 6, color: kBrandColor),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(d,
                                                style: const TextStyle(fontSize: 13, color: _kInk, height: 1.4)),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            )
                          : const SizedBox(width: double.infinity),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        ],
      ),
    );
  }
}

// ===================== PENUTUP =====================
class _Penutup extends StatelessWidget {
  const _Penutup();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 24),
      child: Column(
        children: [
          const Image(image: AssetImage('assets/images/logo.png'), height: 44),
          const SizedBox(height: 8),
          const Text('E-Event Surabaya',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: _kInk)),
          const Text('Portal pedagang Car Free Day se-Surabaya',
              style: TextStyle(fontSize: 12, color: _kInkSoft)),
          const SizedBox(height: 6),
          Text('© ${DateTime.now().year}', style: const TextStyle(fontSize: 11.5, color: _kInkSoft)),
        ],
      ),
    );
  }
}

// ===================== KOMPONEN KECIL =====================
class _JudulBagian extends StatelessWidget {
  final String judul;
  final String sub;
  const _JudulBagian({required this.judul, required this.sub});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(judul, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: _kInk)),
        const SizedBox(height: 2),
        Text(sub, style: const TextStyle(fontSize: 12.5, color: _kInkSoft)),
      ],
    );
  }
}

class _KotakKosong extends StatelessWidget {
  final IconData ikon;
  final String teks;
  final Widget? aksi;
  const _KotakKosong({required this.ikon, required this.teks, this.aksi});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _kLine),
      ),
      child: Column(
        children: [
          Icon(ikon, size: 30, color: _kInkSoft),
          const SizedBox(height: 10),
          Text(teks, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13.5, color: _kInkSoft, height: 1.4)),
          if (aksi != null) ...[const SizedBox(height: 4), aksi!],
        ],
      ),
    );
  }
}

// ===================== FORMAT =====================
const _hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const _bulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const _bulanPendek = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

/// "Hari ini" / "Besok" / "Sabtu"
String _hariRelatif(DateTime? d) {
  if (d == null) return '-';
  final now = DateTime.now();
  final selisih = DateTime(d.year, d.month, d.day).difference(DateTime(now.year, now.month, now.day)).inDays;
  if (selisih == 0) return 'Hari ini';
  if (selisih == 1) return 'Besok';
  return _hari[d.weekday - 1];
}

/// "Senin, 5 Oktober 2026"
String _tanggalPanjang(DateTime d) => '${_hari[d.weekday - 1]}, ${d.day} ${_bulan[d.month - 1]} ${d.year}';

/// "06:00" -> "06.00"
String _jamTitik(String jam) => jam.length >= 5 ? jam.substring(0, 5).replaceAll(':', '.') : jam;

String _jam(DateTime t) => '${t.hour.toString().padLeft(2, '0')}.${t.minute.toString().padLeft(2, '0')}';