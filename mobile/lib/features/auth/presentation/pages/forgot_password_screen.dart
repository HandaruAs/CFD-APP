import 'package:flutter/material.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/auth/presentation/pages/verify_otp_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_form_layout.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_text_field.dart';

/// Lupa Kata Sandi -- langkah 1 dari 3: masukkan email akun pedagang,
/// backend kirim kode OTP 6 digit ke email itu.
///
/// Polanya sama dengan RegisterScreen: StatefulWidget biasa yang manggil
/// AuthRemoteDatasource langsung (bukan lewat authProvider, karena
/// authProvider khusus urusan sesi login).
class ForgotPasswordScreen extends StatefulWidget {
  /// Email dari form login (kalau sudah diisi), biar user gak ngetik ulang.
  final String initialEmail;

  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _emailController;

  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final email = _emailController.text.trim();

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await AuthRemoteDatasource.forgotPassword(email: email);

      if (!mounted) return;

      // Lanjut ke halaman OTP. Pakai push (bukan pushReplacement) supaya
      // kalau email-nya salah ketik, user bisa kembali ke sini.
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => VerifyOtpScreen(email: email)),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Tidak bisa terhubung ke server. Coba lagi.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthFormLayout(
      headerTitle: 'Lupa Kata Sandi',
      headerSubtitle: 'Atur ulang kata sandi\nakun pedagang Anda',
      onBack: () => Navigator.of(context).pop(),
      heading: 'Masukkan Email',
      description:
          'Kami akan mengirim kode verifikasi 6 digit ke email akun pedagang Anda.',
      children: [
        if (_error != null) ...[
          AuthErrorBanner(message: _error!),
          const SizedBox(height: 16),
        ],
        Form(
          key: _formKey,
          child: AuthTextField(
            controller: _emailController,
            enabled: !_loading,
            label: 'Alamat Email',
            icon: Icons.mail_outline,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _handleSubmit(),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Email wajib diisi';
              }
              if (!value.contains('@')) {
                return 'Format email tidak valid';
              }
              return null;
            },
          ),
        ),
        const SizedBox(height: 28),
        AuthPrimaryButton(
          label: 'Kirim Kode',
          loading: _loading,
          onPressed: _handleSubmit,
        ),
      ],
    );
  }
}