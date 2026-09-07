// features/pedagang/presentation/pages/pendaftaran_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/pedagang/presentation/pages/status_verifikasi_screen.dart';

const _brandColor = Color(0xFF1C3F7C);

const Map<String, String> _kategoriLabel = {
  'makanan_minuman': 'Makanan dan Minuman',
  'bukan_makanan_minuman': 'Bukan Makanan dan Minuman',
};

const Map<String, String> _lapakLabel = {
  'rombong': 'Rombong',
  'meja': 'Meja',
};

class PendaftaranScreen extends ConsumerStatefulWidget {
  const PendaftaranScreen({super.key});

  @override
  ConsumerState<PendaftaranScreen> createState() => _PendaftaranScreenState();
}

class _PendaftaranScreenState extends ConsumerState<PendaftaranScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nikController = TextEditingController();
  final _namaLengkapController = TextEditingController();
  final _namaUsahaController = TextEditingController();

  DateTime? _tanggalLahir;
  String? _jenisDagangan;
  String? _jenisLapak;

  bool _checkingExisting = true;

  @override
  void initState() {
    super.initState();
    // Cek dulu apakah pedagang ini udah pernah ngirim pengajuan -- kalau
    // udah, gak usah nampilin form lagi (backend bakal nolak submit
    // kedua kalinya dengan 409 "kamu sudah pernah mengajukan usaha
    // sebelumnya"), langsung arahin ke halaman Status Verifikasi.
    Future.microtask(() async {
      await ref.read(pedagangProvider.notifier).loadStatusPengajuan();
      if (mounted) setState(() => _checkingExisting = false);
    });
  }

  @override
  void dispose() {
    _nikController.dispose();
    _namaLengkapController.dispose();
    _namaUsahaController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  Future<void> _pickTanggalLahir() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25, now.month, now.day),
      firstDate: DateTime(1940),
      lastDate: now,
      helpText: 'Pilih Tanggal Lahir',
    );
    if (picked != null) {
      setState(() => _tanggalLahir = picked);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_tanggalLahir == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tanggal lahir wajib diisi')),
      );
      return;
    }
    if (_jenisDagangan == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kategori usaha wajib dipilih')),
      );
      return;
    }
    if (_jenisLapak == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Jenis lapak wajib dipilih')),
      );
      return;
    }

    final success = await ref.read(pedagangProvider.notifier).submitPengajuan(
          nik: _nikController.text.trim(),
          namaLengkap: _namaLengkapController.text.trim(),
          tanggalLahir: _formatDate(_tanggalLahir!),
          namaUsaha: _namaUsahaController.text.trim(),
          jenisDagangan: _jenisDagangan!,
          jenisLapak: _jenisLapak!,
        );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pengajuan usaha berhasil dikirim, menunggu verifikasi petugas.'),
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const StatusVerifikasiScreen()),
      );
    }
    // Kalau gagal, error-nya udah ke-set di state.error dan otomatis
    // kebaca lewat `ref.watch` di method build -- gak perlu ditangani
    // dobel di sini.
  }

  @override
  Widget build(BuildContext context) {
    final pedagangState = ref.watch(pedagangProvider);

    // Masih ngecek apakah udah pernah ajukan sebelumnya -- tampilin
    // loading dulu biar gak sempet keliatan form kosong sekilas.
    if (_checkingExisting) {
      return const MainLayout(
        title: 'Pendaftaran Usaha',
        body: Center(child: CircularProgressIndicator()),
      );
    }

    // Udah pernah ajukan -- gak usah tampilin form lagi.
    if (pedagangState.pengajuan != null) {
      return MainLayout(
        title: 'Pendaftaran Usaha',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle_outline, size: 48, color: Colors.green),
                const SizedBox(height: 12),
                const Text(
                  'Kamu sudah pernah mengirim pengajuan usaha.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const StatusVerifikasiScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Lihat Status Verifikasi', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final isSubmitting = pedagangState.isSubmittingPengajuan;
    final error = pedagangState.error;

    return MainLayout(
      title: 'Pendaftaran Usaha',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Ajukan Usaha',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Lengkapi data berikut untuk mengikuti Car Free Day.',
                style: TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 16),
              if (error != null) ...[
                Container(
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
                      Expanded(
                        child: Text(error, style: const TextStyle(color: Color(0xFFB91C1C))),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: _nikController,
                enabled: !isSubmitting,
                keyboardType: TextInputType.number,
                maxLength: 16,
                decoration: const InputDecoration(
                  labelText: 'NIK',
                  border: OutlineInputBorder(),
                  counterText: '',
                ),
                validator: (value) {
                  final v = value?.trim() ?? '';
                  if (v.isEmpty) return 'NIK wajib diisi';
                  if (v.length != 16) return 'NIK harus 16 digit';
                  if (!RegExp(r'^\d+$').hasMatch(v)) return 'NIK hanya boleh angka';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _namaLengkapController,
                enabled: !isSubmitting,
                decoration: const InputDecoration(
                  labelText: 'Nama Lengkap',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Nama lengkap wajib diisi';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: isSubmitting ? null : _pickTanggalLahir,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Tanggal Lahir',
                    border: OutlineInputBorder(),
                    suffixIcon: Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(
                    _tanggalLahir == null ? 'Pilih tanggal' : _formatDate(_tanggalLahir!),
                    style: TextStyle(
                      color: _tanggalLahir == null ? Colors.black45 : Colors.black87,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _namaUsahaController,
                enabled: !isSubmitting,
                decoration: const InputDecoration(
                  labelText: 'Nama Usaha',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Nama usaha wajib diisi';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _jenisDagangan,
                decoration: const InputDecoration(
                  labelText: 'Kategori Usaha',
                  border: OutlineInputBorder(),
                ),
                items: _kategoriLabel.entries
                    .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                    .toList(),
                onChanged: isSubmitting ? null : (v) => setState(() => _jenisDagangan = v),
                validator: (v) => v == null ? 'Kategori usaha wajib dipilih' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _jenisLapak,
                decoration: const InputDecoration(
                  labelText: 'Jenis Lapak',
                  border: OutlineInputBorder(),
                ),
                items: _lapakLabel.entries
                    .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                    .toList(),
                onChanged: isSubmitting ? null : (v) => setState(() => _jenisLapak = v),
                validator: (v) => v == null ? 'Jenis lapak wajib dipilih' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: isSubmitting ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _brandColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Kirim Pengajuan'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}