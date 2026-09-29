import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/auth/presentation/widgets/auth_gradient_header.dart';

/// Kerangka halaman auth: header biru gradien + kartu putih membulat,
/// persis seperti Login & Register. Dipakai 3 halaman Lupa Kata Sandi
/// (forgot, verify OTP, reset) supaya layout-nya gak di-copy 3 kali.
///
/// Login & Register sengaja TIDAK diubah ke widget ini -- biar kode
/// yang sudah jalan gak ikut kesentuh.
class AuthFormLayout extends StatelessWidget {
  final String headerTitle;
  final String headerSubtitle;
  final VoidCallback? onBack;
  final String heading;
  final String description;
  final List<Widget> children;

  const AuthFormLayout({
    super.key,
    required this.headerTitle,
    required this.headerSubtitle,
    required this.heading,
    required this.description,
    required this.children,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
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
                title: headerTitle,
                subtitle: headerSubtitle,
                onBack: onBack,
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
                      28,
                      24,
                      24 + MediaQuery.of(context).padding.bottom,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          heading,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          description,
                          style: const TextStyle(color: Colors.black54),
                        ),
                        const SizedBox(height: 24),
                        ...children,
                      ],
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
}

/// Kotak pesan error merah -- gaya sama dengan _ErrorBanner di Login/Register.
class AuthErrorBanner extends StatelessWidget {
  final String message;
  const AuthErrorBanner({super.key, required this.message});

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

/// Tombol biru utama + loading spinner -- gaya sama dengan tombol
/// "Masuk" / "Daftar".
class AuthPrimaryButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.loading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: loading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: kBrandColor,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
      child: loading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Text(
              label,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
    );
  }
}