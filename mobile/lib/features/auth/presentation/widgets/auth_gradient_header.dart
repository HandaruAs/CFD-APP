import 'package:flutter/material.dart';
import 'package:mobile/core/themes/app_theme.dart';

/// Header gradien buat Login & Register -- satu widget dipakai berdua
/// biar gaya visualnya konsisten dan gampang diubah dari 1 tempat.
/// Terinspirasi pola "gradient header + rounded logo + judul besar",
/// warnanya pakai brand biru sendiri (bukan niru warna app lain).
class AuthGradientHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback? onBack;

  const AuthGradientHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        24,
        MediaQuery.of(context).padding.top + 16,
        24,
        36,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kBrandColor, kBrandColorLight],
        ),
      ),
      child: ClipRect(
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Dua lingkaran transparan buat kesan "modern/glossy" kayak
            // referensinya -- dekorasi doang, gak interaktif.
            Positioned(
              top: -60,
              right: -40,
              child: _Circle(size: 160, opacity: 0.08),
            ),
            Positioned(
              top: 10,
              right: 40,
              child: _Circle(size: 70, opacity: 0.06),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (onBack != null)
                  _BackButton(onTap: onBack!)
                else
                  const SizedBox(height: 44),
                const SizedBox(height: 12),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.35),
                      ),
                    ),
                    child: const Image(
                      image: AssetImage('assets/images/logo.png'),
                      width: 56,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Center(
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Circle extends StatelessWidget {
  final double size;
  final double opacity;
  const _Circle({required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: opacity),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _BackButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.16),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.all(10),
          child: Icon(Icons.arrow_back, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}