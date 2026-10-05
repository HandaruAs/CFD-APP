import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/presentation/pages/register_screen.dart';
import 'package:mobile/features/landing/data/datasources/public_event_datasource.dart';
import 'package:mobile/features/landing/domain/entities/event_publik.dart';

/// Beranda publik -- halaman pertama yang dilihat pengguna yang BELUM login,
/// sama isinya dengan beranda web (web/app/page.tsx):
///   1. Hero "E-Event Surabaya" + tombol bulat "Daftar & Dapat Nomor Stan"
///   2. Event CFD & sisa lapak (GET /api/public/sisa-lapak, tanpa login,
///      diperbarui otomatis tiap 30 detik)
///   3. Fitur untuk pedagang
///   4. Alur pendaftaran pedagang (4 tahap)
/// Tombol "Masuk" di atas membuka LoginScreen.
///
/// Pengguna yang sudah login tidak melihat halaman ini -- SplashScreen
/// langsung mengarahkannya ke home sesuai role.
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

const _kLeaf = Color(0xFF0F7A44);
const _kInk = Color(0xFF1A1D29);
const _kInkSoft = Color(0xFF6B6F80);
const _kLine = Color(0xFFE4E6EE);
const _kPaper = Color(0xFFF5F7FB);

class _LandingScreenState extends State<LandingScreen> {
  List<EventPublik> _events = const [];
  bool _loading = true;
  String? _error;
  DateTime? _diperbarui;
  String? _terbuka; // id event yang lokasinya sedang dibuka
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _muat();
    // Sama dengan web: data sisa lapak diperbarui otomatis tiap 30 detik.
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
        _events = data;
        _error = null;
        _diperbarui = DateTime.now();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Gagal memuat data sisa lapak. Coba muat ulang.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _keLogin() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  // Daftar dibuka di atas halaman Login: setelah akun berhasil dibuat,
  // RegisterScreen menutup dirinya sendiri dan pengguna langsung berada di
  // halaman Login (bukan kembali ke beranda).
  void _keDaftar() {
    final nav = Navigator.of(context);
    nav.push(MaterialPageRoute(builder: (_) => const LoginScreen()));
    nav.push(MaterialPageRoute(builder: (_) => const RegisterScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.white,
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
                          width: 28,
                          height: 28,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Text('E-Event Surabaya'),
                  ],
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: FilledButton(
                      onPressed: _keLogin,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: kBrandColor,
                        minimumSize: const Size(0, 40),
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                      ),
                      child: const Text('Masuk', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
              SliverToBoxAdapter(child: _Hero(onDaftar: _keDaftar)),
              SliverToBoxAdapter(child: _bagianSisaLapak()),
              const SliverToBoxAdapter(child: _BagianFitur()),
              const SliverToBoxAdapter(child: _BagianAlur()),
              SliverToBoxAdapter(child: _Footer(onDaftar: _keDaftar, onMasuk: _keLogin)),
            ],
          ),
        ),
      ),
    );
  }

  // ===================== EVENT CFD & SISA LAPAK =====================
  Widget _bagianSisaLapak() {
    // Angka besar: sisa tempat di event yang pendaftarannya dibuka.
    final dibuka = _events.where((e) => e.pendaftaranDibuka);
    final totalSisa = dibuka.fold<int>(0, (t, e) => t + (e.sisa < 0 ? 0 : e.sisa));
    final totalKuota = dibuka.fold<int>(0, (t, e) => t + e.kuotaTotal);

    Widget isi;
    if (_loading && _events.isEmpty) {
      isi = const _KotakInfo(teks: 'Memuat data sisa lapak...');
    } else if (_error != null && _events.isEmpty) {
      isi = _KotakInfo(teks: _error!);
    } else if (_events.isEmpty) {
      isi = const _KotakInfo(teks: 'Belum ada event CFD yang dijadwalkan dalam 2 minggu ke depan.');
    } else {
      isi = Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _kLine),
        ),
        child: Column(
          children: [
            for (var i = 0; i < _events.length; i++) ...[
              if (i > 0) const Divider(height: 1, color: _kLine),
              _KartuEvent(
                ev: _events[i],
                terbuka: _terbuka == _events[i].id,
                onTap: () => setState(() => _terbuka = _terbuka == _events[i].id ? null : _events[i].id),
              ),
            ],
          ],
        ),
      );
    }

    return Container(
      color: _kPaper,
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _LabelSeksi('DATA LANGSUNG'),
          const SizedBox(height: 8),
          const Text(
            'Event CFD & sisa lapak',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _kInk, height: 1.15),
          ),
          const SizedBox(height: 10),
          const Text(
            'Event hari ini sampai 2 minggu ke depan. Diperbarui otomatis tiap 30 detik. '
            'Ketuk event untuk melihat lokasinya.',
            style: TextStyle(fontSize: 14.5, color: _kInkSoft, height: 1.5),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              if (!_loading || _events.isNotEmpty)
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: _kLine),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(
                          TextSpan(
                            text: '$totalSisa',
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: _kInk),
                            children: [
                              TextSpan(
                                text: ' / $totalKuota',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _kInkSoft),
                              ),
                            ],
                          ),
                        ),
                        const Text('lapak tersisa (pendaftaran dibuka)',
                            style: TextStyle(fontSize: 12, color: _kInkSoft)),
                      ],
                    ),
                  ),
                )
              else
                const Spacer(),
              const SizedBox(width: 12),
              SizedBox(
                width: 48,
                height: 48,
                child: OutlinedButton(
                  onPressed: _loading ? null : () => _muat(),
                  style: OutlinedButton.styleFrom(
                    shape: const CircleBorder(),
                    padding: EdgeInsets.zero,
                    side: const BorderSide(color: _kLine),
                    backgroundColor: Colors.white,
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: kBrandColor),
                        )
                      : const Icon(Icons.refresh, color: _kInkSoft),
                ),
              ),
            ],
          ),
          if (_diperbarui != null && !_loading) ...[
            const SizedBox(height: 8),
            Text(
              'Terakhir diperbarui ${_jam(_diperbarui!)} WIB',
              style: const TextStyle(fontSize: 12, color: _kInkSoft),
            ),
          ],
          const SizedBox(height: 20),
          isi,
        ],
      ),
    );
  }
}

