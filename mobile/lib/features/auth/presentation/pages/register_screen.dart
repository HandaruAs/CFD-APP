import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

import 'package:mobile/features/auth/presentation/widgets/auth_gradient_header.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_text_field.dart';
import 'package:mobile/features/pedagang/domain/entities/event_pedagang.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';

bool nikValid16Digit(String value) =>
    RegExp(r'^[0-9]{16}$').hasMatch(value.trim());

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nikController = TextEditingController();
  final _businessController = TextEditingController();

  int _step = 1;
  String? _category;
  String? _stallType;
  DateTime? _birthDate;
  Keikutsertaan? _keikutsertaan;

  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _nikController.dispose();
    _businessController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final name = _nameController.text.trim();
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      await AuthRemoteDatasource.register(
        name: name,
        email: email,
        password: password,
      );

      // Login otomatis agar proses pendaftaran dapat langsung dilanjutkan.
      await ref.read(authProvider.notifier).login(email, password);
      final authState = ref.read(authProvider);
      if (authState.error != null || authState.user == null) {
        throw ApiException(
          authState.error ?? 'Login otomatis gagal. Silakan masuk.',
        );
      }
      if (authState.user!.role != 'pedagang') {
        throw ApiException('Akun yang dibuat bukan akun pedagang.');
      }
      if (!mounted) return;
      setState(() => _step = 2);
    } on ApiException catch (e) {
      // ✅ ApiException dari auth_remote_datasource
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Tidak bisa terhubung ke server. Coba lagi.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _registerAccount() => _handleRegister();

  static bool _isValidNik(String value) =>
      RegExp(r'^[0-9]{16}$').hasMatch(value.trim());

  Future<void> _pilihTanggalLahir() async {
    final hariIni = DateTime.now();
    final tanggal = await showDatePicker(
      context: context,
      initialDate:
          _birthDate ?? DateTime(hariIni.year - 25, hariIni.month, hariIni.day),
      firstDate: DateTime(1940),
      lastDate: hariIni,
      helpText: 'Pilih Tanggal Lahir',
    );
    if (tanggal != null && mounted) setState(() => _birthDate = tanggal);
  }

  Future<void> _simpanDataUsaha() async {
    if (!_formKey.currentState!.validate()) return;
    if (_birthDate == null || _category == null || _stallType == null) {
      setState(
        () => _error = 'Mohon lengkapi semua data usaha terlebih dahulu.',
      );
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    final date = _birthDate!;
    final tanggalApi =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final berhasil = await ref
        .read(pedagangProvider.notifier)
        .submitPengajuan(
          nik: _nikController.text.trim(),
          namaLengkap: _nameController.text.trim(),
          tanggalLahir: tanggalApi,
          namaUsaha: _businessController.text.trim(),
          jenisDagangan: _category!,
          jenisLapak: _stallType!,
        );
    if (!mounted) return;
    if (!berhasil) {
      setState(() {
        _loading = false;
        _error =
            ref.read(pedagangProvider).error ?? 'Gagal menyimpan data usaha.';
      });
      return;
    }
    setState(() {
      _loading = false;
      _step = 3;
    });
  }

  Future<void> _ikutEvent(EventTersedia event) async {
    final konfirmasi = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Ikut "${event.nama}"?'),
        content: Text(
          '${tanggalEvent(event.tanggal)}\\n${jamEvent(event.jamMulai)} – ${jamEvent(event.jamSelesai)} WIB\\n\\nLokasi dan nomor stan akan diacak otomatis oleh sistem.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Ya, Ikut'),
          ),
        ],
      ),
    );
    if (konfirmasi != true || !mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final hasil = await ref.read(pedagangProvider.notifier).ikut(event.id);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (hasil.hasil != null) {
        _keikutsertaan = hasil.hasil;
      } else {
        _error = hasil.pesan ?? 'Gagal ikut event.';
      }
    });
  }

  Future<void> _bukaPilihanEventNanti() async {
    await Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(
        builder: (_) => const MainLayout(initialPath: '/pedagang/nomer-stand'),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final pedagang = ref.watch(pedagangProvider);
    final events = pedagang.events
        .where(
          (event) =>
              event.statusPendaftaran == 'dibuka' &&
              event.sisaUntukSaya > 0 &&
              event.bisaIkut,
        )
        .toList();
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: kBrandColor,
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          top: false,
          bottom: false,
          child: Column(
            children: [
              AuthGradientHeader(
                title: 'Daftar sebagai Pedagang',
                subtitle: 'Buat akun, isi data usaha, lalu pilih event',
                onBack: () {
                  if (_step == 1) Navigator.of(context).maybePop();
                },
              ),
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(32),
                      topRight: Radius.circular(32),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(
                      24,
                      24,
                      24,
                      24 + MediaQuery.of(context).padding.bottom,
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Langkah $_step dari 3',
                            style: const TextStyle(
                              color: kBrandColor,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: _step / 3,
                            color: kBrandColor,
                            backgroundColor: Colors.black12,
                          ),
                          const SizedBox(height: 18),
                          if (_error != null) _ErrorBanner(message: _error!),
                          if (_step == 1) ..._accountFields(),
                          if (_step == 2) ..._businessFields(),
                          if (_step == 3)
                            ..._eventFields(events, pedagang.isLoadingEvent),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _accountFields() => [
    const Text(
      'Buat Akun',
      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
    ),
    const SizedBox(height: 12),
    AuthTextField(
      controller: _nameController,
      enabled: !_loading,
      label: 'Nama Lengkap',
      icon: Icons.person_outline,
      textInputAction: TextInputAction.next,
      validator: (v) =>
          v == null || v.trim().isEmpty ? 'Nama wajib diisi' : null,
    ),
    const SizedBox(height: 16),
    AuthTextField(
      controller: _emailController,
      enabled: !_loading,
      label: 'Email',
      icon: Icons.mail_outline,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      validator: (v) =>
          v == null || !v.contains('@') ? 'Format email tidak valid' : null,
    ),
    const SizedBox(height: 16),
    AuthTextField(
      controller: _passwordController,
      enabled: !_loading,
      label: 'Kata Sandi',
      icon: Icons.lock_outline,
      obscureText: _obscurePassword,
      textInputAction: TextInputAction.next,
      suffixIcon: IconButton(
        icon: Icon(
          _obscurePassword
              ? Icons.visibility_outlined
              : Icons.visibility_off_outlined,
        ),
        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
      ),
      validator: (v) => v == null || v.length < 8 ? 'Minimal 8 karakter' : null,
    ),
    const SizedBox(height: 16),
    AuthTextField(
      controller: _confirmPasswordController,
      enabled: !_loading,
      label: 'Konfirmasi Kata Sandi',
      icon: Icons.lock_outline,
      obscureText: _obscureConfirm,
      textInputAction: TextInputAction.done,
      suffixIcon: IconButton(
        icon: Icon(
          _obscureConfirm
              ? Icons.visibility_outlined
              : Icons.visibility_off_outlined,
        ),
        onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
      ),
      validator: (v) => v != _passwordController.text
          ? 'Konfirmasi kata sandi tidak cocok'
          : null,
    ),
    const SizedBox(height: 24),
    _actionButton('Lanjut ke Data Usaha', _registerAccount),
  ];

  List<Widget> _businessFields() => [
    const Text(
      'Data Usaha',
      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
    ),
    const SizedBox(height: 12),
    AuthTextField(
      controller: _nikController,
      enabled: !_loading,
      label: 'NIK',
      icon: Icons.badge_outlined,
      keyboardType: TextInputType.number,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(16),
      ],
      validator: (v) =>
          v == null || !nikValid16Digit(v) ? 'NIK harus 16 digit angka' : null,
    ),
    const SizedBox(height: 16),
    OutlinedButton.icon(
      onPressed: _loading ? null : _pilihTanggalLahir,
      icon: const Icon(Icons.calendar_month),
      label: Text(
        _birthDate == null
            ? 'Tanggal Lahir'
            : '${_birthDate!.day.toString().padLeft(2, '0')}/${_birthDate!.month.toString().padLeft(2, '0')}/${_birthDate!.year}',
      ),
    ),
    const SizedBox(height: 16),
    AuthTextField(
      controller: _businessController,
      enabled: !_loading,
      label: 'Nama Usaha (UMKM)',
      icon: Icons.store_outlined,
      validator: (v) =>
          v == null || v.trim().isEmpty ? 'Nama usaha wajib diisi' : null,
    ),
    const SizedBox(height: 16),
    const Text('Kategori Usaha'),
    RadioListTile<String>(
      contentPadding: EdgeInsets.zero,
      title: const Text('Makanan dan Minuman'),
      value: 'makanan_minuman',
      groupValue: _category,
      onChanged: _loading ? null : (v) => setState(() => _category = v),
    ),
    RadioListTile<String>(
      contentPadding: EdgeInsets.zero,
      title: const Text('Bukan Makanan dan Minuman'),
      value: 'bukan_makanan_minuman',
      groupValue: _category,
      onChanged: _loading ? null : (v) => setState(() => _category = v),
    ),
    const Text('Jenis Lapak'),
    RadioListTile<String>(
      contentPadding: EdgeInsets.zero,
      title: const Text('Rombong'),
      value: 'rombong',
      groupValue: _stallType,
      onChanged: _loading ? null : (v) => setState(() => _stallType = v),
    ),
    RadioListTile<String>(
      contentPadding: EdgeInsets.zero,
      title: const Text('Meja'),
      value: 'meja',
      groupValue: _stallType,
      onChanged: _loading ? null : (v) => setState(() => _stallType = v),
    ),
    const SizedBox(height: 12),
    _actionButton('Simpan & Lanjut Pilih Event', _simpanDataUsaha),
  ];

  List<Widget> _eventFields(List<EventTersedia> events, bool loadingEvents) {
    if (_keikutsertaan != null) {
      final k = _keikutsertaan!;
      return [
        const Icon(Icons.check_circle, color: Colors.green, size: 56),
        const Text(
          'Pendaftaran Berhasil!',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(k.namaEvent, textAlign: TextAlign.center),
        const SizedBox(height: 8),
        const Text('Nomor stan kamu', textAlign: TextAlign.center),
        Text(
          k.kodeStan,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 28,
            color: kBrandColor,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${k.namaJalan} · ${k.namaRuas}${k.namaKecamatan == null ? '' : '\\nKec. ${k.namaKecamatan}'}',
          textAlign: TextAlign.center,
        ),
      ];
    }
    if (loadingEvents || _loading)
      return [const Center(child: CircularProgressIndicator())];
    if (events.isEmpty)
      return [
        const Text(
          'Data usaha tersimpan. Belum ada event yang pendaftarannya dibuka atau kuotanya tersedia.',
        ),
        const SizedBox(height: 8),
        const Text('Kamu bisa memilih event nanti melalui menu Nomor Stand.'),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _bukaPilihanEventNanti,
          child: const Text('Lanjut ke Halaman Pedagang'),
        ),
      ];
    return [
      const Text(
        'Event yang bisa diikuti',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
      const Text(
        'Lokasi dan nomor stan ditentukan otomatis saat kamu ikut event.',
      ),
      const SizedBox(height: 12),
      for (final event in events)
        Card(
          child: ListTile(
            title: Text(event.nama),
            subtitle: Text(
              '${tanggalEvent(event.tanggal)} · ${jamEvent(event.jamMulai)} – ${jamEvent(event.jamSelesai)} WIB\\nSisa ${event.sisaUntukSaya}',
            ),
            trailing: FilledButton(
              onPressed: _loading ? null : () => _ikutEvent(event),
              child: const Text('Ikut'),
            ),
          ),
        ),
    ];
  }

  Widget _actionButton(String label, VoidCallback action) => ElevatedButton(
    onPressed: _loading ? null : action,
    style: ElevatedButton.styleFrom(
      backgroundColor: kBrandColor,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
    ),
    child: _loading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          )
        : Text(label),
  );
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        border: Border.all(color: const Color(0xFFFECACA)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFB91C1C), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: Color(0xFFB91C1C)),
            ),
          ),
        ],
      ),
    );
  }
}
