import 'package:flutter/material.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_form_layout.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_text_field.dart';

/// Lupa Kata Sandi -- langkah 3 dari 3: isi kata sandi baru.
/// [resetToken] didapat dari VerifyOtpScreen, berlaku 10 menit.
/// Setelah berhasil, kembali ke LoginScreen -- user login pakai sandi baru.
class ResetPasswordScreen extends StatefulWidget {
  final String resetToken;

  const ResetPasswordScreen({super.key, required this.resetToken});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await AuthRemoteDatasource.resetPassword(
        resetToken: widget.resetToken,
        password: _passwordController.text,
      );

      if (!mounted) return;

      // Ambil messenger SEBELUM pindah halaman, lalu tutup semua halaman
      // lupa-sandi sampai balik ke halaman pertama (LoginScreen).
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).popUntil((route) => route.isFirst);
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
            'Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru.',
          ),
        ),
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
      headerTitle: 'Kata Sandi Baru',
      headerSubtitle: 'Buat kata sandi baru\nuntuk akun pedagang Anda',
      // Kembali = batal, langsung ke Login (halaman OTP sudah ditutup).
      onBack: () => Navigator.of(context).popUntil((route) => route.isFirst),
      heading: 'Atur Kata Sandi Baru',
      description: 'Gunakan minimal 8 karakter yang mudah Anda ingat.',
      children: [
        if (_error != null) ...[
          AuthErrorBanner(message: _error!),
          const SizedBox(height: 16),
        ],
        Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthTextField(
                controller: _passwordController,
                enabled: !_loading,
                label: 'Kata Sandi Baru',
                icon: Icons.lock_outline,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.next,
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    size: 20,
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Kata sandi wajib diisi';
                  }
                  if (value.length < 8) {
                    return 'Minimal 8 karakter';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AuthTextField(
                controller: _confirmPasswordController,
                enabled: !_loading,
                label: 'Konfirmasi Kata Sandi',
                icon: Icons.lock_outline,
                obscureText: _obscureConfirm,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _handleSubmit(),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureConfirm
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    size: 20,
                  ),
                  onPressed: () =>
                      setState(() => _obscureConfirm = !_obscureConfirm),
                ),
                validator: (value) {
                  if (value != _passwordController.text) {
                    return 'Konfirmasi kata sandi tidak cocok';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        AuthPrimaryButton(
          label: 'Simpan Kata Sandi',
          loading: _loading,
          onPressed: _handleSubmit,
        ),
      ],
    );
  }
}