// ===================== HERO =====================
class _Hero extends StatefulWidget {
  final VoidCallback onDaftar;
  const _Hero({required this.onDaftar});

  @override
  State<_Hero> createState() => _HeroState();
}

class _HeroState extends State<_Hero> with SingleTickerProviderStateMixin {
  late final AnimationController _ping =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();

  @override
  void dispose() {
    _ping.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final kurangiGerak = MediaQuery.of(context).disableAnimations;
    return Container(
      constraints: const BoxConstraints(minHeight: 520),
      decoration: const BoxDecoration(
        color: kBrandColor, // cadangan kalau gambar gagal dimuat
        image: DecorationImage(
          image: AssetImage('assets/images/cfd_surabaya.jpg'),
          fit: BoxFit.cover,
        ),
      ),
      child: Container(
        color: Colors.black.withValues(alpha: 0.55),
        padding: const EdgeInsets.fromLTRB(24, 56, 24, 64),
        alignment: Alignment.center,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'E-Event Surabaya',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 38, fontWeight: FontWeight.w700, color: Colors.white, height: 1.05),
            ),
            const SizedBox(height: 16),
            Text(
              'Portal resmi pendaftaran pedagang Car Free Day se-Surabaya. Daftar, isi data usaha, dan '
              'dapatkan nomor stan langsung dari HP -- tanpa antre ke posko.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15.5, color: Colors.white.withValues(alpha: 0.85), height: 1.5),
            ),
            const SizedBox(height: 44),
            SizedBox(
              width: 196,
              height: 196,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  if (!kurangiGerak)
                    AnimatedBuilder(
                      animation: _ping,
                      builder: (context, child) {
                        // Cincin yang membesar lalu memudar, seperti animasi ping di web.
                        final t = Curves.easeInOut.transform(_ping.value);
                        return Opacity(
                          opacity: (1 - t).clamp(0.0, 1.0),
                          child: Transform.scale(
                            scale: 1 + 0.15 * t,
                            child: Container(
                              width: 184,
                              height: 184,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  Material(
                    color: Colors.white,
                    shape: const CircleBorder(),
                    elevation: 12,
                    shadowColor: Colors.black54,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: widget.onDaftar,
                      child: const SizedBox(
                        width: 160,
                        height: 160,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.storefront_outlined, size: 36, color: kBrandColor),
                            SizedBox(height: 8),
                            Text(
                              'Daftar &\nDapat Nomor Stan',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: kBrandColor,
                                height: 1.2,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ===================== KARTU EVENT =====================
class _KartuEvent extends StatelessWidget {
  final EventPublik ev;
  final bool terbuka;
  final VoidCallback onTap;

  const _KartuEvent({required this.ev, required this.terbuka, required this.onTap});

  static const _labelPendaftaran = {
    'belum_dibuka': 'Pendaftaran belum dibuka',
    'dibuka': 'Pendaftaran dibuka',
    'ditutup': 'Pendaftaran ditutup',
  };

  @override
  Widget build(BuildContext context) {
    final aktif = ev.berjalan || ev.pendaftaranDibuka;
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: kBrandColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.location_on_outlined, size: 20, color: kBrandColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ev.nama,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _kInk),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_formatTanggalEvent(ev.tanggal)} · ${_jamTitik(ev.jamMulai)}–${_jamTitik(ev.jamSelesai)} WIB',
                        style: const TextStyle(fontSize: 12, color: _kInkSoft),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Icon(Icons.circle, size: 8, color: aktif ? _kLeaf : _kInkSoft.withValues(alpha: 0.4)),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              ev.berjalan
                                  ? 'Sedang berlangsung'
                                  : (_labelPendaftaran[ev.statusPendaftaran] ?? ev.statusPendaftaran),
                              style: const TextStyle(fontSize: 12, color: _kInkSoft),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: ev.penuh ? const Color(0xFFFDECEC) : _kLeaf.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        ev.penuh ? 'Penuh' : 'Sisa ${ev.sisa} / ${ev.kuotaTotal}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: ev.penuh ? const Color(0xFFBA1A1A) : _kLeaf,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    AnimatedRotation(
                      turns: terbuka ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(Icons.expand_more, color: _kInkSoft),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (terbuka)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            decoration: const BoxDecoration(
              color: _kPaper,
              border: Border(top: BorderSide(color: _kLine)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (ev.lokasi.isEmpty)
                  const Text('Lokasi event ini belum ditentukan.',
                      style: TextStyle(fontSize: 13.5, color: _kInkSoft))
                else
                  for (final l in ev.lokasi)
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _kLine),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text.rich(
                              TextSpan(
                                text: l.namaJalan,
                                style: const TextStyle(fontSize: 13, color: _kInk),
                                children: [
                                  if (l.kecamatan != null)
                                    TextSpan(
                                      text: ' · Kec. ${l.kecamatan}',
                                      style: const TextStyle(color: _kInkSoft),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          Text('${l.jumlahRuas} ruas', style: const TextStyle(fontSize: 11.5, color: _kInkSoft)),
                        ],
                      ),
                    ),
                const SizedBox(height: 4),
                const Text(
                  'Lokasi lapak dan nomor stan diacak otomatis oleh sistem saat pedagang ikut event.',
                  style: TextStyle(fontSize: 12, color: _kInkSoft),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ===================== FITUR =====================
class _BagianFitur extends StatelessWidget {
  const _BagianFitur();

  static const _fitur = [
    (Icons.map_outlined, 'Titik Lapak di Peta',
        'Lihat titik lapak Anda di peta, lengkap dengan status ketersediaan lapak sekitar secara langsung.'),
    (Icons.schedule, 'Jam Operasional',
        'Cek jadwal buka-tutup CFD tiap minggu dari HP, biar gak kepagian atau malah kesorean datang.'),
    (Icons.fact_check_outlined, 'Verifikasi UMKM',
        'Ajukan dan pantau status verifikasi usaha Anda langsung dari HP, tanpa perlu bolak-balik ke posko.'),
    (Icons.history, 'Riwayat & Status Lapak',
        'Lihat riwayat check-in dan status pendaftaran Anda kapan saja, gak perlu nanya-nanya ke petugas.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _LabelSeksi('BUAT PEDAGANG'),
          const SizedBox(height: 8),
          const Text(
            'Semua yang Anda butuhkan buat jualan di CFD',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _kInk, height: 1.15),
          ),
          const SizedBox(height: 20),
          const Divider(height: 1, color: _kLine),
          for (var i = 0; i < _fitur.length; i++) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text((i + 1).toString().padLeft(2, '0'),
                          style: const TextStyle(fontSize: 13, color: _kInkSoft)),
                      const SizedBox(width: 12),
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: kBrandColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: Icon(_fitur[i].$1, size: 18, color: kBrandColor),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(_fitur[i].$2,
                            style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: _kInk)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(_fitur[i].$3, style: const TextStyle(fontSize: 14, color: _kInkSoft, height: 1.5)),
                ],
              ),
            ),
            const Divider(height: 1, color: _kLine),
          ],
        ],
      ),
    );
  }
}

// ===================== ALUR PENDAFTARAN =====================
class _BagianAlur extends StatelessWidget {
  const _BagianAlur();

  static const _tahap = [
    ('01', 'Daftar akun', 'Buat akun dan isi data usaha Anda langsung dari aplikasi ini.'),
    ('02', 'Pilih event', 'Pilih event CFD yang ingin diikuti -- lokasi lapak diacak otomatis oleh sistem.'),
    ('03', 'Dapat nomor stan', 'Nomor stan langsung terbit beserta kode QR untuk event tersebut.'),
    ('04', 'Check-in di lokasi', 'Tunjukkan QR ke petugas di lapangan untuk mulai berjualan.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _kPaper,
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _LabelSeksi('ALUR PENDAFTARAN PEDAGANG'),
          const SizedBox(height: 8),
          const Text(
            'Empat tahap, dari pendaftaran hingga berjualan',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _kInk, height: 1.15),
          ),
          const SizedBox(height: 24),
          for (var i = 0; i < _tahap.length; i++)
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Garis waktu vertikal (versi HP dari garis horizontal di web)
                  SizedBox(
                    width: 24,
                    child: Column(
                      children: [
                        const SizedBox(height: 3),
                        Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _kPaper,
                            border: Border.all(color: kBrandColor, width: 2),
                          ),
                          child: const Center(child: Icon(Icons.circle, size: 6, color: kBrandColor)),
                        ),
                        if (i < _tahap.length - 1)
                          Expanded(child: Container(width: 1, color: _kLine)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(bottom: i < _tahap.length - 1 ? 24 : 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_tahap[i].$1, style: const TextStyle(fontSize: 12, color: _kInkSoft)),
                          const SizedBox(height: 2),
                          Text(_tahap[i].$2,
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: _kInk)),
                          const SizedBox(height: 4),
                          Text(_tahap[i].$3,
                              style: const TextStyle(fontSize: 14, color: _kInkSoft, height: 1.5)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ===================== FOOTER =====================
class _Footer extends StatelessWidget {
  final VoidCallback onDaftar;
  final VoidCallback onMasuk;
  const _Footer({required this.onDaftar, required this.onMasuk});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: kBrandColor,
      padding: EdgeInsets.fromLTRB(20, 32, 20, 24 + MediaQuery.of(context).padding.bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('E-Event Surabaya',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 6),
          Text(
            'Portal pendaftaran pedagang Car Free Day se-Surabaya.',
            style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.75)),
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
                  ),
                  child: const Text('Daftar & Dapat Nomor Stan', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onMasuk,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.6)),
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text('Masuk ke Akun', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            '© ${DateTime.now().year} E-Event Surabaya',
            style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.6)),
          ),
        ],
      ),
    );
  }
}

// ===================== KOMPONEN KECIL =====================
class _LabelSeksi extends StatelessWidget {
  final String teks;
  const _LabelSeksi(this.teks);

  @override
  Widget build(BuildContext context) {
    return Text(
      teks,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.1,
        color: kBrandColor,
      ),
    );
  }
}

class _KotakInfo extends StatelessWidget {
  final String teks;
  const _KotakInfo({required this.teks});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _kLine),
      ),
      child: Text(teks, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13.5, color: _kInkSoft)),
    );
  }
}

// ===================== FORMAT =====================
const _hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const _bulan = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/// "2026-10-05" -> "Hari ini · Senin, 5 Oktober" (sama dengan web).
String _formatTanggalEvent(String iso) {
  final d = DateTime.tryParse(iso.length >= 10 ? iso.substring(0, 10) : iso);
  if (d == null) return iso;
  final now = DateTime.now();
  final hariIni = DateTime(now.year, now.month, now.day);
  final selisih = DateTime(d.year, d.month, d.day).difference(hariIni).inDays;
  final label = '${_hari[d.weekday - 1]}, ${d.day} ${_bulan[d.month - 1]}';
  if (selisih == 0) return 'Hari ini · $label';
  if (selisih == 1) return 'Besok · $label';
  return label;
}

/// "06:00" -> "06.00"
String _jamTitik(String jam) => jam.length >= 5 ? jam.substring(0, 5).replaceAll(':', '.') : jam;

String _jam(DateTime t) =>
    '${t.hour.toString().padLeft(2, '0')}.${t.minute.toString().padLeft(2, '0')}.${t.second.toString().padLeft(2, '0')}';